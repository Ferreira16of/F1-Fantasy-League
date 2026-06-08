import { Router, type IRouter } from "express";
import { db, seasonScoresTable, usersTable, grandPrixTable, draftScoresTable, draftsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/scores/global", requireAuth, async (req, res): Promise<void> => {
  const seasonId = req.query.seasonId as string | undefined;
  let rows;
  if (seasonId) {
    rows = await db.select().from(seasonScoresTable).where(eq(seasonScoresTable.seasonId, seasonId));
  } else {
    rows = await db.select().from(seasonScoresTable);
  }

  const entries = await Promise.all(rows.map(async s => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, s.userId)).limit(1);
    return {
      rank: 0,
      userId: s.userId,
      handle: user?.handle ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      totalPoints: Number(s.totalPoints),
      gpCount: s.gpCount,
      bonusBudget: Number(user?.bonusBudget ?? 0),
    };
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((e, i) => { e.rank = i + 1; });
  res.json(entries);
});

router.get("/scores/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const seasonId = req.query.seasonId as string | undefined;

  let seasonScore;
  if (seasonId) {
    [seasonScore] = await db.select().from(seasonScoresTable)
      .where(and(eq(seasonScoresTable.userId, userId), eq(seasonScoresTable.seasonId, seasonId)))
      .limit(1);
  } else {
    [seasonScore] = await db.select().from(seasonScoresTable)
      .where(eq(seasonScoresTable.userId, userId))
      .orderBy(desc(seasonScoresTable.updatedAt))
      .limit(1);
  }

  // Get rank
  const allScores = seasonScore
    ? await db.select().from(seasonScoresTable).where(eq(seasonScoresTable.seasonId, seasonScore.seasonId))
    : [];
  const sorted = allScores.sort((a, b) => Number(b.totalPoints) - Number(a.totalPoints));
  const rank = sorted.findIndex(s => s.userId === userId) + 1;

  // GP breakdown
  const allDraftScores = await db.select({
    gpId: draftScoresTable.gpId,
    totalPoints: draftScoresTable.totalPoints,
  })
    .from(draftScoresTable)
    .where(eq(draftScoresTable.userId, userId));

  const gpBreakdown = await Promise.all(allDraftScores.map(async ds => {
    const [gp] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, ds.gpId)).limit(1);
    // Get rank for this GP
    const gpScores = await db.select().from(draftScoresTable).where(eq(draftScoresTable.gpId, ds.gpId));
    const gpSorted = gpScores.sort((a, b) => Number(b.totalPoints) - Number(a.totalPoints));
    const gpRank = gpSorted.findIndex(s => s.userId === userId) + 1;
    return {
      gpId: ds.gpId,
      gpName: gp?.name ?? "",
      round: gp?.round ?? 0,
      points: Number(ds.totalPoints),
      rank: gpRank,
    };
  }));

  res.json({
    userId,
    seasonId: seasonScore?.seasonId ?? "",
    totalPoints: Number(seasonScore?.totalPoints ?? 0),
    rank: rank || 0,
    totalUsers: allScores.length,
    budget: Number(req.user!.budget),
    bonusBudget: Number(req.user!.bonusBudget),
    gpBreakdown: gpBreakdown.sort((a, b) => a.round - b.round),
  });
});

router.get("/scores/gp/:gpId", requireAuth, async (req, res): Promise<void> => {
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
    rank: i + 1,
    userId: s.userId,
    handle: s.handle ?? "",
    displayName: s.displayName ?? "",
    avatarUrl: s.avatarUrl ?? null,
    totalPoints: Number(s.totalPoints),
    gpCount: 1,
    bonusBudget: 0,
  })));
});

export default router;
