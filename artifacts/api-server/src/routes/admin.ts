import {
  Router,
  type IRouter,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { and, eq, gte, lte, count, isNull } from "drizzle-orm";
import {
  db,
  toursTable,
  slotsTable,
  bookingsTable,
  companiesTable,
  companyPricesTable,
  settingsTable,
  staffUsersTable,
} from "@workspace/db";
import {
  AdminLoginBody,
  AdminLoginResponse,
  AdminLogoutResponse,
  GetAdminSessionResponse,
  GetAdminSummaryResponse,
  AdminListToursResponse,
  CreateTourBody,
  CreateTourResponse,
  UpdateTourParams,
  UpdateTourBody,
  UpdateTourResponse,
  DeleteTourParams,
  DeleteTourResponse,
  AdminListSlotsQueryParams,
  AdminListSlotsResponse,
  CreateSlotBody,
  CreateSlotResponse,
  CreateSlotsBulkBody,
  CreateSlotsBulkResponse,
  UpdateSlotParams,
  UpdateSlotBody,
  UpdateSlotResponse,
  DeleteSlotParams,
  DeleteSlotResponse,
  AdminListCompaniesResponse,
  CreateCompanyBody,
  CreateCompanyResponse,
  UpdateCompanyParams,
  UpdateCompanyBody,
  UpdateCompanyResponse,
  DeleteCompanyParams,
  DeleteCompanyResponse,
  GetCompanyPriceListParams,
  GetCompanyPriceListResponse,
  SetCompanyPriceListParams,
  SetCompanyPriceListBody,
  SetCompanyPriceListResponse,
  AdminListBookingsQueryParams,
  AdminListBookingsResponse,
  UpdateBookingStatusParams,
  UpdateBookingStatusBody,
  UpdateBookingStatusResponse,
  ChangeAdminPasswordBody,
  ChangeAdminPasswordResponse,
  ExpireUnpaidBookingsResponse,
  ResendBookingEmailsParams,
  ResendBookingEmailsResponse,
  CheckInBookingParams,
  CheckInBookingResponse,
  ListStaffResponse,
  CreateStaffBody,
  CreateStaffResponse,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  DeleteStaffParams,
  DeleteStaffResponse,
} from "@workspace/api-zod";
import {
  readSession,
  setSession,
  clearSession,
  ADMIN_COOKIE,
} from "../lib/session";
import {
  bookedSeatsBySlot,
  fetchBookingViews,
  expireStaleBookings,
  dispatchBookingEmails,
  retryFailedBookingEmails,
} from "../lib/bookings";
import { hashPassword, verifyPassword, isHashedPassword } from "../lib/password";

const router: IRouter = Router();

const ADMIN_PASSWORD_KEY = "admin_password";
export const DEFAULT_ADMIN_PASSWORD = "fabrika2026";

async function getStoredAdminPassword(): Promise<string> {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, ADMIN_PASSWORD_KEY));
  if (row) return row.value;
  const hashed = hashPassword(DEFAULT_ADMIN_PASSWORD);
  await db
    .insert(settingsTable)
    .values({ key: ADMIN_PASSWORD_KEY, value: hashed })
    .onConflictDoNothing();
  return hashed;
}

async function setAdminPassword(newPassword: string): Promise<void> {
  const hashed = hashPassword(newPassword);
  await db
    .insert(settingsTable)
    .values({ key: ADMIN_PASSWORD_KEY, value: hashed })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: hashed },
    });
}

async function checkAdminPassword(password: string): Promise<boolean> {
  const stored = await getStoredAdminPassword();
  if (!verifyPassword(password, stored)) return false;
  // Migrate legacy plaintext value to a salted hash on successful check.
  if (!isHashedPassword(stored)) {
    await setAdminPassword(password);
  }
  return true;
}

type AdminRole = "admin" | "manager" | "staff";

/**
 * Resolve the current access level. For staff sessions the staff row is
 * re-read on every request so that deactivation, deletion, or a role change
 * takes effect immediately (not when the 30-day cookie expires).
 */
