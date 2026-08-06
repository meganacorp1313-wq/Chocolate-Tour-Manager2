import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, eq } from "drizzle-orm";
import { db, companiesTable, companyPricesTable, toursTable } from "@workspace/db";
import {
  CompanyLoginBody,
  CompanyLoginResponse,
  CompanyLogoutResponse,
  GetCompanySessionResponse,
  GetCompanyPricesResponse,
  GetCompanyBookingsResponse,
} from "@workspace/api-zod";
import {
  readSession,
  setSession,
  clearSession,
  COMPANY_COOKIE,
} from "../lib/session";
import { fetchBookingViews } from "../lib/bookings";

const router: IRouter = Router();

interface CompanyRequest extends Request {
  companyId?: number;
}

async function requireCompany(
  req: CompanyRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const session = readSession(req, COMPANY_COOKIE);
  if (session?.role !== "company" || session.companyId === undefined) {
    res.status(401).json({ error: "Не авторизованы" });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(
      and(eq(companiesTable.id, session.companyId), eq(companiesTable.active, true)),
    );
  if (!company) {
    res.status(401).json({ error: "Не авторизованы" });
    return;
  }
  req.companyId = company.id;
  next();
}

router.post("/company/login", async (req, res): Promise<void> => {
  const parsed = CompanyLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(
      and(
        eq(companiesTable.password, parsed.data.password),
        eq(companiesTable.active, true),
      ),
    );
  if (!company) {
    res.status(401).json({ error: "Неверный пароль" });
    return;
  }
  setSession(res, COMPANY_COOKIE, { role: "company", companyId: company.id });
  res.json(CompanyLoginResponse.parse({ id: company.id, name: company.name }));
});

router.post("/company/logout", async (_req, res): Promise<void> => {
  clearSession(res, COMPANY_COOKIE);
  res.json(CompanyLogoutResponse.parse({ ok: true }));
});

router.get("/company/me", requireCompany, async (req: CompanyRequest, res): Promise<void> => {
  const [company] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.id, req.companyId!));
  res.json(GetCompanySessionResponse.parse({ id: company!.id, name: company!.name }));
});

router.get(
  "/company/prices",
  requireCompany,
  async (req: CompanyRequest, res): Promise<void> => {
    const tours = await db
      .select()
      .from(toursTable)
      .where(eq(toursTable.active, true))
      .orderBy(toursTable.id);
    const prices = await db
      .select()
      .from(companyPricesTable)
      .where(eq(companyPricesTable.companyId, req.companyId!));
    const priceMap = new Map(prices.map((p) => [p.tourId, p.price]));
    res.json(
      GetCompanyPricesResponse.parse(
        tours.map((t) => ({
          tourId: t.id,
          tourName: t.name,
          basePrice: t.basePrice,
          price: priceMap.get(t.id) ?? t.basePrice,
        })),
      ),
    );
  },
);

router.get(
  "/company/bookings",
  requireCompany,
  async (req: CompanyRequest, res): Promise<void> => {
    const views = await fetchBookingViews({ companyId: req.companyId! });
    views.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(GetCompanyBookingsResponse.parse(views));
  },
);

export default router;
