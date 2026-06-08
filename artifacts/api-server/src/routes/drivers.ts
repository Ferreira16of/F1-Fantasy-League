import { Router, type IRouter } from "express";
import { db, driversTable, constructorTeamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../lib/auth";
import { CreateDriverBody, UpdateDriverBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function serializeDriver(d: typeof driversTable.$inferSelect) {
  const [team] = await db.select().from(constructorTeamsTable).where(eq(constructorTeamsTable.id, d.constructorTeamId)).limit(1);
  return {
    id: d.id,
    seasonId: d.seasonId,
    name: d.name,
    shortName: d.shortName ?? d.name.split(" ").pop() ?? d.name,
    number: d.number,
    nationality: d.nationality,
    constructorTeamId: d.constructorTeamId,
    constructorTeamName: team?.name ?? "",
    price: Number(d.price),
    priceChange: Number(d.priceChange),
    imageUrl: d.imageUrl ?? null,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
  };
}

router.get("/drivers", async (req, res): Promise<void> => {
  const seasonId = req.query.seasonId as string | undefined;
  const query = db.select().from(driversTable);
  const rows = seasonId
    ? await query.where(eq(driversTable.seasonId, seasonId))
    : await query;

  const result = await Promise.all(rows.map(serializeDriver));
  res.json(result);
});

router.post("/drivers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [driver] = await db.insert(driversTable).values({
    id: randomUUID(),
    ...parsed.data,
    price: String(parsed.data.price),
    priceChange: "0",
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(await serializeDriver(driver));
});

router.get("/drivers/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [driver] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
  if (!driver) {
    res.status(404).json({ error: "Piloto não encontrado" });
    return;
  }
  res.json(await serializeDriver(driver));
});

router.patch("/drivers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateDriverBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price != null) data.price = String(parsed.data.price);
  const [driver] = await db.update(driversTable).set(data).where(eq(driversTable.id, id)).returning();
  if (!driver) {
    res.status(404).json({ error: "Piloto não encontrado" });
    return;
  }
  res.json(await serializeDriver(driver));
});

export default router;