async function sessionRole(
  req: Request,
): Promise<{ role: AdminRole; name: string | null } | null> {
  const session = readSession(req, ADMIN_COOKIE);
  if (session?.role !== "admin") return null;
  if (session.staffId === undefined) return { role: "admin", name: null }; // owner
  const [user] = await db
    .select()
    .from(staffUsersTable)
    .where(eq(staffUsersTable.id, session.staffId));
  if (!user || !user.active) return null;
  return { role: user.role, name: user.name };
}

// Any authenticated admin-panel user (admin, manager, or staff)
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  void sessionRole(req).then((resolved) => {
    if (!resolved) {
      res.status(401).json({ error: "Не авторизованы" });
      return;
    }
    next();
  }, next);
}

function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void sessionRole(req).then((resolved) => {
      if (!resolved) {
        res.status(401).json({ error: "Не авторизованы" });
        return;
      }
      if (!roles.includes(resolved.role)) {
        res.status(403).json({ error: "Недостаточно прав" });
        return;
      }
      next();
    }, next);
  };
}

router.post("/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const username = parsed.data.username?.trim();
  if (username) {
    // Staff login by username + password
    const [user] = await db
      .select()
      .from(staffUsersTable)
      .where(eq(staffUsersTable.username, username.toLowerCase()));
    if (
      !user ||
      !user.active ||
      !(await verifyPassword(parsed.data.password, user.passwordHash))
    ) {
      res.status(401).json({ error: "Неверный пароль" });
      return;
    }
    setSession(res, ADMIN_COOKIE, {
      role: "admin",
      staffId: user.id,
      adminRole: user.role,
    });
    res.json(AdminLoginResponse.parse({ ok: true }));
    return;
  }
  // Owner login by master password
  if (!(await checkAdminPassword(parsed.data.password))) {
    res.status(401).json({ error: "Неверный пароль" });
    return;
  }
  setSession(res, ADMIN_COOKIE, { role: "admin" });
  res.json(AdminLoginResponse.parse({ ok: true }));
});

router.post("/admin/logout", async (_req, res): Promise<void> => {
  clearSession(res, ADMIN_COOKIE);
  res.json(AdminLogoutResponse.parse({ ok: true }));
});

router.get("/admin/me", async (req, res): Promise<void> => {
  const resolved = await sessionRole(req);
  if (!resolved) {
    res.status(401).json({ error: "Не авторизованы" });
    return;
  }
  res.json(
    GetAdminSessionResponse.parse({ ok: true, role: resolved.role, name: resolved.name }),
  );
});

// ---- Staff management (admin only) ----

const toStaffView = (u: typeof staffUsersTable.$inferSelect) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  role: u.role,
  active: u.active,
  createdAt: u.createdAt.toISOString(),
});

router.get("/admin/staff", requireRole("admin"), async (_req, res): Promise<void> => {
  const rows = await db.select().from(staffUsersTable).orderBy(staffUsersTable.id);
  res.json(ListStaffResponse.parse(rows.map(toStaffView)));
});

router.post("/admin/staff", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const username = parsed.data.username.trim().toLowerCase();
  const [existing] = await db
    .select({ id: staffUsersTable.id })
    .from(staffUsersTable)
    .where(eq(staffUsersTable.username, username));
  if (existing) {
    res.status(409).json({ error: "Логин уже занят" });
    return;
  }
  const [created] = await db
    .insert(staffUsersTable)
    .values({
      name: parsed.data.name.trim(),
      username,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
    })
    .returning();
  res.json(CreateStaffResponse.parse(toStaffView(created!)));
});

router.patch(
  "/admin/staff/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = UpdateStaffParams.safeParse(req.params);
    const body = UpdateStaffBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const patch: Partial<typeof staffUsersTable.$inferInsert> = {};
    if (body.data.name !== undefined) patch.name = body.data.name.trim();
    if (body.data.role !== undefined) patch.role = body.data.role;
    if (body.data.active !== undefined) patch.active = body.data.active;
    if (body.data.password !== undefined)
      patch.passwordHash = await hashPassword(body.data.password);
    const [updated] = await db
      .update(staffUsersTable)
      .set(patch)
      .where(eq(staffUsersTable.id, params.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }
    res.json(UpdateStaffResponse.parse(toStaffView(updated)));
  },
);

