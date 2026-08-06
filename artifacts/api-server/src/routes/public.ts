import { Router, type IRouter } from "express";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  db,
  toursTable,
  slotsTable,
  bookingsTable,
  companiesTable,
  companyPricesTable,
} from "@workspace/db";
import {
  ListToursResponse,
  GetAvailabilityQueryParams,
  GetAvailabilityResponse,
  ListSlotsQueryParams,
  ListSlotsResponse,
  CreateBookingBody,
  CreateBookingResponse,
  GetBookingByCodeResponse,
} from "@workspace/api-zod";
import { readSession, COMPANY_COOKIE } from "../lib/session";
import {
  bookedSeatsBySlot,
  fetchBookingViews,
  generateBookingCode,
} from "../lib/bookings";
import { sendBookingEmails } from "../lib/email";

const router: IRouter = Router();

async function companyPriceMap(companyId: number): Promise<Map<number, number>> {
  const rows = await db
    .select()
    .from(companyPricesTable)
    .where(eq(companyPricesTable.companyId, companyId));
  return new Map(rows.map((r) => [r.tourId, r.price]));
}

router.get("/tours", async (req, res): Promise<void> => {
  const tours = await db
    .select()
    .from(toursTable)
    .where(eq(toursTable.active, true))
    .orderBy(toursTable.id);

  const session = readSession(req, COMPANY_COOKIE);
  let prices: Map<number, number> | null = null;
  if (session?.role === "company" && session.companyId !== undefined) {
    prices = await companyPriceMap(session.companyId);
  }

  res.json(
    ListToursResponse.parse(
      tours.map((t) => ({
        ...t,
        companyPrice: prices ? (prices.get(t.id) ?? null) : null,
      })),
    ),
  );
});

router.get("/availability", async (req, res): Promise<void> => {
  const parsed = GetAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success || !/^\d{4}-\d{2}$/.test(parsed.data.month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const month = parsed.data.month;
  const from = `${month}-01`;
  const to = `${month}-31`;

  const slots = await db
    .select()
    .from(slotsTable)
    .innerJoin(toursTable, eq(slotsTable.tourId, toursTable.id))
    .where(
      and(
        gte(slotsTable.date, from),
        lte(slotsTable.date, to),
        eq(slotsTable.blocked, false),
        eq(toursTable.active, true),
      ),
    );

  const booked = await bookedSeatsBySlot(slots.map((s) => s.slots.id));

  const byDay = new Map<
    string,
    { totalSeats: number; availableSeats: number; slotCount: number }
  >();
  for (const row of slots) {
    const slot = row.slots;
    const day = byDay.get(slot.date) ?? {
      totalSeats: 0,
      availableSeats: 0,
      slotCount: 0,
    };
    const used = booked.get(slot.id) ?? 0;
    day.totalSeats += slot.capacity;
    day.availableSeats += Math.max(0, slot.capacity - used);
    day.slotCount += 1;
    byDay.set(slot.date, day);
  }

  const result = [...byDay.entries()]
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  res.json(GetAvailabilityResponse.parse(result));
});

router.get("/slots", async (req, res): Promise<void> => {
  const parsed = ListSlotsQueryParams.safeParse(req.query);
  if (!parsed.success || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.data.date)) {
    res.status(400).json({ error: "date must be YYYY-MM-DD" });
    return;
  }

  const rows = await db
    .select()
    .from(slotsTable)
    .innerJoin(toursTable, eq(slotsTable.tourId, toursTable.id))
    .where(
      and(
        eq(slotsTable.date, parsed.data.date),
        eq(slotsTable.blocked, false),
        eq(toursTable.active, true),
      ),
    );

  const booked = await bookedSeatsBySlot(rows.map((r) => r.slots.id));

  const result = rows
    .map((r) => {
      const used = booked.get(r.slots.id) ?? 0;
      return {
        id: r.slots.id,
        tourId: r.slots.tourId,
        tourName: r.tours.name,
        date: r.slots.date,
        startTime: r.slots.startTime,
        capacity: r.slots.capacity,
        bookedSeats: used,
        availableSeats: Math.max(0, r.slots.capacity - used),
        blocked: r.slots.blocked,
      };
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  res.json(ListSlotsResponse.parse(result));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;

  const [slotRow] = await db
    .select()
    .from(slotsTable)
    .innerJoin(toursTable, eq(slotsTable.tourId, toursTable.id))
    .where(eq(slotsTable.id, data.slotId));

  if (!slotRow || slotRow.slots.blocked || !slotRow.tours.active) {
    res.status(400).json({ error: "Слот недоступен" });
    return;
  }

  const booked = await bookedSeatsBySlot([slotRow.slots.id]);
  const available =
    slotRow.slots.capacity - (booked.get(slotRow.slots.id) ?? 0);
  if (data.peopleCount > available) {
    res.status(400).json({ error: `Недостаточно мест: свободно ${available}` });
    return;
  }

  const session = readSession(req, COMPANY_COOKIE);
  let companyId: number | null = null;
  let pricePerPerson = slotRow.tours.basePrice;
  if (session?.role === "company" && session.companyId !== undefined) {
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(
        and(
          eq(companiesTable.id, session.companyId),
          eq(companiesTable.active, true),
        ),
      );
    if (company) {
      companyId = company.id;
      const prices = await companyPriceMap(company.id);
      pricePerPerson = prices.get(slotRow.tours.id) ?? slotRow.tours.basePrice;
    }
  }

  let code = generateBookingCode();
  for (let i = 0; i < 5; i++) {
    const [existing] = await db
      .select({ id: bookingsTable.id })
      .from(bookingsTable)
      .where(eq(bookingsTable.code, code));
    if (!existing) break;
    code = generateBookingCode();
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      code,
      slotId: data.slotId,
      companyId,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email ?? null,
      peopleCount: data.peopleCount,
      pricePerPerson,
      totalPrice: pricePerPerson * data.peopleCount,
      status: "confirmed",
      comment: data.comment ?? null,
    })
    .returning();

  if (!booking) {
    res.status(400).json({ error: "Не удалось создать бронирование" });
    return;
  }

  const [view] = await fetchBookingViews({ id: booking.id });
  res.status(201).json(CreateBookingResponse.parse(view));

  // Send email notifications fire-and-forget — must not block or fail the response
  sendBookingEmails(view).catch((err) =>
    console.error("[email] unexpected error in sendBookingEmails", err),
  );
});

router.get("/bookings/:code", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.code)
    ? req.params.code[0]
    : req.params.code;
  const code = (raw ?? "").toUpperCase();
  const [view] = await fetchBookingViews({ code });
  if (!view) {
    res.status(404).json({ error: "Бронирование не найдено" });
    return;
  }
  res.json(GetBookingByCodeResponse.parse(view));
});

export default router;
