import { Router, Request, Response } from "express";
import { db, usersTable, personalExpensesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Health", "Bills", "Education", "Travel", "Other"];

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const expenses = await db
    .select()
    .from(personalExpensesTable)
    .where(eq(personalExpensesTable.userId, userId))
    .orderBy(desc(personalExpensesTable.date));

  res.json(expenses.map(e => ({
    ...e,
    amount: parseFloat(e.amount as string),
  })));
});

router.get("/summary", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const expenses = await db
    .select()
    .from(personalExpensesTable)
    .where(eq(personalExpensesTable.userId, userId));

  const total = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);

  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + parseFloat(e.amount as string);
  }

  const now = new Date();
  const thisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const thisMonthTotal = thisMonth.reduce((s, e) => s + parseFloat(e.amount as string), 0);

  const monthlyTotals: Record<string, number> = {};
  for (const e of expenses) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyTotals[key] = (monthlyTotals[key] ?? 0) + parseFloat(e.amount as string);
  }

  res.json({
    total: Math.round(total * 100) / 100,
    thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
    byCategory: Object.entries(byCategory).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    })),
    monthlyTotals: Object.entries(monthlyTotals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 })),
    count: expenses.length,
  });
});

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { description, amount, category, note, date } = req.body as {
    description: string;
    amount: number;
    category?: string;
    note?: string;
    date?: string;
  };

  if (!description || !amount) {
    res.status(400).json({ error: "description and amount are required" });
    return;
  }

  const [expense] = await db
    .insert(personalExpensesTable)
    .values({
      userId,
      description,
      amount: amount.toFixed(2),
      category: category ?? "Other",
      note,
      date: date ? new Date(date) : new Date(),
    })
    .returning();

  res.status(201).json({ ...expense, amount: parseFloat(expense.amount as string) });
});

router.patch("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"]!);
  const { description, amount, category, note, date } = req.body as {
    description?: string;
    amount?: number;
    category?: string;
    note?: string;
    date?: string;
  };

  const [existing] = await db
    .select()
    .from(personalExpensesTable)
    .where(eq(personalExpensesTable.id, id))
    .limit(1);

  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db
    .update(personalExpensesTable)
    .set({
      ...(description && { description }),
      ...(amount !== undefined && { amount: amount.toFixed(2) }),
      ...(category && { category }),
      ...(note !== undefined && { note }),
      ...(date && { date: new Date(date) }),
    })
    .where(eq(personalExpensesTable.id, id));

  const [updated] = await db.select().from(personalExpensesTable).where(eq(personalExpensesTable.id, id)).limit(1);
  res.json({ ...updated, amount: parseFloat(updated.amount as string) });
});

router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const id = parseInt(req.params["id"]!);

  const [existing] = await db
    .select()
    .from(personalExpensesTable)
    .where(eq(personalExpensesTable.id, id))
    .limit(1);

  if (!existing || existing.userId !== userId) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(personalExpensesTable).where(eq(personalExpensesTable.id, id));
  res.status(204).send();
});

export default router;
