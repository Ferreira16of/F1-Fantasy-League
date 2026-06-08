import { Router, type IRouter } from "express";
import { db, friendRequestsTable, friendshipsTable, usersTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAuth } from "../lib/auth";
import { SendFriendRequestBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/friends", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const friendships = await db.select().from(friendshipsTable)
    .where(or(eq(friendshipsTable.user1Id, userId), eq(friendshipsTable.user2Id, userId)));

  const result = await Promise.all(friendships.map(async f => {
    const friendId = f.user1Id === userId ? f.user2Id : f.user1Id;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, friendId)).limit(1);
    return {
      userId: friendId,
      handle: user?.handle ?? "",
      displayName: user?.displayName ?? "",
      avatarUrl: user?.avatarUrl ?? null,
      since: f.since.toISOString(),
    };
  }));
  res.json(result);
});

router.get("/friends/requests", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;
  const requests = await db.select().from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.toUserId, userId), eq(friendRequestsTable.status, "pending")));

  const result = await Promise.all(requests.map(async r => {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, r.fromUserId)).limit(1);
    return {
      id: r.id,
      fromUserId: r.fromUserId,
      fromHandle: user?.handle ?? "",
      fromDisplayName: user?.displayName ?? "",
      fromAvatarUrl: user?.avatarUrl ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  }));
  res.json(result);
});

router.post("/friends/send", requireAuth, async (req, res): Promise<void> => {
  const parsed = SendFriendRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const fromUserId = req.user!.id;
  const [toUser] = await db.select().from(usersTable).where(eq(usersTable.handle, parsed.data.handle)).limit(1);
  if (!toUser) {
    res.status(404).json({ error: "Usuário não encontrado" });
    return;
  }
  if (toUser.id === fromUserId) {
    res.status(400).json({ error: "Não é possível enviar pedido para si mesmo" });
    return;
  }

  const [existing] = await db.select().from(friendRequestsTable)
    .where(and(eq(friendRequestsTable.fromUserId, fromUserId), eq(friendRequestsTable.toUserId, toUser.id)))
    .limit(1);
  if (existing) {
    res.status(400).json({ error: "Pedido já enviado" });
    return;
  }

  await db.insert(friendRequestsTable).values({
    id: randomUUID(),
    fromUserId,
    toUserId: toUser.id,
    status: "pending",
  });
  res.json({ success: true });
});

router.post("/friends/requests/:requestId/accept", requireAuth, async (req, res): Promise<void> => {
  const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
  const [request] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, requestId)).limit(1);
  if (!request || request.toUserId !== req.user!.id) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }
  await db.update(friendRequestsTable).set({ status: "accepted" }).where(eq(friendRequestsTable.id, requestId));
  await db.insert(friendshipsTable).values({
    id: randomUUID(),
    user1Id: request.fromUserId,
    user2Id: request.toUserId,
  });
  res.json({ success: true });
});

router.post("/friends/requests/:requestId/reject", requireAuth, async (req, res): Promise<void> => {
  const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;
  const [request] = await db.select().from(friendRequestsTable).where(eq(friendRequestsTable.id, requestId)).limit(1);
  if (!request || request.toUserId !== req.user!.id) {
    res.status(404).json({ error: "Pedido não encontrado" });
    return;
  }
  await db.update(friendRequestsTable).set({ status: "rejected" }).where(eq(friendRequestsTable.id, requestId));
  res.json({ success: true });
});

router.delete("/friends/:userId", requireAuth, async (req, res): Promise<void> => {
  const targetId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const myId = req.user!.id;
  await db.delete(friendshipsTable)
    .where(or(
      and(eq(friendshipsTable.user1Id, myId), eq(friendshipsTable.user2Id, targetId)),
      and(eq(friendshipsTable.user1Id, targetId), eq(friendshipsTable.user2Id, myId)),
    ));
  res.sendStatus(204);
});

export default router;
