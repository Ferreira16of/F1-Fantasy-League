import { Router, type IRouter } from "express";
import { db, constructorTeamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../lib/auth";
import { CreateConstructorTeamBody, UpdateConstructorTeamBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeTeam(t: typeof constructorTeamsTable.$inferSelect) {
  return {
    id: t.id,
    seasonId: t.seasonId,
    name: t.name,
    shortName: t.shortName,
    nationality: t.nationality,
    color: t.color ?? null,
    price: Number(t.price),
    priceChange: Number(t.priceChange),
    imageUrl: t.imageUrl ?? null,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/constructor-teams", async (req, res): Promise<void> => {
  const seasonId = req.query.seasonId as string | undefined;
  const query = db.select().from(constructorTeamsTable);
  const rows = seasonId
    ? await query.where(eq(constructorTeamsTable.seasonId, seasonId))
    : await query;
  res.json(rows.map(serializeTeam));
});

router.post("/constructor-teams", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateConstructorTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [team] = await db.insert(constructorTeamsTable).values({
    id: randomUUID(),
    ...parsed.data,
    price: String(parsed.data.price),
    priceChange: "0",
  }).returning();
  res.status(201).json(serializeTeam(team));
});

router.get("/constructor-teams/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [team] = await db.select().from(constructorTeamsTable).where(eq(constructorTeamsTable.id, id)).limit(1);
  if (!team) {
    res.status(404).json({ error: "Equipe não encontrada" });
    return;
  }
  res.json(serializeTeam(team));
});

router.patch("/constructor-teams/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateConstructorTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.price != null) data.price = String(parsed.data.price);
  const [team] = await db.update(constructorTeamsTable).set(data).where(eq(constructorTeamsTable.id, id)).returning();
  if (!team) {
    res.status(404).json({ error: "Equipe não encontrada" });
    return;
  }
  res.json(serializeTeam(team));
});

export default router;
