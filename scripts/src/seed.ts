import { db, usersTable, seasonsTable, grandPrixTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function seed() {
  console.log("🌱 Seeding database...");

  // ── 1. Season 2026 ────────────────────────────────────────────────────────
  const seasonId = "season-2026";
  const [existingSeason] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, seasonId)).limit(1);
  if (!existingSeason) {
    await db.insert(seasonsTable).values({
      id: seasonId,
      year: 2026,
      name: "Temporada 2026",
      baseBudget: "100",
      isActive: true,
    });
    console.log("✅ Season 2026 created");
  } else {
    console.log("⏭️  Season 2026 already exists");
  }

  // ── 2. Grand Prix calendar 2026 ────────────────────────────────────────────
  const gps = [
    // Past GPs (completed)
    { id: "gp-2026-01", round: 1,  name: "Grande Prêmio da Austrália",    country: "Australia",     circuitName: "Albert Park Circuit",        raceDate: "2026-03-08", draftLockTime: "2026-03-07T02:30:00Z", status: "completed", hasSprint: false, openf1MeetingKey: 1279 },
    { id: "gp-2026-02", round: 2,  name: "Grande Prêmio da China",         country: "China",         circuitName: "Shanghai International Circuit", raceDate: "2026-03-15", draftLockTime: "2026-03-14T03:30:00Z", status: "completed", hasSprint: true,  openf1MeetingKey: 1280 },
    { id: "gp-2026-03", round: 3,  name: "Grande Prêmio do Japão",         country: "Japan",         circuitName: "Suzuka International Racing Course", raceDate: "2026-03-29", draftLockTime: "2026-03-28T02:30:00Z", status: "completed", hasSprint: false, openf1MeetingKey: 1281 },
    { id: "gp-2026-04", round: 4,  name: "Grande Prêmio de Miami",         country: "United States", circuitName: "Miami International Autodrome",  raceDate: "2026-05-03", draftLockTime: "2026-05-02T16:00:00Z", status: "completed", hasSprint: true,  openf1MeetingKey: 1284 },
    { id: "gp-2026-05", round: 5,  name: "Grande Prêmio do Canadá",        country: "Canada",        circuitName: "Circuit Gilles Villeneuve",      raceDate: "2026-05-24", draftLockTime: "2026-05-23T16:30:00Z", status: "completed", hasSprint: false, openf1MeetingKey: 1285 },
    { id: "gp-2026-06", round: 6,  name: "Grande Prêmio de Mônaco",        country: "Monaco",        circuitName: "Circuit de Monaco",              raceDate: "2026-06-07", draftLockTime: "2026-06-06T11:30:00Z", status: "completed", hasSprint: false, openf1MeetingKey: 1286 },
    // Upcoming GPs
    { id: "gp-2026-07", round: 7,  name: "Grande Prêmio da Espanha",       country: "Spain",         circuitName: "Circuit de Barcelona-Catalunya", raceDate: "2026-06-14", draftLockTime: "2026-06-13T10:00:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1287 },
    { id: "gp-2026-08", round: 8,  name: "Grande Prêmio da Áustria",       country: "Austria",       circuitName: "Red Bull Ring",                  raceDate: "2026-06-28", draftLockTime: "2026-06-27T10:00:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1288 },
    { id: "gp-2026-09", round: 9,  name: "Grande Prêmio da Grã-Bretanha",  country: "United Kingdom","circuitName": "Silverstone Circuit",           raceDate: "2026-07-05", draftLockTime: "2026-07-04T10:00:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1289 },
    { id: "gp-2026-10", round: 10, name: "Grande Prêmio da Bélgica",       country: "Belgium",       circuitName: "Circuit de Spa-Francorchamps",   raceDate: "2026-07-19", draftLockTime: "2026-07-18T10:00:00Z", status: "upcoming",  hasSprint: true,  openf1MeetingKey: 1290 },
    { id: "gp-2026-11", round: 11, name: "Grande Prêmio da Hungria",       country: "Hungary",       circuitName: "Hungaroring",                    raceDate: "2026-07-26", draftLockTime: "2026-07-25T10:00:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1291 },
    { id: "gp-2026-12", round: 12, name: "Grande Prêmio da Holanda",       country: "Netherlands",   circuitName: "Circuit Zandvoort",              raceDate: "2026-08-23", draftLockTime: "2026-08-22T09:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1292 },
    { id: "gp-2026-13", round: 13, name: "Grande Prêmio da Itália",        country: "Italy",         circuitName: "Autodromo Nazionale Monza",      raceDate: "2026-09-06", draftLockTime: "2026-09-05T09:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1293 },
    { id: "gp-2026-14", round: 14, name: "Grande Prêmio de Madrid",        country: "Spain",         circuitName: "IFEMA Madrid Street Circuit",    raceDate: "2026-09-13", draftLockTime: "2026-09-12T10:00:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1294 },
    { id: "gp-2026-15", round: 15, name: "Grande Prêmio do Azerbaijão",    country: "Azerbaijan",    circuitName: "Baku City Circuit",              raceDate: "2026-09-26", draftLockTime: "2026-09-25T07:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1295 },
    { id: "gp-2026-16", round: 16, name: "Grande Prêmio de Singapura",     country: "Singapore",     circuitName: "Marina Bay Street Circuit",      raceDate: "2026-10-11", draftLockTime: "2026-10-10T07:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1296 },
    { id: "gp-2026-17", round: 17, name: "Grande Prêmio dos Estados Unidos","country": "United States","circuitName": "Circuit of the Americas",     raceDate: "2026-10-25", draftLockTime: "2026-10-24T16:30:00Z", status: "upcoming",  hasSprint: true,  openf1MeetingKey: 1297 },
    { id: "gp-2026-18", round: 18, name: "Grande Prêmio do México",        country: "Mexico",        circuitName: "Autódromo Hermanos Rodríguez",   raceDate: "2026-11-01", draftLockTime: "2026-10-31T17:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1298 },
    { id: "gp-2026-19", round: 19, name: "Grande Prêmio de São Paulo",     country: "Brazil",        circuitName: "Autódromo José Carlos Pace",     raceDate: "2026-11-08", draftLockTime: "2026-11-07T14:30:00Z", status: "upcoming",  hasSprint: true,  openf1MeetingKey: 1299 },
    { id: "gp-2026-20", round: 20, name: "Grande Prêmio de Las Vegas",     country: "United States", circuitName: "Las Vegas Strip Circuit",        raceDate: "2026-11-22", draftLockTime: "2026-11-21T23:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1300 },
    { id: "gp-2026-21", round: 21, name: "Grande Prêmio do Catar",         country: "Qatar",         circuitName: "Losail International Circuit",   raceDate: "2026-11-29", draftLockTime: "2026-11-28T12:30:00Z", status: "upcoming",  hasSprint: true,  openf1MeetingKey: 1301 },
    { id: "gp-2026-22", round: 22, name: "Grande Prêmio de Abu Dhabi",     country: "UAE",           circuitName: "Yas Marina Circuit",             raceDate: "2026-12-06", draftLockTime: "2026-12-05T08:30:00Z", status: "upcoming",  hasSprint: false, openf1MeetingKey: 1302 },
  ];

  for (const gp of gps) {
    const [existing] = await db.select().from(grandPrixTable).where(eq(grandPrixTable.id, gp.id)).limit(1);
    if (!existing) {
      await db.insert(grandPrixTable).values({
        ...gp,
        seasonId,
        status: gp.status as any,
      });
      console.log(`  ✅ Round ${gp.round}: ${gp.name}`);
    } else {
      console.log(`  ⏭️  Round ${gp.round}: ${gp.name} already exists`);
    }
  }

  // ── 3. Admin user ─────────────────────────────────────────────────────────
  const adminEmail = "thony.ferreira.az@gmail.com";
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, adminEmail)).limit(1);
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("AlgumaSenha12345", 10);
    await db.insert(usersTable).values({
      id: randomUUID(),
      email: adminEmail,
      handle: "thonyf",
      displayName: "Thony Ferreira",
      passwordHash,
      budget: "100",
      bonusBudget: "0",
      isAdmin: true,
    });
    console.log("✅ Admin user created");
  } else {
    // Ensure isAdmin is true
    await db.update(usersTable).set({ isAdmin: true }).where(eq(usersTable.email, adminEmail));
    console.log("✅ Admin user updated (isAdmin=true)");
  }

  console.log("\n🏁 Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
