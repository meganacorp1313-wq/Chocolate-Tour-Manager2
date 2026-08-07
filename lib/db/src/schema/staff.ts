import { boolean, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const staffUsersTable = pgTable("staff_users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "manager", "staff"] }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type StaffUserRow = typeof staffUsersTable.$inferSelect;
