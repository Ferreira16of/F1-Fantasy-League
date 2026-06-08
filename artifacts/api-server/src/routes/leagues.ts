import { Router, type IRouter } from "express";
import { db, leaguesTable, leagueMembersTable, usersTable, seasonScoresTable } from "@workspace/db";
import { eq, and, ilike, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";
import { CreateLeagueBody, UpdateLeagueBody } from "@workspace/api-zod";

const router: IRouter = Router();

async function serializeLeague(l: typeof leaguesTable.$inferSelect) {
  const [owner] = await db.select().from(usersTable).where(eq(usersTable.id, l.ownerId)).limit(1);
  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(leagueMembersTable).where(eq(leagueMembersTable.leagueId, l.id));
  return {
    id: l.id,
    name: l.name,
    description: l.description ?? null,
    isPublic: l.isPublic,
    inviteCode: l.inviteCode,
    ownerId: l.ownerId,
    ownerHandle: owner?.handle ?? "",
    seasonId: l.seasonId,
    memberCount: Number(countResult?.count ?? 0),
    isFactory: l.isFactory,
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/leagues", async (req, res): Promise<void> => {
  const q = req.query.q as string | undefined;
  let rows = await db.select().from(leaguesTable).where(eq(leaguesTable.isPublic, true));
  if (q) {
    rows = rows.filter(l => l.name.toLowerCase().includes(q.toLowerCase()));
  }
  const result = await Promise.all(rows.map(serializeLeague));
  res.json(result);
});

router.get("/leagues/my", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const memberships = await db.select({ leagueId: leagueMembersTable.leagueId })
    .from(leagueMembersTable).where(eq(leagueMembersTable.userId, userId));
  const leagueIds = memberships.map(m => m.leagueId);
  if (leagueIds.length === 0) {
    res.json([]);
    return;
  }
  const rows = await Promise.all(leagueIds.map(async id => {
    const [l] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
    return l;
  }));
  const valid = rows.filter(Boolean) as typeof leaguesTable.$inferSelect[];
  const result = await Promise.all(valid.map(serializeLeague));
  res.json(result);
});

router.get("/leagues/factory", async (_req, res): Promise<void> => {
  const [factoryLeague] = await db.select().from(leaguesTable).where(eq(leaguesTable.isFactory, true)).limit(1);
  if (!factoryLeague) {
    res.json({ leagueId: "factory", leagueName: "Liga Fábrica", seasonId: "", entries: [] });
    return;
  }

  const members = await db.select({ userId: leagueMembersTable.userId })
    .from(leagueMembersTable).where(eq(leagueMembersTable.leagueId, factoryLeague.id));

  const entries = await Promise.all(members.map(async (m, i) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    const [score] = await db.select().from(seasonScoresTable)
      .where(and(eq(seasonScoresTable.userId, m.userId), eq(seasonScoresTable.seasonId, factoryLeague.seasonId)))
      .limit(1);
    return {
      rank: i + 1,
      userId: m.userId,
      handle: user?.handle ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      totalPoints: Number(score?.totalPoints ?? 0),
      gpCount: score?.gpCount ?? 0,
      bonusBudget: Number(user?.bonusBudget ?? 0),
    };
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((e, i) => { e.rank = i + 1; });

  res.json({
    leagueId: factoryLeague.id,
    leagueName: factoryLeague.name,
    seasonId: factoryLeague.seasonId,
    entries,
  });
});

router.get("/leagues/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Liga não encontrada" });
    return;
  }
  res.json(await serializeLeague(league));
});

router.post("/leagues", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateLeagueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const inviteCode = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
  const id = randomUUID();
  const [league] = await db.insert(leaguesTable).values({
    id,
    ...parsed.data,
    ownerId: req.user!.id,
    inviteCode,
    isFactory: false,
  }).returning();

  // Auto-join creator
  await db.insert(leagueMembersTable).values({
    id: randomUUID(),
    leagueId: id,
    userId: req.user!.id,
  });

  res.status(201).json(await serializeLeague(league));
});

router.patch("/leagues/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Liga não encontrada" });
    return;
  }
  if (league.ownerId !== req.user!.id && !req.user!.isAdmin) {
    res.status(403).json({ error: "Apenas o dono pode editar a liga" });
    return;
  }
  const parsed = UpdateLeagueBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db.update(leaguesTable).set(parsed.data).where(eq(leaguesTable.id, id)).returning();
  res.json(await serializeLeague(updated));
});

