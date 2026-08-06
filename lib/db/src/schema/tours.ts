import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const toursTable = pgTable("tours", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  durationMinutes: integer("duration_minutes").notNull(),
  basePrice: integer("base_price").notNull(),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
});

export const insertTourSchema = createInsertSchema(toursTable).omit({ id: true });
export type InsertTour = z.infer<typeof insertTourSchema>;
export type Tour = typeof toursTable.$inferSelect;