router.delete(
  "/admin/staff/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = DeleteStaffParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const deleted = await db
      .delete(staffUsersTable)
      .where(eq(staffUsersTable.id, params.data.id))
      .returning({ id: staffUsersTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Сотрудник не найден" });
      return;
    }
    res.json(DeleteStaffResponse.parse({ ok: true }));
  },
);

router.get("/admin/summary", requireRole("admin", "manager"), async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

  const all = await fetchBookingViews();
  const confirmed = all.filter((b) => b.status === "confirmed");

  const bookingsToday = confirmed.filter((b) => b.date === today);
  const upcoming = confirmed.filter((b) => b.date >= today);
  const revenueThisMonth = confirmed
    .filter((b) => b.date >= monthStart)
    .reduce((s, b) => s + b.totalPrice, 0);

  const next7Slots = await db
    .select()
    .from(slotsTable)
    .where(
      and(
        gte(slotsTable.date, today),
        lte(slotsTable.date, in7),
        eq(slotsTable.blocked, false),
      ),
    );
  const booked = await bookedSeatsBySlot(next7Slots.map((s) => s.id));
  const totalSeats = next7Slots.reduce((s, x) => s + x.capacity, 0);
  const bookedSeats = next7Slots.reduce(
    (s, x) => s + Math.min(x.capacity, booked.get(x.id) ?? 0),
    0,
  );

  const [companiesCount] = await db
    .select({ value: count() })
    .from(companiesTable)
    .where(eq(companiesTable.active, true));

  res.json(
    GetAdminSummaryResponse.parse({
      bookingsToday: bookingsToday.length,
      seatsBookedToday: bookingsToday.reduce((s, b) => s + b.peopleCount, 0),
      upcomingBookings: upcoming.length,
      revenueThisMonth,
      occupancyNext7Days: totalSeats > 0 ? bookedSeats / totalSeats : 0,
      activeCompanies: companiesCount?.value ?? 0,
    }),
  );
});

router.post("/admin/password", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = ChangeAdminPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Новый пароль должен быть не короче 6 символов" });
    return;
  }
  if (!(await checkAdminPassword(parsed.data.currentPassword))) {
    res.status(401).json({ error: "Текущий пароль указан неверно" });
    return;
  }
  await setAdminPassword(parsed.data.newPassword);
  res.json(ChangeAdminPasswordResponse.parse({ ok: true }));
});

// ---- Tours ----

router.get("/admin/tours", requireAdmin, async (_req, res): Promise<void> => {
  const tours = await db.select().from(toursTable).orderBy(toursTable.id);
  res.json(
    AdminListToursResponse.parse(tours.map((t) => ({ ...t, companyPrice: null }))),
  );
});

router.post("/admin/tours", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateTourBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tour] = await db
    .insert(toursTable)
    .values({
      name: parsed.data.name,
      description: parsed.data.description,
      nameEs: parsed.data.nameEs ?? "",
      nameEn: parsed.data.nameEn ?? "",
      descriptionEs: parsed.data.descriptionEs ?? "",
      descriptionEn: parsed.data.descriptionEn ?? "",
      durationMinutes: parsed.data.durationMinutes,
      basePrice: parsed.data.basePrice,
      imageUrl: parsed.data.imageUrl ?? null,
      active: parsed.data.active ?? true,
    })
    .returning();
  res.status(201).json(CreateTourResponse.parse({ ...tour!, companyPrice: null }));
});

router.patch("/admin/tours/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = UpdateTourParams.safeParse(req.params);
  const body = UpdateTourBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const [tour] = await db
    .update(toursTable)
    .set(body.data)
    .where(eq(toursTable.id, params.data.id))
    .returning();
  if (!tour) {
    res.status(404).json({ error: "Экскурсия не найдена" });
    return;
  }
  res.json(UpdateTourResponse.parse({ ...tour, companyPrice: null }));
});

router.delete("/admin/tours/:id", requireRole("admin"), async (req, res): Promise<void> => {
  const params = DeleteTourParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  await db.delete(toursTable).where(eq(toursTable.id, params.data.id));
  res.json(DeleteTourResponse.parse({ ok: true }));
});