router.delete("/leagues/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Liga não encontrada" });
    return;
  }
  if (league.ownerId !== req.user!.id && !req.user!.isAdmin) {
    res.status(403).json({ error: "Apenas o dono pode excluir a liga" });
    return;
  }
  await db.delete(leagueMembersTable).where(eq(leagueMembersTable.leagueId, id));
  await db.delete(leaguesTable).where(eq(leaguesTable.id, id));
  res.sendStatus(204);
});

router.post("/leagues/:id/join", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league || !league.isPublic) {
    res.status(404).json({ error: "Liga não encontrada ou privada" });
    return;
  }
  const [existing] = await db.select().from(leagueMembersTable)
    .where(and(eq(leagueMembersTable.leagueId, id), eq(leagueMembersTable.userId, req.user!.id)))
    .limit(1);
  if (!existing) {
    await db.insert(leagueMembersTable).values({ id: randomUUID(), leagueId: id, userId: req.user!.id });
  }
  res.json({ success: true });
});

router.post("/leagues/:id/leave", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.delete(leagueMembersTable)
    .where(and(eq(leagueMembersTable.leagueId, id), eq(leagueMembersTable.userId, req.user!.id)));
  res.json({ success: true });
});

router.post("/leagues/join-by-invite/:inviteCode", requireAuth, async (req, res): Promise<void> => {
  const inviteCode = Array.isArray(req.params.inviteCode) ? req.params.inviteCode[0] : req.params.inviteCode;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.inviteCode, inviteCode)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Código de convite inválido" });
    return;
  }
  const [existing] = await db.select().from(leagueMembersTable)
    .where(and(eq(leagueMembersTable.leagueId, league.id), eq(leagueMembersTable.userId, req.user!.id)))
    .limit(1);
  if (!existing) {
    await db.insert(leagueMembersTable).values({ id: randomUUID(), leagueId: league.id, userId: req.user!.id });
  }
  res.json(await serializeLeague(league));
});

router.get("/leagues/:id/standings", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Liga não encontrada" });
    return;
  }
  const members = await db.select({ userId: leagueMembersTable.userId })
    .from(leagueMembersTable).where(eq(leagueMembersTable.leagueId, id));

  const entries = await Promise.all(members.map(async (m) => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    const [score] = await db.select().from(seasonScoresTable)
      .where(and(eq(seasonScoresTable.userId, m.userId), eq(seasonScoresTable.seasonId, league.seasonId)))
      .limit(1);
    return {
      rank: 0,
      userId: m.userId,
      handle: user?.handle ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      totalPoints: Number(score?.totalPoints ?? 0),
      gpCount: score?.gpCount ?? 0,
      bonusBudget: Number(user?.bonusBudget ?? 0),
    };
  }));

  entries.sort((a, b) => b.totalPoints - a.totalPoints);
  entries.forEach((e, i) => { e.rank = i + 1; });

  res.json({ leagueId: id, leagueName: league.name, seasonId: league.seasonId, entries });
});

router.get("/leagues/:id/members", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league) {
    res.status(404).json({ error: "Liga não encontrada" });
    return;
  }
  const members = await db.select().from(leagueMembersTable).where(eq(leagueMembersTable.leagueId, id));
  const result = await Promise.all(members.map(async m => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, m.userId)).limit(1);
    return {
      userId: m.userId,
      handle: user?.handle ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      joinedAt: m.joinedAt.toISOString(),
      isOwner: league.ownerId === m.userId,
    };
  }));
  res.json(result);
});

router.delete("/leagues/:id/kick/:userId", requireAuth, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const targetUserId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const [league] = await db.select().from(leaguesTable).where(eq(leaguesTable.id, id)).limit(1);
  if (!league || (league.ownerId !== req.user!.id && !req.user!.isAdmin)) {
    res.status(403).json({ error: "Acesso negado" });
    return;
  }
  await db.delete(leagueMembersTable)
    .where(and(eq(leagueMembersTable.leagueId, id), eq(leagueMembersTable.userId, targetUserId)));
  res.sendStatus(204);
});

export default router;
