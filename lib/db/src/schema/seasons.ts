import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seasonsTable = pgTable("seasons", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(false),
  baseBudget: numeric("base_budget", { precision: 10, scale: 2 }).notNull().default("100"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSeasonSchema = createInsertSchema(seasonsTable).omit({ createdAt: true, updatedAt: true });
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasonsTable.$inferSelect;
