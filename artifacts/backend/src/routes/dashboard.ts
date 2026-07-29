import { Router, Request, Response } from "express";
import { db, groupsTable, membershipsTable, expensesTable, expenseSplitsTable, settlementsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { getCached, setCached, dashboardCacheKey } from "../lib/cache.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const cacheKey = dashboardCacheKey(userId);
  const cached = getCached(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  const memberships = await db.select().from(membershipsTable).where(eq(membershipsTable.userId, userId));

  if (memberships.length === 0) {
    const empty = {
      totalGroups: 0,
      totalExpenses: 0,
      totalOwed: 0,
      totalOwe: 0,
      recentActivity: [],
      groupSummaries: [],
    };
    res.json(empty);
    return;
  }

  const groupIds = memberships.map((m) => m.groupId);
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));
  const expenses = await db.select().from(expensesTable).where(inArray(expensesTable.groupId, groupIds));
  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e) => e.id))
      )
    : [];

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);
  const totalPaid = expenses
    .filter((e) => e.payerId === userId)
    .reduce((s, e) => s + parseFloat(e.amount as string), 0);
  const totalOwedToMe = splits
    .filter((s) => s.userId !== userId)
    .reduce((s, split) => {
      const expense = expenses.find((e) => e.id === split.expenseId);
      return expense?.payerId === userId ? s + parseFloat(split.amount as string) : s;
    }, 0);
  const totalIOwed = splits
    .filter((s) => s.userId === userId)
    .reduce((s, split) => {
      const expense = expenses.find((e) => e.id === split.expenseId);
      return expense?.payerId !== userId ? s + parseFloat(split.amount as string) : s;
    }, 0);

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10)
    .map((e) => ({
      id: e.id,
      type: "expense",
      description: e.description,
      amount: parseFloat(e.amount as string),
      groupName: groups.find((g) => g.id === e.groupId)?.name ?? "Unknown",
      createdAt: e.createdAt,
    }));

  const groupSummaries = await Promise.all(
    groups.map(async (g) => {
      const groupExpenses = expenses.filter((e) => e.groupId === g.id);
      const groupMembers = memberships.filter((m) => m.groupId === g.id);
      const groupSplits = splits.filter((s) =>
        groupExpenses.some((e) => e.id === s.expenseId)
      );

      const myPaid = groupExpenses.filter((e) => e.payerId === userId).reduce((s, e) => s + parseFloat(e.amount as string), 0);
      const myOwed = groupSplits.filter((s) => s.userId === userId).reduce((s, split) => s + parseFloat(split.amount as string), 0);

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        ownerId: g.ownerId,
        createdAt: g.createdAt,
        memberCount: groupMembers.length,
        totalExpenses: Math.round(groupExpenses.reduce((s, e) => s + parseFloat(e.amount as string), 0) * 100) / 100,
        myBalance: Math.round((myPaid - myOwed) * 100) / 100,
      };
    })
  );

  const result = {
    totalGroups: groups.length,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalOwed: Math.round(totalOwedToMe * 100) / 100,
    totalOwe: Math.round(totalIOwed * 100) / 100,
    recentActivity: recentExpenses,
    groupSummaries,
  };

  setCached(cacheKey, result, 120);
  res.json(result);
});

export default router;
