import { Router, Request, Response } from "express";
import { db, membershipsTable, groupsTable, expensesTable, expenseSplitsTable } from "@workspace/db";
import { eq, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/summary", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  if (memberships.length === 0) {
    res.json({
      totalGroups: 0,
      totalExpenses: 0,
      totalOwed: 0,
      totalOwe: 0,
      recentActivity: [],
      groupSummaries: [],
    });
    return;
  }

  const groupIds = memberships.map((m: any) => m.groupId);
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));

  const allExpenses = await db
    .select()
    .from(expensesTable)
    .where(inArray(expensesTable.groupId, groupIds));

  const allExpenseIds = allExpenses.map((e: any) => e.id);
  const allSplits = allExpenseIds.length > 0
    ? await db.select().from(expenseSplitsTable).where(inArray(expenseSplitsTable.expenseId, allExpenseIds))
    : [];

  const myPaidExpenses = allExpenses.filter((e: any) => e.payerId === userId);
  const mySplits = allSplits.filter((s: any) => s.userId === userId);

  let totalOwed = 0;
  for (const exp of myPaidExpenses) {
    const splitsForExp = allSplits.filter((s: any) => s.expenseId === exp.id && s.userId !== userId);
    totalOwed += splitsForExp.reduce((s: number, split: any) => s + parseFloat(split.amount as string), 0);
  }

  let totalOwe = 0;
  for (const split of mySplits) {
    const exp = allExpenses.find((e: any) => e.id === split.expenseId);
    if (exp && exp.payerId !== userId) {
      totalOwe += parseFloat(split.amount as string);
    }
  }

  const recentExpenses = await db
    .select()
    .from(expensesTable)
    .where(inArray(expensesTable.groupId, groupIds))
    .orderBy(desc(expensesTable.createdAt))
    .limit(10);

  const recentActivity = recentExpenses.map((e: any) => {
    const g = groups.find((gr: any) => gr.id === e.groupId);
    return {
      id: e.id,
      type: "expense",
      description: e.description,
      amount: parseFloat(e.amount as string),
      groupName: g?.name || "Group",
      createdAt: e.createdAt,
    };
  });

  const groupSummaries = await Promise.all(
    groups.map(async (g: any) => {
      const gMembers = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, g.id));
      const gExpenses = allExpenses.filter((e: any) => e.groupId === g.id);
      const gExpenseIds = gExpenses.map((e: any) => e.id);
      const gSplits = allSplits.filter((s: any) => gExpenseIds.includes(s.expenseId));

      const totalGroupSpent = gExpenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);
      const myPaidInGroup = gExpenses
        .filter((e: any) => e.payerId === userId)
        .reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);
      const myOwedInGroup = gSplits
        .filter((s: any) => s.userId === userId)
        .reduce((s: number, split: any) => s + parseFloat(split.amount as string), 0);
      const myBalance = myPaidInGroup - myOwedInGroup;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        ownerId: g.ownerId,
        createdAt: g.createdAt,
        memberCount: gMembers.length,
        totalExpenses: Math.round(totalGroupSpent * 100) / 100,
        myBalance: Math.round(myBalance * 100) / 100,
      };
    })
  );

  res.json({
    totalGroups: groups.length,
    totalExpenses: Math.round(allExpenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0) * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwe: Math.round(totalOwe * 100) / 100,
    recentActivity,
    groupSummaries,
  });
});

export default router;
