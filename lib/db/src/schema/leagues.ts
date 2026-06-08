import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { seasonsTable } from "./seasons";

export const leaguesTable = pgTable("leagues", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isPublic: boolean("is_public").notNull().default(true),
  inviteCode: text("invite_code").notNull().unique(),
  ownerId: text("owner_id").notNull().references(() => usersTable.id),
  seasonId: text("season_id").notNull().references(() => seasonsTable.id),
  isFactory: boolean("is_factory").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const leagueMembersTable = pgTable("league_members", {
  id: text("id").primaryKey(),
  leagueId: text("league_id").notNull().references(() => leaguesTable.id),
  userId: text("user_id").notNull().references(() => usersTable.id),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLeagueSchema = createInsertSchema(leaguesTable).omit({ createdAt: true, updatedAt: true });
export type InsertLeague = z.infer<typeof insertLeagueSchema>;
export type League = typeof leaguesTable.$inferSelect;
