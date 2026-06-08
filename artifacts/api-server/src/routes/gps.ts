import { Router, type IRouter } from "express";
import { db, grandPrixTable, driverResultsTable, pitStopResultsTable, teamStandingResultsTable, driversTable, constructorTeamsTable } from "@workspace/db";
import { eq, and, asc, lte, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAdmin } from "../lib/auth";
import { CreateGPBody, UpdateGPBody, UpsertGPResultsBody } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { getSessionsForMeeting, getPitStopsForSession, getPositionsForSession, getDriversForSession } from "../lib/openf1";

const router: IRouter = Router();

function serializeGP(gp: typeof grandPrixTable.$inferSelect) {
  return {
    id: gp.id,
    seasonId: gp.seasonId,
    name: gp.name,
    round: gp.round,
    country: gp.country,
    circuitName: gp.circuitName,
    raceDate: gp.raceDate,
    hasSprint: gp.hasSprint,
    draftLockTime: gp.draftLockTime,
    status: gp.status,
    openf1MeetingKey: gp.openf1MeetingKey ?? null,
    createdAt: gp.createdAt.toISOString(),
  };
}

router.get("/seasons/:seasonId/gps", async (req, res): Promise<void> => {
  const seasonId = Array.isArray(req.params.seasonId) ? req.params.seasonId[0] : req.params.seasonId;
  const gps = await db.select().from(grandPrixTable)
    .where(eq(grandPrixTable.seasonId, seasonId))
    .orderBy(asc(grandPrixTable.round));
  res.json(gps.map(serializeGP));
});

router.post("/seasons/:seasonId/gps", requireAdmin, async (req, res): Promise<void> => {
  const seasonId = Array.isArray(req.params.seasonId) ? req.params.seasonId[0] : req.params.seasonId;
  const parsed = CreateGPBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [gp] = await db.insert(grandPrixTable).values({
    id: randomUUID(),
    seasonId,
    ...parsed.data,
    hasSprint: parsed.data.hasSprint ?? false,
    openf1MeetingKey: parsed.data.openf1MeetingKey ?? null,
  }).returning();
  res.status(201).json(serializeGP(gp));
});

router.get("/gps/next", async (_req, res): Promise<void> => {
  const now = new Date().toISOString();
  const [gp] = await db.select().from(grandPrixTable)
    .where(gte(grandPrixTable.raceDate, now.split("T")[0]))
    .orderBy(asc(grandPrixTable.raceDate))
    .limit(1);
  if (!gp) {
    res.status(404).json({ error: "Nenhum GP encontrado" });
    return;
  }
  res.json(serializeGP(gp));
});

router.get("/gps/:id", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [gp] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, id)).limit(1);
  if (!gp) {
    res.status(404).json({ error: "GP não encontrado" });
    return;
  }
  res.json(serializeGP(gp));
});

router.patch("/gps/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpdateGPBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [gp] = await db.update(grandPrixTable).set(parsed.data).where(eq(grandPrixTable.id, id)).returning();
  if (!gp) {
    res.status(404).json({ error: "GP não encontrado" });
    return;
  }
  res.json(serializeGP(gp));
});

router.get("/gps/:id/results", async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const raceResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, id), eq(driverResultsTable.sessionType, "race")));
  const qualiResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, id), eq(driverResultsTable.sessionType, "quali")));
  const sprintResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, id), eq(driverResultsTable.sessionType, "sprint")));
  const pitStops = await db.select().from(pitStopResultsTable).where(eq(pitStopResultsTable.gpId, id));
  const teamStandings = await db.select().from(teamStandingResultsTable).where(eq(teamStandingResultsTable.gpId, id));

  const serializeDriverResult = (r: typeof driverResultsTable.$inferSelect) => ({
    driverId: r.driverId,
    position: r.position ?? null,
    fastestLap: r.fastestLap,
    pole: r.pole,
    dnf: r.dnf,
    dnfReason: r.dnfReason ?? null,
    overtakes: r.overtakes ?? null,
    gridPosition: r.gridPosition ?? null,
  });

  res.json({
    gpId: id,
    raceResults: raceResults.map(serializeDriverResult),
    qualiResults: qualiResults.map(serializeDriverResult),
    sprintResults: sprintResults.map(serializeDriverResult),
    pitStopResults: pitStops.map(p => ({
      constructorTeamId: p.constructorTeamId,
      pitDurationMs: p.pitDurationMs,
      rank: p.rank,
      isNegative: p.isNegative,
    })),
    teamStandingResults: teamStandings.map(t => ({
      constructorTeamId: t.constructorTeamId,
      position: t.position,
    })),
  });
});

