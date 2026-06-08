import { pgTable, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";

export const gpStatusEnum = ["upcoming", "locked", "in_progress", "completed"] as const;

export const grandPrixTable = pgTable("grand_prix", {
  id: text("id").primaryKey(),
  seasonId: text("season_id").notNull().references(() => seasonsTable.id),
  name: text("name").notNull(),
  round: integer("round").notNull(),
  country: text("country").notNull(),
  circuitName: text("circuit_name").notNull(),
  raceDate: text("race_date").notNull(),
  hasSprint: boolean("has_sprint").notNull().default(false),
  draftLockTime: text("draft_lock_time").notNull(),
  status: text("status").$type<typeof gpStatusEnum[number]>().notNull().default("upcoming"),
  openf1MeetingKey: integer("openf1_meeting_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGrandPrixSchema = createInsertSchema(grandPrixTable).omit({ createdAt: true, updatedAt: true });
export type InsertGrandPrix = z.infer<typeof insertGrandPrixSchema>;
export type GrandPrix = typeof grandPrixTable.$inferSelect;
