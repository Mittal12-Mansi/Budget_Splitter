import { Router, Request, Response } from "express";
import { db, usersTable, membershipsTable, expensesTable, expenseSplitsTable, settlementsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getCached, setCached, balanceCacheKey, debtGraphCacheKey } from "../lib/cache.js";
import { computeOptimalSettlements } from "../lib/debt-algorithm.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

async function checkGroupMember(groupId: number, userId: number): Promise<boolean> {
  const m = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, userId)))
    .limit(1);
  return m.length > 0;
}

async function computeBalances(groupId: number) {
  const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));
  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, groupId));
  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e) => e.id))
      )
    : [];

  const settlements = await db.select().from(settlementsTable).where(eq(settlementsTable.groupId, groupId));
  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);

  const members = users.map((user) => {
    const totalPaid = expenses
      .filter((e) => e.payerId === user.id)
      .reduce((s, e) => s + parseFloat(e.amount as string), 0);
    const totalOwed = splits
      .filter((s) => s.userId === user.id)
      .reduce((s, split) => s + parseFloat(split.amount as string), 0);

    const settledSent = settlements
      .filter((s) => s.payerId === user.id)
      .reduce((s, set) => s + parseFloat(set.amount as string), 0);
    const settledReceived = settlements
      .filter((s) => s.receiverId === user.id)
      .reduce((s, set) => s + parseFloat(set.amount as string), 0);

    const netBalance = Math.round((totalPaid - totalOwed + settledSent - settledReceived) * 100) / 100;

    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      netBalance,
    };
  });

  return { groupId, totalExpenses: Math.round(totalExpenses * 100) / 100, members };
}

router.get("/balances", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cacheKey = balanceCacheKey(groupId);
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const result = await computeBalances(groupId);
  setCached(cacheKey, result, 300);
  res.json(result);
});

router.get("/debt-graph", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const cacheKey = debtGraphCacheKey(groupId);
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const balances = await computeBalances(groupId);
  const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));
  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const nodes = balances.members.map((m) => ({
    userId: m.userId,
    name: m.name,
    email: m.email,
    avatarUrl: users.find((u) => u.id === m.userId)?.avatarUrl ?? null,
    netBalance: m.netBalance,
  }));

  const edges = computeOptimalSettlements(nodes);

  const graph = {
    groupId,
    algorithm: "greedy-min-transactions",
    nodes,
    edges,
  };

  setCached(cacheKey, graph, 300);
  res.json(graph);
});

export default router;
