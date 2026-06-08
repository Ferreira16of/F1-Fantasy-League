import { Router, type IRouter } from "express";
import { db, draftsTable, grandPrixTable, driversTable, constructorTeamsTable, draftScoresTable, scoreLineItemsTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";
import { SaveDraftBody } from "@workspace/api-zod";

const router: IRouter = Router();

function serializeDraft(d: typeof draftsTable.$inferSelect) {
  return {
    id: d.id,
    userId: d.userId,
    gpId: d.gpId,
    driver1Id: d.driver1Id,
    driver2Id: d.driver2Id,
    driver3Id: d.driver3Id,
    reserveDriverId: d.reserveDriverId ?? null,
    constructorTeamId: d.constructorTeamId,
    totalCost: Number(d.totalCost),
    isLocked: d.isLocked,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

router.get("/gps/:gpId/draft", requireAuth, async (req, res): Promise<void> => {
  const gpId = Array.isArray(req.params.gpId) ? req.params.gpId[0] : req.params.gpId;
  const userId = req.user!.id;
  const [draft] = await db.select().from(draftsTable)
    .where(and(eq(draftsTable.gpId, gpId), eq(draftsTable.userId, userId)))
    .limit(1);
  if (!draft) {
    res.status(404).json({ error: "Nenhum draft encontrado" });
    return;
  }
  res.json(serializeDraft(draft));
});

router.put("/gps/:gpId/draft", requireAuth, async (req, res): Promise<void> => {
  const gpId = Array.isArray(req.params.gpId) ? req.params.gpId[0] : req.params.gpId;
  const userId = req.user!.id;

  const [gp] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, gpId)).limit(1);
  if (!gp) {
    res.status(404).json({ error: "GP não encontrado" });
    return;
  }
  if (gp.status !== "upcoming") {
    res.status(400).json({ error: "Draft bloqueado para este GP" });
    return;
  }

  const parsed = SaveDraftBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { driver1Id, driver2Id, driver3Id, reserveDriverId, constructorTeamId } = parsed.data;

  // Validate no duplicate drivers
  const driverIds = [driver1Id, driver2Id, driver3Id];
  if (new Set(driverIds).size !== 3) {
    res.status(400).json({ error: "Pilotos duplicados não são permitidos" });
    return;
  }

  // Fetch prices
  const drivers = await Promise.all(driverIds.map(async id => {
    const [d] = await db.select().from(driversTable).where(eq(driversTable.id, id)).limit(1);
    return d;
  }));

  const [team] = await db.select().from(constructorTeamsTable).where(eq(constructorTeamsTable.id, constructorTeamId)).limit(1);

  if (drivers.some(d => !d) || !team) {
    res.status(400).json({ error: "Piloto ou equipe não encontrado" });
    return;
  }

  // Validate reserve driver (must be cheaper than cheapest main driver)
  if (reserveDriverId) {
    const [reserveDriver] = await db.select().from(driversTable).where(eq(driversTable.id, reserveDriverId)).limit(1);
    if (!reserveDriver) {
      res.status(400).json({ error: "Piloto reserva não encontrado" });
      return;
    }
    const cheapestMain = Math.min(...drivers.map(d => Number(d!.price)));
    if (Number(reserveDriver.price) >= cheapestMain) {
      res.status(400).json({ error: "Piloto reserva deve ser mais barato que o piloto mais barato da seleção" });
      return;
    }
  }

  const totalCost = drivers.reduce((sum, d) => sum + Number(d!.price), 0) + Number(team.price);

  // Get user's available budget
  const [userRow] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const availableBudget = Number(userRow?.budget ?? 100) + Number(userRow?.bonusBudget ?? 0);

  if (totalCost > availableBudget) {
    res.status(400).json({ error: `Orçamento insuficiente. Custo: ${totalCost}, Disponível: ${availableBudget}` });
    return;
  }

  // Upsert draft
  const [existing] = await db.select().from(draftsTable)
    .where(and(eq(draftsTable.gpId, gpId), eq(draftsTable.userId, userId)))
    .limit(1);

  let draft: typeof draftsTable.$inferSelect;
  if (existing) {
    const [updated] = await db.update(draftsTable).set({
      driver1Id, driver2Id, driver3Id,
      reserveDriverId: reserveDriverId ?? null,
      constructorTeamId,
      totalCost: String(totalCost),
    }).where(eq(draftsTable.id, existing.id)).returning();
    draft = updated;
  } else {
    const [created] = await db.insert(draftsTable).values({
      id: randomUUID(),
      userId,
      gpId,
      driver1Id, driver2Id, driver3Id,
      reserveDriverId: reserveDriverId ?? null,
      constructorTeamId,
      totalCost: String(totalCost),
      isLocked: false,
    }).returning();
    draft = created;
  }

  res.json(serializeDraft(draft));
});

router.get("/gps/:gpId/drafts/scores", requireAuth, async (req, res): Promise<void> => {
  const gpId = Array.isArray(req.params.gpId) ? req.params.gpId[0] : req.params.gpId;
  const scores = await db.select({
    userId: draftScoresTable.userId,
    totalPoints: draftScoresTable.totalPoints,
    handle: usersTable.handle,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
  })
    .from(draftScoresTable)
    .leftJoin(usersTable, eq(draftScoresTable.userId, usersTable.id))
    .where(eq(draftScoresTable.gpId, gpId));

  const sorted = scores.sort((a, b) => Number(b.totalPoints) - Number(a.totalPoints));
  res.json(sorted.map((s, i) => ({
    userId: s.userId,
    userHandle: s.handle ?? "",
    displayName: s.displayName ?? "",
    avatarUrl: s.avatarUrl ?? null,
    totalPoints: Number(s.totalPoints),
    rank: i + 1,
  })));
});

router.get("/gps/:gpId/draft/breakdown", requireAuth, async (req, res): Promise<void> => {
  const gpId = Array.isArray(req.params.gpId) ? req.params.gpId[0] : req.params.gpId;
  const userId = req.user!.id;

  const [draft] = await db.select().from(draftsTable)
    .where(and(eq(draftsTable.gpId, gpId), eq(draftsTable.userId, userId)))
    .limit(1);

  if (!draft) {
    res.status(404).json({ error: "Draft não encontrado" });
    return;
  }

  const [score] = await db.select().from(draftScoresTable)
    .where(eq(draftScoresTable.draftId, draft.id))
    .limit(1);

  if (!score) {
    res.status(404).json({ error: "Pontuação ainda não calculada" });
    return;
  }

  const lineItems = await db.select().from(scoreLineItemsTable)
    .where(eq(scoreLineItemsTable.draftScoreId, score.id));

  res.json({
    draftId: draft.id,
    gpId,
    totalPoints: Number(score.totalPoints),
    reserveActivated: score.reserveActivated,
    lineItems: lineItems.map(l => ({
      entity: l.entity,
      entityType: l.entityType,
      event: l.event,
      points: Number(l.points),
    })),
  });
});

export default router;
