import { Router, Request, Response } from "express";
import { db, usersTable, groupsTable, membershipsTable, expensesTable, expenseSplitsTable } from "@workspace/db";
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

async function buildSplits(
  expenseId: number,
  members: Array<{ userId: number }>,
  totalAmount: number,
  splitType: string,
  customSplits?: Array<{ userId: number; value: number }>
) {
  const splits: Array<{ expenseId: number; userId: number; amount: string }> = [];

  if (splitType === "equal") {
    const share = Math.round((totalAmount / members.length) * 100) / 100;
    for (const m of members) {
      splits.push({ expenseId, userId: m.userId, amount: share.toFixed(2) });
    }
  } else if (splitType === "percentage" && customSplits) {
    for (const s of customSplits) {
      const amount = Math.round((totalAmount * s.value) / 100 * 100) / 100;
      splits.push({ expenseId, userId: s.userId, amount: amount.toFixed(2) });
    }
  } else if (splitType === "amount" && customSplits) {
    for (const s of customSplits) {
      splits.push({ expenseId, userId: s.userId, amount: s.value.toFixed(2) });
    }
  }

  return splits;
}

async function getExpenseDetail(expenseId: number) {
  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId)).limit(1);
  if (!expense) return null;

  const [payer] = await db.select().from(usersTable).where(eq(usersTable.id, expense.payerId)).limit(1);
  const splits = await db.select().from(expenseSplitsTable).where(eq(expenseSplitsTable.expenseId, expenseId));

  const splitUserIds = splits.map((s) => s.userId);
  const splitUsers = splitUserIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, splitUserIds))
    : [];

  return {
    id: expense.id,
    groupId: expense.groupId,
    description: expense.description,
    amount: parseFloat(expense.amount as string),
    payerId: expense.payerId,
    splitType: expense.splitType,
    category: expense.category,
    createdAt: expense.createdAt,
    payer: payer ? formatUser(payer) : null,
    splits: splits.map((s) => ({
      id: s.id,
      expenseId: s.expenseId,
      userId: s.userId,
      amount: parseFloat(s.amount as string),
      user: formatUser(splitUsers.find((u) => u.id === s.userId)!),
    })),
  };
}

router.get("/", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .orderBy(expensesTable.createdAt);

  const details = await Promise.all(expenses.map((e) => getExpenseDetail(e.id)));
  res.json(details.filter(Boolean));
});

router.post("/", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { description, amount, payerId, splitType, category, splits: customSplits } = req.body as {
    description: string;
    amount: number;
    payerId: number;
    splitType: string;
    category?: string;
    splits?: Array<{ userId: number; value: number }>;
  };

  const [expense] = await db
    .insert(expensesTable)
    .values({
      groupId,
      description,
      amount: amount.toFixed(2),
      payerId,
      splitType: splitType ?? "equal",
      category,
    })
    .returning();

  const members = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));
  const splits = await buildSplits(expense.id, members, amount, splitType ?? "equal", customSplits);

  if (splits.length > 0) {
    await db.insert(expenseSplitsTable).values(splits);
  }

  invalidateCache(`balances:group:${groupId}`);
  invalidateCache(`debtgraph:group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  const detail = await getExpenseDetail(expense.id);
  res.status(201).json(detail);
});

router.get("/:expenseId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const expenseId = parseInt(req.params["expenseId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const detail = await getExpenseDetail(expenseId);
  if (!detail) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(detail);
});

router.patch("/:expenseId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const expenseId = parseInt(req.params["expenseId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { description, amount, payerId, splitType, category, splits: customSplits } = req.body as {
    description?: string;
    amount?: number;
    payerId?: number;
    splitType?: string;
    category?: string;
    splits?: Array<{ userId: number; value: number }>;
  };

  await db
    .update(expensesTable)
    .set({
      ...(description && { description }),
      ...(amount && { amount: amount.toFixed(2) }),
      ...(payerId && { payerId }),
      ...(splitType && { splitType }),
      ...(category !== undefined && { category }),
    })
    .where(eq(expensesTable.id, expenseId));

  if (amount || splitType || customSplits) {
    await db.delete(expenseSplitsTable).where(eq(expenseSplitsTable.expenseId, expenseId));
    const [updatedExpense] = await db.select().from(expensesTable).where(eq(expensesTable.id, expenseId)).limit(1);
    if (updatedExpense) {
      const members = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));
      const splits = await buildSplits(
        expenseId,
        members,
        parseFloat(updatedExpense.amount as string),
        updatedExpense.splitType,
        customSplits
      );
      if (splits.length > 0) {
        await db.insert(expenseSplitsTable).values(splits);
      }
    }
  }

  invalidateCache(`balances:group:${groupId}`);
  invalidateCache(`debtgraph:group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  const detail = await getExpenseDetail(expenseId);
  res.json(detail);
});

router.delete("/:expenseId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const expenseId = parseInt(req.params["expenseId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(expensesTable).where(eq(expensesTable.id, expenseId));
  invalidateCache(`balances:group:${groupId}`);
  invalidateCache(`debtgraph:group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);
  res.status(204).send();
});

export default router;