// ---- Slots ----

async function slotViews(slotIds?: { from: string; to: string }) {
  const rows = await db
    .select()
    .from(slotsTable)
    .innerJoin(toursTable, eq(slotsTable.tourId, toursTable.id))
    .where(
      slotIds
        ? and(gte(slotsTable.date, slotIds.from), lte(slotsTable.date, slotIds.to))
        : undefined,
    );
  const booked = await bookedSeatsBySlot(rows.map((r) => r.slots.id));
  return rows
    .map((r) => {
      const used = booked.get(r.slots.id) ?? 0;
      return {
        id: r.slots.id,
        tourId: r.slots.tourId,
        tourName: r.tours.name,
        tourNameEs: r.tours.nameEs,
        tourNameEn: r.tours.nameEn,
        date: r.slots.date,
        startTime: r.slots.startTime,
        capacity: r.slots.capacity,
        bookedSeats: used,
        availableSeats: Math.max(0, r.slots.capacity - used),
        blocked: r.slots.blocked,
      };
    })
    .sort((a, b) =>
      a.date === b.date
        ? a.startTime.localeCompare(b.startTime)
        : a.date.localeCompare(b.date),
    );
}

router.get("/admin/slots", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = AdminListSlotsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  res.json(
    AdminListSlotsResponse.parse(
      await slotViews({ from: parsed.data.from, to: parsed.data.to }),
    ),
  );
});

router.post("/admin/slots", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateSlotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [tour] = await db
    .select()
    .from(toursTable)
    .where(eq(toursTable.id, parsed.data.tourId));
  if (!tour) {
    res.status(400).json({ error: "Экскурсия не найдена" });
    return;
  }
  const [slot] = await db
    .insert(slotsTable)
    .values({
      tourId: parsed.data.tourId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      capacity: parsed.data.capacity,
    })
    .returning();
  res.status(201).json(
    CreateSlotResponse.parse({
      id: slot!.id,
      tourId: slot!.tourId,
      tourName: tour.name,
      tourNameEs: tour.nameEs,
      tourNameEn: tour.nameEn,
      date: slot!.date,
      startTime: slot!.startTime,
      capacity: slot!.capacity,
      bookedSeats: 0,
      availableSeats: slot!.capacity,
      blocked: slot!.blocked,
    }),
  );
});

router.post("/admin/slots/bulk", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const parsed = CreateSlotsBulkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { tourId, dateFrom, dateTo, weekdays, times, capacity } = parsed.data;
  const [tour] = await db.select().from(toursTable).where(eq(toursTable.id, tourId));
  if (!tour) {
    res.status(400).json({ error: "Экскурсия не найдена" });
    return;
  }

  const existing = await db
    .select()
    .from(slotsTable)
    .where(
      and(
        eq(slotsTable.tourId, tourId),
        gte(slotsTable.date, dateFrom),
        lte(slotsTable.date, dateTo),
      ),
    );
  const existingKeys = new Set(existing.map((s) => `${s.date}|${s.startTime}`));

  const values: { tourId: number; date: string; startTime: string; capacity: number }[] = [];
  const start = new Date(`${dateFrom}T00:00:00Z`);
  const end = new Date(`${dateTo}T00:00:00Z`);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!weekdays.includes(d.getUTCDay())) continue;
    const dateStr = d.toISOString().slice(0, 10);
    for (const time of times) {
      if (existingKeys.has(`${dateStr}|${time}`)) continue;
      values.push({ tourId, date: dateStr, startTime: time, capacity });
    }
  }

  if (values.length > 0) {
    await db.insert(slotsTable).values(values);
  }
  res.status(201).json(CreateSlotsBulkResponse.parse({ created: values.length }));
});

