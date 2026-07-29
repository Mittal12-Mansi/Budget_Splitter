import { Router, Request, Response } from "express";
import { db, recurringExpensesTable, expensesTable, expenseSplitsTable, membershipsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router();
router.use(requireAuth);

router.get("/:groupId/recurring", async (req: Request, res: Response) => {
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

  const recurring = await db
    .select()
    .from(recurringExpensesTable)
    .where(eq(recurringExpensesTable.groupId, groupId));

  const payerIds = Array.from(new Set(recurring.map((r: any) => r.payerId)));
  const payers = payerIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, payerIds))
    : [];

  const formatted = recurring.map((r: any) => {
    const payer = payers.find((p: any) => p.id === r.payerId);
    return {
      ...r,
      payer: payer ? { id: payer.id, name: payer.name, email: payer.email } : null,
    };
  });

  res.json(formatted);
});

router.post("/:groupId/recurring", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const userId = req.user!.userId;

  const { description, amount, frequency, category, payerId, splitType } = req.body as {
    description: string;
    amount: number;
    frequency: string;
    category?: string;
    payerId?: number;
    splitType?: string;
  };

  if (!description || !amount || !frequency) {
    res.status(400).json({ error: "Validation error", message: "description, amount, and frequency are required" });
    return;
  }

  const nextDueAt = new Date();
  if (frequency === "daily") nextDueAt.setDate(nextDueAt.getDate() + 1);
  else if (frequency === "weekly") nextDueAt.setDate(nextDueAt.getDate() + 7);
  else if (frequency === "monthly") nextDueAt.setMonth(nextDueAt.getMonth() + 1);

  const [rule] = await db
    .insert(recurringExpensesTable)
    .values({
      groupId,
      description,
      amount: amount.toString(),
      frequency,
      category: category || "General",
      payerId: payerId || userId,
      splitType: splitType || "equal",
      nextDueAt,
      isActive: true,
    })
    .returning();

  res.status(201).json(rule);
});

router.post("/:groupId/recurring/:id/trigger", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const id = parseInt((req.params as any).id);

  const [rule] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, id), eq(recurringExpensesTable.groupId, groupId)))
    .limit(1);

  if (!rule) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [expense] = await db
    .insert(expensesTable)
    .values({
      groupId,
      description: `${rule.description} (Recurring)`,
      amount: rule.amount,
      payerId: rule.payerId,
      splitType: rule.splitType,
      category: rule.category,
    })
    .returning();

  const members = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, groupId));
  if (members.length > 0) {
    const equalAmount = (parseFloat(rule.amount as string) / members.length).toFixed(2);
    await db.insert(expenseSplitsTable).values(
      members.map((m: any) => ({
        expenseId: expense.id,
        userId: m.userId,
        amount: equalAmount,
      }))
    );
  }

  const now = new Date();
  const nextDueAt = new Date(now);
  if (rule.frequency === "daily") nextDueAt.setDate(nextDueAt.getDate() + 1);
  else if (rule.frequency === "weekly") nextDueAt.setDate(nextDueAt.getDate() + 7);
  else if (rule.frequency === "monthly") nextDueAt.setMonth(nextDueAt.getMonth() + 1);

  await db
    .update(recurringExpensesTable)
    .set({ lastGeneratedAt: now, nextDueAt })
    .where(eq(recurringExpensesTable.id, id));

  invalidateCache(`group:${groupId}`);
  res.status(201).json(expense);
});

router.delete("/:groupId/recurring/:id", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const id = parseInt((req.params as any).id);

  const [rule] = await db
    .select()
    .from(recurringExpensesTable)
    .where(and(eq(recurringExpensesTable.id, id), eq(recurringExpensesTable.groupId, groupId)))
    .limit(1);

  if (!rule) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(recurringExpensesTable).where(eq(recurringExpensesTable.id, id));
  res.status(204).send();
});

export default router;
