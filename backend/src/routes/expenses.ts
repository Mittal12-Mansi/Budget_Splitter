import { Router, Request, Response } from "express";
import { db, expensesTable, expenseSplitsTable, membershipsTable, usersTable, groupsTable, notificationsTable } from "@workspace/db";
import { eq, and, inArray, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router();
router.use(requireAuth);

function formatUser(u: { id: number; name: string; email: string; avatarUrl: string | null; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

router.get("/:groupId/expenses", async (req: Request, res: Response) => {
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

  const expenses = await db
    .select()
    .from(expensesTable)
    .where(eq(expensesTable.groupId, groupId))
    .orderBy(desc(expensesTable.createdAt));

  if (expenses.length === 0) {
    res.json([]);
    return;
  }

  const expenseIds = expenses.map((e: any) => e.id);
  const payerIds = Array.from(new Set(expenses.map((e: any) => e.payerId)));

  const splits = await db
    .select()
    .from(expenseSplitsTable)
    .where(inArray(expenseSplitsTable.expenseId, expenseIds));

  const splitUserIds = Array.from(new Set(splits.map((s: any) => s.userId)));
  const allUserIds = Array.from(new Set([...payerIds, ...splitUserIds]));

  const users = await db.select().from(usersTable).where(inArray(usersTable.id, allUserIds));

  const result = expenses.map((e: any) => {
    const payer = users.find((u: any) => u.id === e.payerId)!;
    const expSplits = splits
      .filter((s: any) => s.expenseId === e.id)
      .map((s: any) => {
        const u = users.find((usr: any) => usr.id === s.userId)!;
        return {
          id: s.id,
          expenseId: s.expenseId,
          userId: s.userId,
          amount: parseFloat(s.amount as string),
          user: formatUser(u),
        };
      });

    return {
      id: e.id,
      groupId: e.groupId,
      description: e.description,
      amount: parseFloat(e.amount as string),
      payerId: e.payerId,
      splitType: e.splitType,
      category: e.category,
      receiptUrl: e.receiptUrl || null,
      createdAt: e.createdAt,
      payer: formatUser(payer),
      splits: expSplits,
    };
  });

  res.json(result);
});

router.post("/:groupId/expenses", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const userId = req.user!.userId;

  const { description, amount, payerId, splitType, category, receiptUrl, splits } = req.body as {
    description: string;
    amount: number;
    payerId: number;
    splitType: "equal" | "percentage" | "amount";
    category?: string;
    receiptUrl?: string;
    splits?: Array<{ userId: number; value: number }>;
  };

  if (!description || !amount || !payerId || !splitType) {
    res.status(400).json({ error: "Validation error", message: "description, amount, payerId, and splitType are required" });
    return;
  }

  const groupMemberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.groupId, groupId));

  const memberUserIds = groupMemberships.map((m: any) => m.userId);

  const [expense] = await db
    .insert(expensesTable)
    .values({
      groupId,
      description,
      amount: amount.toString(),
      payerId,
      splitType,
      category: category ?? "General",
    })
    .returning();

  let splitRecords: Array<{ expenseId: number; userId: number; amount: string }> = [];

  if (splitType === "equal") {
    const targetUserIds = splits && splits.length > 0 ? splits.map((s: any) => s.userId) : memberUserIds;
    const perPerson = Math.round((amount / targetUserIds.length) * 100) / 100;

    splitRecords = targetUserIds.map((uid: number) => ({
      expenseId: expense.id,
      userId: uid,
      amount: perPerson.toString(),
    }));
  } else if (splitType === "percentage") {
    if (!splits || splits.length === 0) {
      res.status(400).json({ error: "Validation error", message: "splits are required for percentage split" });
      return;
    }

    splitRecords = splits.map((s: any) => ({
      expenseId: expense.id,
      userId: s.userId,
      amount: (Math.round(((amount * s.value) / 100) * 100) / 100).toString(),
    }));
  } else if (splitType === "amount") {
    if (!splits || splits.length === 0) {
      res.status(400).json({ error: "Validation error", message: "splits are required for exact amount split" });
      return;
    }

    splitRecords = splits.map((s: any) => ({
      expenseId: expense.id,
      userId: s.userId,
      amount: s.value.toString(),
    }));
  }

  if (splitRecords.length > 0) {
    await db.insert(expenseSplitsTable).values(splitRecords);
  }

  invalidateCache(`group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  const users = await db.select().from(usersTable).where(inArray(usersTable.id, memberUserIds));
  const payer = users.find((u: any) => u.id === payerId)!;

  try {
    for (const split of splitRecords) {
      if (split.userId !== payerId) {
        await db.insert(notificationsTable).values({
          userId: split.userId,
          type: "expense_added",
          title: "New Expense Added",
          message: `${payer?.name || "A member"} added "${description}" (₹${amount}). Your share: ₹${split.amount}`,
          groupId,
          read: false,
        });
      }
    }
  } catch (e) {
    // Ignore notification error if schema differs
  }

  const insertedSplits = await db
    .select()
    .from(expenseSplitsTable)
    .where(eq(expenseSplitsTable.expenseId, expense.id));

  const detailedSplits = insertedSplits.map((s: any) => {
    const u = users.find((usr: any) => usr.id === s.userId)!;
    return {
      id: s.id,
      expenseId: s.expenseId,
      userId: s.userId,
      amount: parseFloat(s.amount as string),
      user: formatUser(u),
    };
  });

  res.status(201).json({
    id: expense.id,
    groupId: expense.groupId,
    description: expense.description,
    amount: parseFloat(expense.amount as string),
    payerId: expense.payerId,
    splitType: expense.splitType,
    category: expense.category,
    createdAt: expense.createdAt,
    payer: formatUser(payer),
    splits: detailedSplits,
  });
});

router.patch("/:groupId/expenses/:expenseId", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const expenseId = parseInt((req.params as any).expenseId);
  const userId = req.user!.userId;

  const [existing] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.groupId, groupId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { description, amount, category } = req.body as Partial<{
    description: string;
    amount: number;
    category: string;
  }>;

  const [updated] = await db
    .update(expensesTable)
    .set({
      ...(description && { description }),
      ...(amount && { amount: amount.toString() }),
      ...(category && { category }),
    })
    .where(eq(expensesTable.id, expenseId))
    .returning();

  invalidateCache(`group:${groupId}`);
  res.json(updated);
});

router.delete("/:groupId/expenses/:expenseId", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const expenseId = parseInt((req.params as any).expenseId);
  const userId = req.user!.userId;

  const [existing] = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.id, expenseId), eq(expensesTable.groupId, groupId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(expensesTable).where(eq(expensesTable.id, expenseId));
  invalidateCache(`group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  res.status(204).send();
});

export default router;
