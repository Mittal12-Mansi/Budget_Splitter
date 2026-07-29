import { Router, Request, Response } from "express";
import { db, membershipsTable, expensesTable, expenseSplitsTable, recurringExpensesTable, usersTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router({ mergeParams: true });
router.use(requireAuth);

function nextDueDate(dayOfMonth: number, from?: Date): Date {
  const now = from ?? new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  return next;
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
  if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }

  const recurrings = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.groupId, groupId));

  const payerIds = [...new Set(recurrings.map(r => r.payerId))];
  const payers = payerIds.length > 0
    ? await db.select().from(usersTable).where(eq(usersTable.id, payerIds[0]!))
    : [];

  res.json(recurrings.map(r => ({
    ...r,
    amount: parseFloat(r.amount as string),
    payer: payers.find(p => p.id === r.payerId) ?? null,
  })));
});

router.post("/", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }

  const { description, amount, payerId, splitType, category, frequency, dayOfMonth } = req.body as {
    description: string;
    amount: number;
    payerId: number;
    splitType?: string;
    category?: string;
    frequency?: string;
    dayOfMonth?: number;
  };

  const dom = dayOfMonth ?? 1;
  const [recurring] = await db
    .insert(recurringExpensesTable)
    .values({
      groupId,
      description,
      amount: amount.toFixed(2),
      payerId,
      splitType: splitType ?? "equal",
      category,
      frequency: frequency ?? "monthly",
      dayOfMonth: dom,
      isActive: true,
      nextDueAt: nextDueDate(dom),
    })
    .returning();

  res.status(201).json({ ...recurring, amount: parseFloat(recurring.amount as string) });
});

router.post("/:recurringId/generate", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const recurringId = parseInt(req.params["recurringId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }

  const [recurring] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, recurringId), eq(recurringExpensesTable.groupId, groupId)))
    .limit(1);

  if (!recurring) { res.status(404).json({ error: "Not found" }); return; }

  const members = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));

  const [expense] = await db
    .insert(expensesTable)
    .values({
      groupId,
      description: `${recurring.description} (Auto)`,
      amount: recurring.amount,
      payerId: recurring.payerId,
      splitType: recurring.splitType,
      category: recurring.category,
    })
    .returning();

  const totalAmount = parseFloat(recurring.amount as string);
  const share = Math.round((totalAmount / members.length) * 100) / 100;
  const splits = members.map(m => ({
    expenseId: expense.id,
    userId: m.userId,
    amount: share.toFixed(2),
  }));

  if (splits.length > 0) {
    await db.insert(expenseSplitsTable).values(splits);
  }

  await db
    .update(recurringExpensesTable)
    .set({
      lastGeneratedAt: new Date(),
      nextDueAt: nextDueDate(recurring.dayOfMonth),
    })
    .where(eq(recurringExpensesTable.id, recurringId));

  invalidateCache(`balances:group:${groupId}`);
  invalidateCache(`debtgraph:group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);

  res.status(201).json({ ...expense, amount: parseFloat(expense.amount as string) });
});

router.patch("/:recurringId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const recurringId = parseInt(req.params["recurringId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }

  const { isActive, description, amount, dayOfMonth } = req.body as {
    isActive?: boolean;
    description?: string;
    amount?: number;
    dayOfMonth?: number;
  };

  await db
    .update(recurringExpensesTable)
    .set({
      ...(isActive !== undefined && { isActive }),
      ...(description && { description }),
      ...(amount !== undefined && { amount: amount.toFixed(2) }),
      ...(dayOfMonth !== undefined && { dayOfMonth, nextDueAt: nextDueDate(dayOfMonth) }),
    })
    .where(and(eq(recurringExpensesTable.id, recurringId), eq(recurringExpensesTable.groupId, groupId)));

  const [updated] = await db.select().from(recurringExpensesTable).where(eq(recurringExpensesTable.id, recurringId)).limit(1);
  res.json({ ...updated, amount: parseFloat(updated.amount as string) });
});

router.delete("/:recurringId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const recurringId = parseInt(req.params["recurringId"]!);
  const userId = req.user!.userId;

  const isMember = await checkGroupMember(groupId, userId);
  if (!isMember) { res.status(403).json({ error: "Forbidden" }); return; }

  await db
    .delete(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, recurringId), eq(recurringExpensesTable.groupId, groupId)));

  res.status(204).send();
});

export default router;