router.post("/gps/:id/results", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const parsed = UpsertGPResultsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  await db.delete(driverResultsTable).where(eq(driverResultsTable.gpId, id));
  await db.delete(pitStopResultsTable).where(eq(pitStopResultsTable.gpId, id));
  await db.delete(teamStandingResultsTable).where(eq(teamStandingResultsTable.gpId, id));

  const insertDriverResults = async (results: typeof parsed.data.raceResults, sessionType: string) => {
    if (!results || results.length === 0) return;
    for (const r of results) {
      await db.insert(driverResultsTable).values({
        id: randomUUID(),
        gpId: id,
        driverId: r.driverId,
        sessionType,
        position: r.position ?? null,
        fastestLap: r.fastestLap ?? false,
        pole: r.pole ?? false,
        dnf: r.dnf ?? false,
        dnfReason: r.dnfReason ?? null,
        overtakes: r.overtakes ?? null,
        gridPosition: r.gridPosition ?? null,
      });
    }
  };

  await insertDriverResults(parsed.data.raceResults, "race");
  await insertDriverResults(parsed.data.qualiResults, "quali");
  await insertDriverResults(parsed.data.sprintResults, "sprint");

  if (parsed.data.pitStopResults && parsed.data.pitStopResults.length > 0) {
    for (const p of parsed.data.pitStopResults) {
      await db.insert(pitStopResultsTable).values({
        id: randomUUID(),
        gpId: id,
        constructorTeamId: p.constructorTeamId,
        pitDurationMs: p.pitDurationMs,
        rank: p.rank,
        isNegative: p.isNegative ?? false,
      });
    }
  }

  if (parsed.data.teamStandingResults && parsed.data.teamStandingResults.length > 0) {
    for (const t of parsed.data.teamStandingResults) {
      await db.insert(teamStandingResultsTable).values({
        id: randomUUID(),
        gpId: id,
        constructorTeamId: t.constructorTeamId,
        position: t.position,
      });
    }
  }

  res.json({ success: true });
});

router.post("/gps/:id/sync", requireAdmin, async (req, res): Promise<void> => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [gp] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, id)).limit(1);
  if (!gp || !gp.openf1MeetingKey) {
    res.status(400).json({ success: false, message: "GP sem openf1MeetingKey configurado" });
    return;
  }

  try {
    const sessions = await getSessionsForMeeting(gp.openf1MeetingKey);
    let updatedCount = 0;

    for (const session of sessions) {
      const sessionTypeLower = session.session_name.toLowerCase();
      let sessionType = "";
      if (sessionTypeLower.includes("race") || sessionTypeLower.includes("corrida")) sessionType = "race";
      else if (sessionTypeLower.includes("qualifying") || sessionTypeLower.includes("qualificação")) sessionType = "quali";
      else if (sessionTypeLower.includes("sprint")) sessionType = "sprint";
      else continue;

      const positions = await getPositionsForSession(session.session_key);
      const pitStops = sessionType === "race" ? await getPitStopsForSession(session.session_key) : [];
      const driversInSession = await getDriversForSession(session.session_key);

      // Get last position per driver
      const lastPositionByDriver: Record<number, number> = {};
      for (const pos of positions) {
        lastPositionByDriver[pos.driver_number] = pos.position;
      }

      // Get pit stops ranked
      const pitDurationByTeam: Record<string, number[]> = {};
      for (const pit of pitStops) {
        const driver = driversInSession.find(d => d.driver_number === pit.driver_number);
        if (!driver) continue;
        const teamName = driver.team_name;
        if (!pitDurationByTeam[teamName]) pitDurationByTeam[teamName] = [];
        if (pit.pit_duration) pitDurationByTeam[teamName].push(pit.pit_duration * 1000);
      }

      // Map driver numbers to DB driver IDs
      const dbDrivers = await db.select().from(driversTable).where(eq(driversTable.seasonId, gp.seasonId));
      const dbTeams = await db.select().from(constructorTeamsTable).where(eq(constructorTeamsTable.seasonId, gp.seasonId));

      await db.delete(driverResultsTable)
        .where(and(eq(driverResultsTable.gpId, id), eq(driverResultsTable.sessionType, sessionType)));

      for (const driver of driversInSession) {
        const dbDriver = dbDrivers.find(d => d.number === driver.driver_number);
        if (!dbDriver) continue;
        const pos = lastPositionByDriver[driver.driver_number];
        await db.insert(driverResultsTable).values({
          id: randomUUID(),
          gpId: id,
          driverId: dbDriver.id,
          sessionType,
          position: pos ?? null,
          fastestLap: false,
          pole: sessionType === "quali" ? pos === 1 : false,
          dnf: false,
          overtakes: null,
          gridPosition: null,
        });
        updatedCount++;
      }

      // Insert pit stop results
      if (sessionType === "race" && Object.keys(pitDurationByTeam).length > 0) {
        await db.delete(pitStopResultsTable).where(eq(pitStopResultsTable.gpId, id));

        const allPits: Array<{ teamId: string; durationMs: number }> = [];
        for (const [teamName, durations] of Object.entries(pitDurationByTeam)) {
          const dbTeam = dbTeams.find(t => t.name.toLowerCase().includes(teamName.toLowerCase()) || teamName.toLowerCase().includes(t.shortName.toLowerCase()));
          if (!dbTeam) continue;
          for (const d of durations) {
            allPits.push({ teamId: dbTeam.id, durationMs: d });
          }
        }
        allPits.sort((a, b) => a.durationMs - b.durationMs);
        for (let i = 0; i < allPits.length; i++) {
          const isNegative = i >= allPits.length - Math.ceil(allPits.length * 0.3);
          await db.insert(pitStopResultsTable).values({
            id: randomUUID(),
            gpId: id,
            constructorTeamId: allPits[i].teamId,
            pitDurationMs: allPits[i].durationMs,
            rank: i + 1,
            isNegative,
          });
        }
      }
    }

    res.json({ success: true, message: "Dados sincronizados com sucesso", updatedCount });
  } catch (err) {
    logger.error({ err, gpId: id }, "OpenF1 sync failed");
    res.status(500).json({ success: false, message: `Erro ao sincronizar: ${String(err)}` });
  }
});

export default router;
