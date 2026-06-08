import { Router, type IRouter } from "express";
import { db, usersTable, leaguesTable, draftsTable, seasonsTable, grandPrixTable, draftScoresTable, draftsTable as drafts, scoringRulesTable } from "@workspace/db";
import { eq, ilike, desc, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../lib/auth";
import { UpdateScoringRulesBody } from "@workspace/api-zod";
import { calculateDraftScore, getOrCreateScoringRules } from "../lib/scoring";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: totalLeagues }] = await db.select({ count: sql<number>`count(*)` }).from(leaguesTable);
  const [{ count: totalDrafts }] = await db.select({ count: sql<number>`count(*)` }).from(draftsTable);

  const [activeSeason] = await db.select().from(seasonsTable).where(eq(seasonsTable.isActive, true)).limit(1);
  const now = new Date().toISOString().split("T")[0];
  const [nextGP] = await db.select().from(grandPrixTable)
    .where(eq(grandPrixTable.status, "upcoming"))
    .orderBy(grandPrixTable.raceDate)
    .limit(1);

  res.json({
    totalUsers: Number(totalUsers),
    totalLeagues: Number(totalLeagues),
    totalDrafts: Number(totalDrafts),
    activeSeason: activeSeason?.name ?? null,
    upcomingGP: nextGP?.name ?? null,
    lastSyncedAt: null,
  });
});

router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  const page = parseInt(req.query.page as string ?? "1", 10);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  let rows = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  if (q) {
    rows = rows.filter(u => u.email.includes(q) || u.handle.includes(q) || u.displayName.includes(q));
  }

  const total = rows.length;
  const paginated = rows.slice(offset, offset + pageSize);

  res.json({
    users: paginated.map(u => ({
      id: u.id,
      email: u.email,
      handle: u.handle,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl ?? null,
      budget: Number(u.budget),
      bonusBudget: Number(u.bonusBudget),
      isAdmin: u.isAdmin,
      createdAt: u.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  });
});

router.get("/admin/scoring-rules", requireAdmin, async (_req, res): Promise<void> => {
  const rules = await getOrCreateScoringRules();
  res.json({
    id: rules.id,
    racePoints: rules.racePoints,
    qualiPoints: rules.qualiPoints,
    sprintPoints: rules.sprintPoints,
    fastestLapPoints: Number(rules.fastestLapPoints),
    polePoints: Number(rules.polePoints),
    dnfPenalty: Number(rules.dnfPenalty),
    overtakePoints: Number(rules.overtakePoints),
    crashPenalty: Number(rules.crashPenalty),
    pitStopTopPoints: Number(rules.pitStopTopPoints),
    pitStopBottomPenalty: Number(rules.pitStopBottomPenalty),
    constructorTopPoints: Number(rules.constructorTopPoints),
    constructorBottomPenalty: Number(rules.constructorBottomPenalty),
    updatedAt: rules.updatedAt.toISOString(),
  });
});

router.put("/admin/scoring-rules", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateScoringRulesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await getOrCreateScoringRules();
  const data: Record<string, unknown> = {};
  if (parsed.data.racePoints != null) data.racePoints = parsed.data.racePoints;
  if (parsed.data.qualiPoints != null) data.qualiPoints = parsed.data.qualiPoints;
  if (parsed.data.sprintPoints != null) data.sprintPoints = parsed.data.sprintPoints;
  if (parsed.data.fastestLapPoints != null) data.fastestLapPoints = String(parsed.data.fastestLapPoints);
  if (parsed.data.polePoints != null) data.polePoints = String(parsed.data.polePoints);
  if (parsed.data.dnfPenalty != null) data.dnfPenalty = String(parsed.data.dnfPenalty);
  if (parsed.data.overtakePoints != null) data.overtakePoints = String(parsed.data.overtakePoints);
  if (parsed.data.crashPenalty != null) data.crashPenalty = String(parsed.data.crashPenalty);
  if (parsed.data.pitStopTopPoints != null) data.pitStopTopPoints = String(parsed.data.pitStopTopPoints);
  if (parsed.data.pitStopBottomPenalty != null) data.pitStopBottomPenalty = String(parsed.data.pitStopBottomPenalty);
  if (parsed.data.constructorTopPoints != null) data.constructorTopPoints = String(parsed.data.constructorTopPoints);
  if (parsed.data.constructorBottomPenalty != null) data.constructorBottomPenalty = String(parsed.data.constructorBottomPenalty);

  const [updated] = await db.update(scoringRulesTable).set(data).where(eq(scoringRulesTable.id, existing.id)).returning();
  res.json({
    id: updated.id,
    racePoints: updated.racePoints,
    qualiPoints: updated.qualiPoints,
    sprintPoints: updated.sprintPoints,
    fastestLapPoints: Number(updated.fastestLapPoints),
    polePoints: Number(updated.polePoints),
    dnfPenalty: Number(updated.dnfPenalty),
    overtakePoints: Number(updated.overtakePoints),
    crashPenalty: Number(updated.crashPenalty),
    pitStopTopPoints: Number(updated.pitStopTopPoints),
    pitStopBottomPenalty: Number(updated.pitStopBottomPenalty),
    constructorTopPoints: Number(updated.constructorTopPoints),
    constructorBottomPenalty: Number(updated.constructorBottomPenalty),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.post("/admin/recalculate/:gpId", requireAdmin, async (req, res): Promise<void> => {
  const gpId = Array.isArray(req.params.gpId) ? req.params.gpId[0] : req.params.gpId;
  const allDrafts = await db.select().from(draftsTable).where(eq(drafts.gpId, gpId));
  let updatedCount = 0;
  for (const draft of allDrafts) {
    try {
      await calculateDraftScore(draft.id, gpId);
      updatedCount++;
    } catch (err) {
      logger.error({ err, draftId: draft.id }, "Failed to recalculate score");
    }
  }
  res.json({ success: true, message: `${updatedCount} drafts recalculados`, updatedCount });
});

export default router;
