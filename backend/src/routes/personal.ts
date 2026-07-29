import { Router, Request, Response } from "express";
import { db, personalExpensesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const expenses = await db
    .select()
    .from(personalExpensesTable)
    .where(eq(personalExpensesTable.userId, userId))
    .orderBy(desc(personalExpensesTable.date));

  const totalSpent = expenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);

  const categoryTotals: Record<string, number> = {};
  for (const exp of expenses) {
    categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + parseFloat(exp.amount as string);
  }

  const categoryBreakdown = Object.entries(categoryTotals).map(([category, amount]) => ({
    category,
    amount: Math.round(amount * 100) / 100,
    percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 1000) / 10 : 0,
  }));

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthlyExpenses = expenses.filter((e: any) => new Date(e.date) >= firstDayOfMonth);
  const monthlySpent = monthlyExpenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);

  res.json({
    totalSpent: Math.round(totalSpent * 100) / 100,
    monthlySpent: Math.round(monthlySpent * 100) / 100,
    categoryBreakdown,
    expenses,
  });
});

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { title, description, amount, category, date, notes, note, receiptUrl } = req.body as {
    title?: string;
    description?: string;
    amount: number;
    category: string;
    date?: string;
    notes?: string;
    note?: string;
    receiptUrl?: string;
  };

  const descText = description || title;
  if (!descText || !amount || !category) {
    res.status(400).json({ error: "Validation error", message: "description, amount, and category are required" });
    return;
  }

  const [expense] = await db
    .insert(personalExpensesTable)
    .values({
      userId,
      description: descText,
      amount: amount.toString(),
      category,
      date: date ? new Date(date) : new Date(),
      note: note || notes || null,
    })
    .returning();

  res.status(201).json(expense);
});

router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as any).id);

  const { title, description, amount, category, date, notes, note } = req.body as Partial<{
    title: string;
    description: string;
    amount: number;
    category: string;
    date: string;
    notes: string;
    note: string;
  }>;

  const [existing] = await db
    .select()
    .from(personalExpensesTable)
    .where(and(eq(personalExpensesTable.id, id), eq(personalExpensesTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const descText = description || title;

  const [updated] = await db
    .update(personalExpensesTable)
    .set({
      ...(descText && { description: descText }),
      ...(amount && { amount: amount.toString() }),
      ...(category && { category }),
      ...(date && { date: new Date(date) }),
      ...((note !== undefined || notes !== undefined) && { note: note || notes || null }),
    })
    .where(eq(personalExpensesTable.id, id))
    .returning();

  res.json(updated);
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = parseInt((req.params as any).id);

  const [existing] = await db
    .select()
    .from(personalExpensesTable)
    .where(and(eq(personalExpensesTable.id, id), eq(personalExpensesTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(personalExpensesTable).where(eq(personalExpensesTable.id, id));
  res.status(204).send();
});

export default router;
