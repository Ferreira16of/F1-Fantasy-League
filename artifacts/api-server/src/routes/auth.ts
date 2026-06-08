import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { signToken, requireAuth } from "../lib/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, handle, displayName } = parsed.data;

  const [existing] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "E-mail já cadastrado" });
    return;
  }

  const [existingHandle] = await db.select().from(usersTable)
    .where(eq(usersTable.handle, handle)).limit(1);
  if (existingHandle) {
    res.status(400).json({ error: "Handle já em uso" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const id = randomUUID();

  const [user] = await db.insert(usersTable).values({
    id,
    email,
    handle,
    displayName,
    passwordHash,
    budget: "100",
    bonusBudget: "0",
    isAdmin: false,
  }).returning();

  const token = signToken(user.id);
  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      budget: Number(user.budget),
      bonusBudget: Number(user.bonusBudget),
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = signToken(user.id);
  res.json({
    user: {
      id: user.id,
      email: user.email,
      handle: user.handle,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl ?? null,
      budget: Number(user.budget),
      bonusBudget: Number(user.bonusBudget),
      isAdmin: user.isAdmin,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    handle: user.handle,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl ?? null,
    budget: Number(user.budget),
    bonusBudget: Number(user.bonusBudget),
    isAdmin: user.isAdmin,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
