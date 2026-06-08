import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { grandPrixTable } from "./grand_prix";
import { driversTable } from "./drivers";
import { constructorTeamsTable } from "./constructor_teams";

export const driverResultsTable = pgTable("driver_results", {
  id: text("id").primaryKey(),
  gpId: text("gp_id").notNull().references(() => grandPrixTable.id),
  driverId: text("driver_id").notNull().references(() => driversTable.id),
  sessionType: text("session_type").notNull(), // race, quali, sprint
  position: integer("position"),
  fastestLap: boolean("fastest_lap").notNull().default(false),
  pole: boolean("pole").notNull().default(false),
  dnf: boolean("dnf").notNull().default(false),
  dnfReason: text("dnf_reason"),
  overtakes: integer("overtakes"),
  gridPosition: integer("grid_position"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const pitStopResultsTable = pgTable("pit_stop_results", {
  id: text("id").primaryKey(),
  gpId: text("gp_id").notNull().references(() => grandPrixTable.id),
  constructorTeamId: text("constructor_team_id").notNull().references(() => constructorTeamsTable.id),
  pitDurationMs: integer("pit_duration_ms").notNull(),
  rank: integer("rank").notNull(),
  isNegative: boolean("is_negative").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const teamStandingResultsTable = pgTable("team_standing_results", {
  id: text("id").primaryKey(),
  gpId: text("gp_id").notNull().references(() => grandPrixTable.id),
  constructorTeamId: text("constructor_team_id").notNull().references(() => constructorTeamsTable.id),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDriverResultSchema = createInsertSchema(driverResultsTable).omit({ createdAt: true, updatedAt: true });
export type InsertDriverResult = z.infer<typeof insertDriverResultSchema>;
export type DriverResult = typeof driverResultsTable.$inferSelect;

export const insertPitStopResultSchema = createInsertSchema(pitStopResultsTable).omit({ createdAt: true });
export type InsertPitStopResult = z.infer<typeof insertPitStopResultSchema>;
export type PitStopResult = typeof pitStopResultsTable.$inferSelect;