router.patch("/admin/slots/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = UpdateSlotParams.safeParse(req.params);
  const body = UpdateSlotBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const [slot] = await db
    .update(slotsTable)
    .set(body.data)
    .where(eq(slotsTable.id, params.data.id))
    .returning();
  if (!slot) {
    res.status(404).json({ error: "Слот не найден" });
    return;
  }
  const [tour] = await db
    .select()
    .from(toursTable)
    .where(eq(toursTable.id, slot.tourId));
  const booked = await bookedSeatsBySlot([slot.id]);
  const used = booked.get(slot.id) ?? 0;
  res.json(
    UpdateSlotResponse.parse({
      id: slot.id,
      tourId: slot.tourId,
      tourName: tour?.name ?? "",
      tourNameEs: tour?.nameEs ?? "",
      tourNameEn: tour?.nameEn ?? "",
      date: slot.date,
      startTime: slot.startTime,
      capacity: slot.capacity,
      bookedSeats: used,
      availableSeats: Math.max(0, slot.capacity - used),
      blocked: slot.blocked,
    }),
  );
});

router.delete("/admin/slots/:id", requireRole("admin", "manager"), async (req, res): Promise<void> => {
  const params = DeleteSlotParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Некорректный id" });
    return;
  }
  const [bookingCount] = await db
    .select({ value: count() })
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.slotId, params.data.id),
        eq(bookingsTable.status, "confirmed"),
      ),
    );
  if ((bookingCount?.value ?? 0) > 0) {
    res
      .status(400)
      .json({ error: "У слота есть активные брони — сначала отмените их" });
    return;
  }
  await db.delete(slotsTable).where(eq(slotsTable.id, params.data.id));
  res.json(DeleteSlotResponse.parse({ ok: true }));
});

// ---- Companies ----

router.get("/admin/companies", requireRole("admin"), async (_req, res): Promise<void> => {
  const companies = await db
    .select()
    .from(companiesTable)
    .orderBy(companiesTable.id);
  res.json(
    AdminListCompaniesResponse.parse(
      companies.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
    ),
  );
});

router.post("/admin/companies", requireRole("admin"), async (req, res): Promise<void> => {
  const parsed = CreateCompanyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db
    .select()
    .from(companiesTable)
    .where(eq(companiesTable.password, parsed.data.password));
  if (existing) {
    res.status(400).json({ error: "Этот пароль уже используется другой компанией" });
    return;
  }
  const [company] = await db
    .insert(companiesTable)
    .values({
      name: parsed.data.name,
      contactEmail: parsed.data.contactEmail ?? null,
      password: parsed.data.password,
      active: parsed.data.active ?? true,
    })
    .returning();
  res.status(201).json(
    CreateCompanyResponse.parse({
      ...company!,
      createdAt: company!.createdAt.toISOString(),
    }),
  );
});

router.patch(
  "/admin/companies/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = UpdateCompanyParams.safeParse(req.params);
    const body = UpdateCompanyBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    if (body.data.password !== undefined) {
      const [existing] = await db
        .select()
        .from(companiesTable)
        .where(eq(companiesTable.password, body.data.password));
      if (existing && existing.id !== params.data.id) {
        res
          .status(400)
          .json({ error: "Этот пароль уже используется другой компанией" });
        return;
      }
    }
    const [company] = await db
      .update(companiesTable)
      .set(body.data)
      .where(eq(companiesTable.id, params.data.id))
      .returning();
    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }
    res.json(
      UpdateCompanyResponse.parse({
        ...company,
        createdAt: company.createdAt.toISOString(),
      }),
    );
  },
);

router.delete(
  "/admin/companies/:id",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = DeleteCompanyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    await db.delete(companiesTable).where(eq(companiesTable.id, params.data.id));
    res.json(DeleteCompanyResponse.parse({ ok: true }));
  },
);

