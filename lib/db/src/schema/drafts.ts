import { pgTable, text, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { grandPrixTable } from "./grand_prix";
import { driversTable } from "./drivers";
import { constructorTeamsTable } from "./constructor_teams";

export const draftsTable = pgTable("drafts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  gpId: text("gp_id").notNull().references(() => grandPrixTable.id),
  driver1Id: text("driver1_id").notNull().references(() => driversTable.id),
  driver2Id: text("driver2_id").notNull().references(() => driversTable.id),
  driver3Id: text("driver3_id").notNull().references(() => driversTable.id),
  reserveDriverId: text("reserve_driver_id").references(() => driversTable.id),
  constructorTeamId: text("constructor_team_id").notNull().references(() => constructorTeamsTable.id),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDraftSchema = createInsertSchema(draftsTable).omit({ createdAt: true, updatedAt: true });
export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof draftsTable.$inferSelect;
