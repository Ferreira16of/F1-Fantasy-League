import { pgTable, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { draftsTable } from "./drafts";
import { usersTable } from "./users";
import { grandPrixTable } from "./grand_prix";

export const draftScoresTable = pgTable("draft_scores", {
  id: text("id").primaryKey(),
  draftId: text("draft_id").notNull().references(() => draftsTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  gpId: text("gp_id").notNull().references(() => grandPrixTable.id),
  totalPoints: numeric("total_points", { precision: 10, scale: 2 }).notNull().default("0"),
  reserveActivated: boolean("reserve_activated").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const scoreLineItemsTable = pgTable("score_line_items", {
  id: text("id").primaryKey(),
  draftScoreId: text("draft_score_id").notNull().references(() => draftScoresTable.id),
  entity: text("entity").notNull(),
  entityType: text("entity_type").notNull(), // driver, constructor_team, reserve_driver
  event: text("event").notNull(),
  points: numeric("points", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const seasonScoresTable = pgTable("season_scores", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id),
  seasonId: text("season_id").notNull(),
  totalPoints: numeric("total_points", { precision: 10, scale: 2 }).notNull().default("0"),
  gpCount: integer("gp_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDraftScoreSchema = createInsertSchema(draftScoresTable).omit({ createdAt: true, updatedAt: true });
export type InsertDraftScore = z.infer<typeof insertDraftScoreSchema>;
export type DraftScore = typeof draftScoresTable.$inferSelect;
