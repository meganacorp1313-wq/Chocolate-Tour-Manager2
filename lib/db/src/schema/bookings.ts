import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { slotsTable } from "./slots";
import { companiesTable } from "./companies";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  slotId: integer("slot_id")
    .notNull()
    .references(() => slotsTable.id, { onDelete: "cascade" }),
  companyId: integer("company_id").references(() => companiesTable.id, {
    onDelete: "set null",
  }),
  customerName: text("customer_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  peopleCount: integer("people_count").notNull(),
  pricePerPerson: integer("price_per_person").notNull(),
  totalPrice: integer("total_price").notNull(),
  status: text("status").notNull().default("confirmed"), // confirmed | cancelled | pending_payment
  paymentStatus: text("payment_status"), // null | pending | paid
  whopCheckoutId: text("whop_checkout_id"), // Whop checkout configuration ID
  paymentExpiresAt: timestamp("payment_expires_at", { withTimezone: true }), // when unpaid booking auto-cancels
  language: text("language").notNull().default("es"), // es | en | ru — client UI language for emails
  emailStatus: text("email_status"), // null = not attempted yet | sent | failed
  emailError: text("email_error"), // last email failure details, cleared on success
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookingsTable.$inferSelect;
