import jwt from "jsonwebtoken";
import { type Request, type Response, type NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

const JWT_SECRET = process.env.SESSION_SECRET ?? "f1draft_secret_change_me";

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifyToken(token: string): { sub: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Usuário não encontrado" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  } catch (err) {
    logger.warn({ err }, "Invalid token");
    res.status(401).json({ error: "Token inválido" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, async () => {
    const user = (req as Request & { user: { isAdmin: boolean } }).user;
    if (!user?.isAdmin) {
      res.status(403).json({ error: "Acesso negado" });
      return;
    }
    next();
  });
}

declare global {
  namespace Express {
    interface Request {
      user?: import("@workspace/db").User;
    }
  }
}
