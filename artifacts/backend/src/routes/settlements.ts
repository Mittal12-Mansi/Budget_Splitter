import { Router, Request, Response } from "express";
import { db, usersTable, membershipsTable, settlementsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

function formatUser(u: { id: number; name: string; email: string; avatarUrl: string | null; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

async function checkGroupMember(groupId: number, userId: number): Promise<boolean> {
  const m = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, userId)))
    .limit(1);
  return m.length > 0;
}

router.get("/", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, groupId))
    .orderBy(settlementsTable.createdAt);

  const userIds = [...new Set([...settlements.map((s) => s.payerId), ...settlements.map((s) => s.receiverId)])];
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const result = settlements.map((s) => ({
    id: s.id,
    groupId: s.groupId,
    payerId: s.payerId,
    receiverId: s.receiverId,
    amount: parseFloat(s.amount as string),
    note: s.note,
    createdAt: s.createdAt,
    payer: formatUser(users.find((u) => u.id === s.payerId)!),
    receiver: formatUser(users.find((u) => u.id === s.receiverId)!),
  }));

  res.json(result);
});

router.post("/", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { payerId, receiverId, amount, note } = req.body as {
    payerId: number;
    receiverId: number;
    amount: number;
    note?: string;
  };

  const [settlement] = await db
    .insert(settlementsTable)
    .values({ groupId, payerId, receiverId, amount: amount.toFixed(2), note })
    .returning();

  const userIds = [payerId, receiverId];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));

  invalidateCache(`balances:group:${groupId}`);
  invalidateCache(`debtgraph:group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  res.status(201).json({
    id: settlement.id,
    groupId: settlement.groupId,
    payerId: settlement.payerId,
    receiverId: settlement.receiverId,
    amount: parseFloat(settlement.amount as string),
    note: settlement.note,
    createdAt: settlement.createdAt,
    payer: formatUser(users.find((u) => u.id === payerId)!),
    receiver: formatUser(users.find((u) => u.id === receiverId)!),
  });
});

export default router;
