import { Router, Request, Response } from "express";
import { db, settlementsTable, membershipsTable, usersTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router();
router.use(requireAuth);

router.get("/:groupId/settlements", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const userId = req.user!.userId;

  const isMember = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, userId)))
    .limit(1);

  if (isMember.length === 0) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const settlements = await db
    .select()
    .from(settlementsTable)
    .where(eq(settlementsTable.groupId, groupId))
    .orderBy(desc(settlementsTable.createdAt));

  const userIds = Array.from(
    new Set(settlements.flatMap((s: any) => [s.payerId, s.receiverId]))
  );
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const formatUser = (u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    avatarUrl: u.avatarUrl,
  });

  const result = settlements.map((s: any) => {
    const payer = users.find((u: any) => u.id === s.payerId)!;
    const receiver = users.find((u: any) => u.id === s.receiverId)!;
    return {
      ...s,
      payer: formatUser(payer),
      receiver: formatUser(receiver),
    };
  });

  res.json(result);
});

router.post("/:groupId/settlements", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const { payerId, receiverId, amount, note } = req.body as {
    payerId: number;
    receiverId: number;
    amount: number;
    note?: string;
  };

  if (!payerId || !receiverId || !amount) {
    res.status(400).json({ error: "Validation error", message: "payerId, receiverId, and amount are required" });
    return;
  }

  const [settlement] = await db
    .insert(settlementsTable)
    .values({
      groupId,
      payerId,
      receiverId,
      amount: amount.toString(),
      note: note || null,
    })
    .returning();

  const userIds = [payerId, receiverId];
  const users = await db.select().from(usersTable).where(inArray(usersTable.id, userIds));
  const formatUser = (u: any) => ({ id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl });

  const payer = users.find((u: any) => u.id === payerId)!;
  const receiver = users.find((u: any) => u.id === receiverId)!;

  invalidateCache(`group:${groupId}`);
  res.status(201).json({
    ...settlement,
    payer: formatUser(payer),
    receiver: formatUser(receiver),
  });
});

export default router;
