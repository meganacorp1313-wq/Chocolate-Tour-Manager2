import { inArray, and, eq, sum, lt, or } from "drizzle-orm";
import { db, bookingsTable, slotsTable, toursTable } from "@workspace/db";
import type { Booking, Slot, Tour } from "@workspace/db";

/** Sum of confirmed + pending_payment seats per slot id (both hold a place). */
export async function bookedSeatsBySlot(
  slotIds: number[],
): Promise<Map<number, number>> {
  const map = new Map<number, number>();
  if (slotIds.length === 0) return map;
  const rows = await db
    .select({
      slotId: bookingsTable.slotId,
      seats: sum(bookingsTable.peopleCount),
    })
    .from(bookingsTable)
    .where(
      and(
        inArray(bookingsTable.slotId, slotIds),
        or(
          eq(bookingsTable.status, "confirmed"),
          eq(bookingsTable.status, "pending_payment"),
        ),
      ),
    )
    .groupBy(bookingsTable.slotId);
  for (const row of rows) {
    map.set(row.slotId, Number(row.seats ?? 0));
  }
  return map;
}

/** Cancel retail bookings whose payment window has expired. Returns count. */
export async function expireStaleBookings(): Promise<number> {
  const now = new Date();
  const expired = await db
    .update(bookingsTable)
    .set({ status: "cancelled", paymentStatus: null })
    .where(
      and(
        eq(bookingsTable.status, "pending_payment"),
        lt(bookingsTable.paymentExpiresAt, now),
      ),
    )
    .returning({ id: bookingsTable.id });
  return expired.length;
}

export function generateBookingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export interface BookingView {
  id: number;
  code: string;
  slotId: number;
  tourName: string;
  tourNameEs: string;
  tourNameEn: string;
  date: string;
  startTime: string;
  customerName: string;
  phone: string;
  email: string | null;
  peopleCount: number;
  pricePerPerson: number;
  totalPrice: number;
  status: string;
  paymentStatus: string | null;
  checkoutUrl: string | null;
  companyId: number | null;
  companyName: string | null;
  comment: string | null;
  createdAt: string;
}

export function toBookingView(
  booking: Booking,
  slot: Slot,
  tour: Tour,
  companyName: string | null,
  checkoutUrl?: string | null,
): BookingView {
  return {
    id: booking.id,
    code: booking.code,
    slotId: booking.slotId,
    tourName: tour.name,
    tourNameEs: tour.nameEs,
    tourNameEn: tour.nameEn,
    date: slot.date,
    startTime: slot.startTime,
    customerName: booking.customerName,
    phone: booking.phone,
    email: booking.email,
    peopleCount: booking.peopleCount,
    pricePerPerson: booking.pricePerPerson,
    totalPrice: booking.totalPrice,
    status: booking.status,
    paymentStatus: booking.paymentStatus ?? null,
    checkoutUrl: checkoutUrl ?? null,
    companyId: booking.companyId,
    companyName,
    comment: booking.comment,
    createdAt: booking.createdAt.toISOString(),
  };
}

/** Fetch full booking views joined with slots/tours/companies. */
export async function fetchBookingViews(where?: {
  companyId?: number;
  code?: string;
  id?: number;
}): Promise<BookingView[]> {
  const conditions = [];
  if (where?.companyId !== undefined)
    conditions.push(eq(bookingsTable.companyId, where.companyId));
  if (where?.code !== undefined) conditions.push(eq(bookingsTable.code, where.code));
  if (where?.id !== undefined) conditions.push(eq(bookingsTable.id, where.id));

  const rows = await db
    .select()
    .from(bookingsTable)
    .innerJoin(slotsTable, eq(bookingsTable.slotId, slotsTable.id))
    .innerJoin(toursTable, eq(slotsTable.tourId, toursTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const companyIds = [
    ...new Set(
      rows.map((r) => r.bookings.companyId).filter((v): v is number => v !== null),
    ),
  ];
  const companyNames = new Map<number, string>();
  if (companyIds.length > 0) {
    const { companiesTable } = await import("@workspace/db");
    const companies = await db
      .select()
      .from(companiesTable)
      .where(inArray(companiesTable.id, companyIds));
    for (const c of companies) companyNames.set(c.id, c.name);
  }

  return rows.map((r) =>
    toBookingView(
      r.bookings,
      r.slots,
      r.tours,
      r.bookings.companyId !== null
        ? (companyNames.get(r.bookings.companyId) ?? null)
        : null,
    ),
  );
}
