import { pgTable, serial, integer, date, text, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { toursTable } from "./tours";

export const slotsTable = pgTable("slots", {
  id: serial("id").primaryKey(),
  tourId: integer("tour_id")
    .notNull()
    .references(() => toursTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  startTime: text("start_time").notNull(), // "HH:MM"
  capacity: integer("capacity").notNull(),
  blocked: boolean("blocked").notNull().default(false),
});

export const insertSlotSchema = createInsertSchema(slotsTable).omit({ id: true });
export type InsertSlot = z.infer<typeof insertSlotSchema>;
export type Slot = typeof slotsTable.$inferSelect;
