import { pgTable, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoringRulesTable = pgTable("scoring_rules", {
  id: text("id").primaryKey(),
  // race/quali/sprint positions stored as JSON: {"1": 25, "2": 18, ...}
  racePoints: jsonb("race_points").notNull().$type<Record<string, number>>(),
  qualiPoints: jsonb("quali_points").notNull().$type<Record<string, number>>(),
  sprintPoints: jsonb("sprint_points").notNull().$type<Record<string, number>>(),
  fastestLapPoints: numeric("fastest_lap_points", { precision: 6, scale: 2 }).notNull().default("5"),
  polePoints: numeric("pole_points", { precision: 6, scale: 2 }).notNull().default("10"),
  dnfPenalty: numeric("dnf_penalty", { precision: 6, scale: 2 }).notNull().default("-10"),
  overtakePoints: numeric("overtake_points", { precision: 6, scale: 2 }).notNull().default("1"),
  crashPenalty: numeric("crash_penalty", { precision: 6, scale: 2 }).notNull().default("-5"),
  pitStopTopPoints: numeric("pit_stop_top_points", { precision: 6, scale: 2 }).notNull().default("5"),
  pitStopBottomPenalty: numeric("pit_stop_bottom_penalty", { precision: 6, scale: 2 }).notNull().default("-3"),
  constructorTopPoints: numeric("constructor_top_points", { precision: 6, scale: 2 }).notNull().default("10"),
  constructorBottomPenalty: numeric("constructor_bottom_penalty", { precision: 6, scale: 2 }).notNull().default("-5"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScoringRulesSchema = createInsertSchema(scoringRulesTable);
export type InsertScoringRules = z.infer<typeof insertScoringRulesSchema>;
export type ScoringRules = typeof scoringRulesTable.$inferSelect;
