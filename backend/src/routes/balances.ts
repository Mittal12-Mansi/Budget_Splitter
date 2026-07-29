import { Router, Request, Response } from "express";
import { db, groupsTable, membershipsTable, expensesTable, expenseSplitsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getSimplifiedDebts } from "../lib/debt-algorithm.js";

const router = Router();
router.use(requireAuth);

router.get("/:groupId/balances", async (req: Request, res: Response) => {
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

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.groupId, groupId));

  const userIds = memberships.map((m: any) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, groupId));
  const totalExpenses = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);

  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e: any) => e.id))
      )
    : [];

  const members = memberships.map((m: any) => {
    const user = users.find((u: any) => u.id === m.userId)!;
    const totalPaid = expenses
      .filter((e: any) => e.payerId === m.userId)
      .reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);
    const totalOwed = splits
      .filter((s: any) => s.userId === m.userId)
      .reduce((s: number, split: any) => s + parseFloat(split.amount as string), 0);

    return {
      userId: m.userId,
      name: user?.name || "Unknown",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || null,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalOwed: Math.round(totalOwed * 100) / 100,
      netBalance: Math.round((totalPaid - totalOwed) * 100) / 100,
    };
  });

  res.json({
    groupId,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    members,
  });
});

router.get("/:groupId/debt-graph", async (req: Request, res: Response) => {
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

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.groupId, groupId));

  const userIds = memberships.map((m: any) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, groupId));
  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e: any) => e.id))
      )
    : [];

  const members = memberships.map((m: any) => {
    const user = users.find((u: any) => u.id === m.userId)!;
    const totalPaid = expenses
      .filter((e: any) => e.payerId === m.userId)
      .reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);
    const totalOwed = splits
      .filter((s: any) => s.userId === m.userId)
      .reduce((s: number, split: any) => s + parseFloat(split.amount as string), 0);

    return {
      userId: m.userId,
      name: user?.name || "Unknown",
      email: user?.email || "",
      avatarUrl: user?.avatarUrl || null,
      netBalance: Math.round((totalPaid - totalOwed) * 100) / 100,
    };
  });

  const edges = getSimplifiedDebts(members);

  res.json({
    groupId,
    algorithm: "Greedy Min Cash Flow",
    nodes: members,
    edges,
  });
});

export default router;
