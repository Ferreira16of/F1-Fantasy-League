import { db, scoringRulesTable, driverResultsTable, pitStopResultsTable, teamStandingResultsTable, draftsTable, draftScoresTable, scoreLineItemsTable, driversTable, constructorTeamsTable, seasonScoresTable, grandPrixTable, seasonsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "./logger";
import { randomUUID } from "crypto";

export async function getOrCreateScoringRules() {
  const [existing] = await db.select().from(scoringRulesTable).limit(1);
  if (existing) return existing;

  const defaultRules = {
    id: randomUUID(),
    racePoints: { "1": 25, "2": 18, "3": 15, "4": 12, "5": 10, "6": 8, "7": 6, "8": 4, "9": 2, "10": 1 },
    qualiPoints: { "1": 10, "2": 7, "3": 5, "4": 3, "5": 2, "6": 1 },
    sprintPoints: { "1": 8, "2": 7, "3": 6, "4": 5, "5": 4, "6": 3, "7": 2, "8": 1 },
    fastestLapPoints: "5",
    polePoints: "10",
    dnfPenalty: "-10",
    overtakePoints: "1",
    crashPenalty: "-5",
    pitStopTopPoints: "5",
    pitStopBottomPenalty: "-3",
    constructorTopPoints: "10",
    constructorBottomPenalty: "-5",
  };

  const [rules] = await db.insert(scoringRulesTable).values(defaultRules).returning();
  return rules;
}

export async function calculateDraftScore(draftId: string, gpId: string): Promise<void> {
  const rules = await getOrCreateScoringRules();

  const [draft] = await db.select().from(draftsTable).where(eq(draftsTable.id, draftId)).limit(1);
  if (!draft) {
    logger.warn({ draftId }, "Draft not found for scoring");
    return;
  }

  const driverIds = [draft.driver1Id, draft.driver2Id, draft.driver3Id];
  if (draft.reserveDriverId) driverIds.push(draft.reserveDriverId);

  const raceResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, gpId), eq(driverResultsTable.sessionType, "race")));

  const qualiResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, gpId), eq(driverResultsTable.sessionType, "quali")));

  const sprintResults = await db.select().from(driverResultsTable)
    .where(and(eq(driverResultsTable.gpId, gpId), eq(driverResultsTable.sessionType, "sprint")));

  const pitStops = await db.select().from(pitStopResultsTable).where(eq(pitStopResultsTable.gpId, gpId));
  const teamStandings = await db.select().from(teamStandingResultsTable).where(eq(teamStandingResultsTable.gpId, gpId));

  const lineItems: Array<{ entity: string; entityType: string; event: string; points: number }> = [];

  const racePointsMap = rules.racePoints as Record<string, number>;
  const qualiPointsMap = rules.qualiPoints as Record<string, number>;
  const sprintPointsMap = rules.sprintPoints as Record<string, number>;

  const mainDriverIds = [draft.driver1Id, draft.driver2Id, draft.driver3Id];

  // Check if any main driver DNF'd to potentially activate reserve
  let reserveActivated = false;
  if (draft.reserveDriverId) {
    const dnfDrivers = raceResults.filter(r => mainDriverIds.includes(r.driverId) && r.dnf);
    if (dnfDrivers.length > 0) {
      reserveActivated = true;
    }
  }

  const activeDriverIds = reserveActivated && draft.reserveDriverId
    ? mainDriverIds.filter(id => {
        const result = raceResults.find(r => r.driverId === id);
        return !result?.dnf;
      }).concat([draft.reserveDriverId])
    : mainDriverIds;

  // Score each active driver
  for (const driverId of activeDriverIds) {
    const [driverRow] = await db.select().from(driversTable).where(eq(driversTable.id, driverId)).limit(1);
    const driverName = driverRow?.shortName ?? driverRow?.name ?? driverId;
    const entityType = draft.reserveDriverId === driverId && reserveActivated ? "reserve_driver" : "driver";

    // Race
    const raceResult = raceResults.find(r => r.driverId === driverId);
    if (raceResult) {
      if (raceResult.position != null && !raceResult.dnf) {
        const pts = racePointsMap[String(raceResult.position)] ?? 0;
        if (pts) lineItems.push({ entity: driverName, entityType, event: `Corrida P${raceResult.position}`, points: pts });
      }
      if (raceResult.fastestLap) lineItems.push({ entity: driverName, entityType, event: "Volta Rápida", points: Number(rules.fastestLapPoints) });
      if (raceResult.dnf) {
        const penalty = raceResult.dnfReason?.toLowerCase().includes("acidente") || raceResult.dnfReason?.toLowerCase().includes("crash")
          ? Number(rules.crashPenalty)
          : Number(rules.dnfPenalty);
        lineItems.push({ entity: driverName, entityType, event: "DNF", points: penalty });
      }
      if (raceResult.overtakes && raceResult.overtakes > 0) {
        lineItems.push({ entity: driverName, entityType, event: `${raceResult.overtakes} Ultrapassagens`, points: raceResult.overtakes * Number(rules.overtakePoints) });
      }
    }

    // Quali
    const qualiResult = qualiResults.find(r => r.driverId === driverId);
    if (qualiResult) {
      if (qualiResult.pole) lineItems.push({ entity: driverName, entityType, event: "Pole Position", points: Number(rules.polePoints) });
      else if (qualiResult.position != null) {
        const pts = qualiPointsMap[String(qualiResult.position)] ?? 0;
        if (pts) lineItems.push({ entity: driverName, entityType, event: `Quali P${qualiResult.position}`, points: pts });
      }
    }

    // Sprint
    const sprintResult = sprintResults.find(r => r.driverId === driverId);
    if (sprintResult && sprintResult.position != null && !sprintResult.dnf) {
      const pts = sprintPointsMap[String(sprintResult.position)] ?? 0;
      if (pts) lineItems.push({ entity: driverName, entityType, event: `Sprint P${sprintResult.position}`, points: pts });
    }
  }

  // Score constructor team
  const [teamRow] = await db.select().from(constructorTeamsTable).where(eq(constructorTeamsTable.id, draft.constructorTeamId)).limit(1);
  const teamName = teamRow?.shortName ?? teamRow?.name ?? draft.constructorTeamId;
  const totalTeams = teamStandings.length;

  const teamStanding = teamStandings.find(t => t.constructorTeamId === draft.constructorTeamId);
  if (teamStanding && totalTeams > 0) {
    const topThreshold = Math.ceil(totalTeams / 3);
    const bottomThreshold = totalTeams - Math.ceil(totalTeams / 3);
    if (teamStanding.position <= topThreshold) {
      lineItems.push({ entity: teamName, entityType: "constructor_team", event: `Equipe P${teamStanding.position}`, points: Number(rules.constructorTopPoints) });
    } else if (teamStanding.position >= bottomThreshold) {
      lineItems.push({ entity: teamName, entityType: "constructor_team", event: `Equipe P${teamStanding.position}`, points: Number(rules.constructorBottomPenalty) });
    }
  }

  // Score pit stops for the constructor team
  const totalPits = pitStops.length;
  if (totalPits > 0) {
    const topPitThreshold = Math.ceil(totalPits * 0.3);
    const bottomPitThreshold = totalPits - Math.ceil(totalPits * 0.3);
    const teamPits = pitStops.filter(p => p.constructorTeamId === draft.constructorTeamId);
    for (const pit of teamPits) {
      if (pit.rank <= topPitThreshold) {
        lineItems.push({ entity: teamName, entityType: "constructor_team", event: `Pit Rápido #${pit.rank}`, points: Number(rules.pitStopTopPoints) });
      } else if (pit.rank >= bottomPitThreshold) {
        lineItems.push({ entity: teamName, entityType: "constructor_team", event: `Pit Lento #${pit.rank}`, points: Number(rules.pitStopBottomPenalty) });
      }
    }
  }

  const totalPoints = lineItems.reduce((sum, item) => sum + item.points, 0);

  // Delete existing score for this draft
  await db.delete(draftScoresTable).where(eq(draftScoresTable.draftId, draftId));

  // Insert new draft score
  const scoreId = randomUUID();
  await db.insert(draftScoresTable).values({
    id: scoreId,
    draftId,
    userId: draft.userId,
    gpId,
    totalPoints: String(totalPoints),
    reserveActivated,
  });

  // Insert line items
  for (const item of lineItems) {
    await db.insert(scoreLineItemsTable).values({
      id: randomUUID(),
      draftScoreId: scoreId,
      entity: item.entity,
      entityType: item.entityType,
      event: item.event,
      points: String(item.points),
    });
  }

  // Update season score
  const [gp] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, gpId)).limit(1);
  if (gp) {
    const existing = await db.select().from(seasonScoresTable)
      .where(and(eq(seasonScoresTable.userId, draft.userId), eq(seasonScoresTable.seasonId, gp.seasonId)))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(seasonScoresTable).values({
        id: randomUUID(),
        userId: draft.userId,
        seasonId: gp.seasonId,
        totalPoints: String(totalPoints),
        gpCount: 1,
      });
    } else {
      await db.update(seasonScoresTable)
        .set({
          totalPoints: sql`${seasonScoresTable.totalPoints} + ${totalPoints}`,
          gpCount: sql`${seasonScoresTable.gpCount} + 1`,
        })
        .where(and(eq(seasonScoresTable.userId, draft.userId), eq(seasonScoresTable.seasonId, gp.seasonId)));
    }
  }

  logger.info({ draftId, gpId, totalPoints, lineItems: lineItems.length }, "Draft scored");
}
