import { pgTable, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";
import { constructorTeamsTable } from "./constructor_teams";

export const driversTable = pgTable("drivers", {
  id: text("id").primaryKey(),
  seasonId: text("season_id").notNull().references(() => seasonsTable.id),
  name: text("name").notNull(),
  shortName: text("short_name"),
  number: integer("number").notNull(),
  nationality: text("nationality").notNull(),
  constructorTeamId: text("constructor_team_id").notNull().references(() => constructorTeamsTable.id),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceChange: numeric("price_change", { precision: 10, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ createdAt: true, updatedAt: true });
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Driver = typeof driversTable.$inferSelect;