router.get(
  "/admin/companies/:id/prices",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = GetCompanyPriceListParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Некорректный id" });
      return;
    }
    const tours = await db
      .select()
      .from(toursTable)
      .where(eq(toursTable.active, true))
      .orderBy(toursTable.id);
    const prices = await db
      .select()
      .from(companyPricesTable)
      .where(eq(companyPricesTable.companyId, params.data.id));
    const priceMap = new Map(prices.map((p) => [p.tourId, p.price]));
    res.json(
      GetCompanyPriceListResponse.parse(
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

router.put(
  "/admin/companies/:id/prices",
  requireRole("admin"),
  async (req, res): Promise<void> => {
    const params = SetCompanyPriceListParams.safeParse(req.params);
    const body = SetCompanyPriceListBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const [company] = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.id, params.data.id));
    if (!company) {
      res.status(404).json({ error: "Компания не найдена" });
      return;
    }
    await db
      .delete(companyPricesTable)
      .where(eq(companyPricesTable.companyId, params.data.id));
    if (body.data.items.length > 0) {
      await db.insert(companyPricesTable).values(
        body.data.items.map((item) => ({
          companyId: params.data.id,
          tourId: item.tourId,
          price: item.price,
        })),
      );
    }
    const tours = await db
      .select()
      .from(toursTable)
      .where(eq(toursTable.active, true))
      .orderBy(toursTable.id);
    const priceMap = new Map(body.data.items.map((i) => [i.tourId, i.price]));
    res.json(
      SetCompanyPriceListResponse.parse(
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

// ---- Bookings ----

router.get("/admin/bookings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = AdminListBookingsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  let views = await fetchBookingViews();
  if (parsed.data.from) views = views.filter((v) => v.date >= parsed.data.from!);
  if (parsed.data.to) views = views.filter((v) => v.date <= parsed.data.to!);
  views.sort((a, b) =>
    a.date === b.date
      ? a.startTime.localeCompare(b.startTime)
      : b.date.localeCompare(a.date),
  );
  res.json(AdminListBookingsResponse.parse(views));
});

router.patch(
  "/admin/bookings/:id",
  requireRole("admin", "manager"),
  async (req, res): Promise<void> => {
    const params = UpdateBookingStatusParams.safeParse(req.params);
    const body = UpdateBookingStatusBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const [booking] = await db
      .update(bookingsTable)
      .set({ status: body.data.status })
      .where(eq(bookingsTable.id, params.data.id))
      .returning();
    if (!booking) {
      res.status(404).json({ error: "Бронирование не найдено" });
      return;
    }
    const [view] = await fetchBookingViews({ id: booking.id });
    res.json(UpdateBookingStatusResponse.parse(view));
  },
);

// Re-send confirmation emails for a booking and record the outcome
router.post(
  "/admin/bookings/:id/resend-email",
  requireRole("admin", "manager"),
  async (req, res): Promise<void> => {
    const params = ResendBookingEmailsParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const [view] = await fetchBookingViews({ id: params.data.id });
    if (!view) {
      res.status(404).json({ error: "Бронирование не найдено" });
      return;
    }
    await dispatchBookingEmails(view);
    const [updated] = await fetchBookingViews({ id: params.data.id });
    res.json(ResendBookingEmailsResponse.parse(updated));
  },
);

// QR check-in: mark a booking as arrived by its code
router.post(
  "/admin/check-in/:code",
  requireAdmin,
  async (req, res): Promise<void> => {
    const params = CheckInBookingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Некорректные данные" });
      return;
    }
    const code = params.data.code.trim().toUpperCase();
    // Atomic conditional update: only the first scan sets checkedInAt.
    const claimed = await db
      .update(bookingsTable)
      .set({ checkedInAt: new Date() })
      .where(
        and(
          eq(bookingsTable.code, code),
          eq(bookingsTable.status, "confirmed"),
          isNull(bookingsTable.checkedInAt),
        ),
      )
      .returning({ id: bookingsTable.id });
    const alreadyCheckedIn = claimed.length === 0;
    const [updated] = await fetchBookingViews({ code });
    if (!updated) {
      res.status(404).json({ error: "Бронирование не найдено" });
      return;
    }
    if (updated.status !== "confirmed") {
      res.status(409).json({ error: "Бронь не подтверждена" });
      return;
    }
    res.json(
      CheckInBookingResponse.parse({ booking: updated, alreadyCheckedIn }),
    );
  },
);

// Expire unpaid bookings past their payment window
router.post("/admin/bookings/expire", requireRole("admin", "manager"), async (_req, res): Promise<void> => {
  const cancelled = await expireStaleBookings();
  void retryFailedBookingEmails();
  res.json(ExpireUnpaidBookingsResponse.parse({ cancelled }));
});

export default router;
