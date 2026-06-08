import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { seasonsTable } from "./seasons";

export const constructorTeamsTable = pgTable("constructor_teams", {
  id: text("id").primaryKey(),
  seasonId: text("season_id").notNull().references(() => seasonsTable.id),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  nationality: text("nationality").notNull(),
  color: text("color"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull().default("0"),
  priceChange: numeric("price_change", { precision: 10, scale: 2 }).notNull().default("0"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertConstructorTeamSchema = createInsertSchema(constructorTeamsTable).omit({ createdAt: true, updatedAt: true });
export type InsertConstructorTeam = z.infer<typeof insertConstructorTeamSchema>;
export type ConstructorTeam = typeof constructorTeamsTable.$inferSelect;
