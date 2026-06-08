import { Router, type IRouter } from "express";
import { db, seasonsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth, requireAdmin } from "../lib/auth";
import { CreateSeasonBody, UpdateSeasonBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeSeason(s: typeof seasonsTable.$inferSelect) {
  return {
    id: s.id,
    year: s.year,
    name: s.name,
    isActive: s.isActive,
    baseBudget: Number(s.baseBudget),
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/seasons", async (_req, res): Promise<void> => {
  const seasons = await db.select().from(seasonsTable).orderBy(desc(seasonsTable.year));
  res.json(seasons.map(serializeSeason));
});

router.get("/seasons/current", async (_req, res): Promise<void> => {
  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.isActive, true)).limit(1);
  if (!season) {
    res.status(404).json({ error: "Nenhuma temporada ativa" });
    return;
  }
  res.json(serializeSeason(season));
});

router.get("/seasons/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [season] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id)).limit(1);
  if (!season) {
    res.status(404).json({ error: "Temporada não encontrada" });
    return;
  }
  res.json(serializeSeason(season));
});

router.post("/seasons", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [season] = await db.insert(seasonsTable).values({
    id: randomUUID(),
    ...parsed.data,
    baseBudget: String(parsed.data.baseBudget),
  }).returning();
  res.status(201).json(serializeSeason(season));
});

router.patch("/seasons/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateSeasonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.baseBudget != null) data.baseBudget = String(parsed.data.baseBudget);
  const [season] = await db.update(seasonsTable).set(data).where(eq(seasonsTable.id, id)).returning();
  if (!season) {
    res.status(404).json({ error: "Temporada não encontrada" });
    return;
  }
  res.json(serializeSeason(season));
});

export default router;
