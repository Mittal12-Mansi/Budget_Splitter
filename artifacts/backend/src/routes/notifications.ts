import { Router, Request, Response } from "express";
import {
  db,
  notificationsTable,
  membershipsTable,
  expensesTable,
  settlementsTable,
  groupsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

// ─── GET /api/notifications ───────────────────────────────────────────────────
// Returns stored notifications + dynamically derived ones (new expenses, settlements)
router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // 1) Fetch persisted (reminder) notifications for this user
  const stored = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, userId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);

  // 2) Derive activity-based notifications from expenses & settlements
  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  const groupIds = memberships.map((m) => m.groupId);
  const dynamicNotifs: {
    id: string;
    userId: number;
    type: string;
    title: string;
    message: string;
    groupId: number | null;
    read: boolean;
    createdAt: Date;
  }[] = [];

  if (groupIds.length > 0) {
    const groups = await db
      .select()
      .from(groupsTable)
      .where(inArray(groupsTable.id, groupIds));

    // Recent expenses where someone ELSE paid (so current user owes money)
    const recentExpenses = await db
      .select()
      .from(expensesTable)
      .where(inArray(expensesTable.groupId, groupIds))
      .orderBy(desc(expensesTable.createdAt))
      .limit(20);

    const payerIds = [...new Set(recentExpenses.map((e) => e.payerId))];
    const payers =
      payerIds.length > 0
        ? await db
            .select()
            .from(usersTable)
            .where(inArray(usersTable.id, payerIds))
        : [];

    for (const expense of recentExpenses.slice(0, 10)) {
      if (expense.payerId !== userId) {
        const payer = payers.find((p) => p.id === expense.payerId);
        const group = groups.find((g) => g.id === expense.groupId);
        dynamicNotifs.push({
          id: `exp-${expense.id}`,
          userId,
          type: "expense_added",
          title: "New expense added",
          message: `${payer?.name ?? "Someone"} added "${expense.description}" (₹${parseFloat(expense.amount as string).toFixed(2)}) in ${group?.name ?? "a group"}`,
          groupId: expense.groupId,
          read: false,
          createdAt: expense.createdAt,
        });
      }
    }

    // Recent settlements where current user received money
    const recentSettlements = await db
      .select()
      .from(settlementsTable)
      .where(inArray(settlementsTable.groupId, groupIds))
      .orderBy(desc(settlementsTable.createdAt))
      .limit(10);

    const settlerIds = [...new Set(recentSettlements.map((s) => s.payerId))];
    const settlers =
      settlerIds.length > 0
        ? await db
            .select()
            .from(usersTable)
            .where(inArray(usersTable.id, settlerIds))
        : [];

    for (const settlement of recentSettlements) {
      if (settlement.receiverId === userId) {
        const payer = settlers.find((p) => p.id === settlement.payerId);
        const group = groups.find((g) => g.id === settlement.groupId);
        dynamicNotifs.push({
          id: `set-${settlement.id}`,
          userId,
          type: "settlement_made",
          title: "Settlement received",
          message: `${payer?.name ?? "Someone"} paid you ₹${parseFloat(settlement.amount as string).toFixed(2)} in ${group?.name ?? "a group"}`,
          groupId: settlement.groupId,
          read: false,
          createdAt: settlement.createdAt,
        });
      }
    }
  }

  // 3) Merge stored + dynamic, sort newest-first, cap at 20
  const storedMapped = stored.map((n) => ({ ...n, id: String(n.id) }));
  const allNotifs = [...storedMapped, ...dynamicNotifs]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, 20);

  const unreadCount = allNotifs.filter((n) => !n.read).length;
  res.json({ notifications: allNotifs, unreadCount });
});

// ─── POST /api/notifications/read-all ────────────────────────────────────────
// Mark all persisted notifications for user as read
router.post("/read-all", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(
      and(
        eq(notificationsTable.userId, userId),
        eq(notificationsTable.read, false)
      )
    );
  res.json({ success: true });
});

// ─── POST /api/notifications/reminder ────────────────────────────────────────
// Called from Debt Graph → "Send Reminder" button
// Creates a persisted "debt_reminder" notification for the debtor
router.post("/reminder", async (req: Request, res: Response) => {
  const senderId = req.user!.userId;
  const { debtorUserId, amount, groupId, groupName } = req.body as {
    debtorUserId: number;
    amount: number;
    groupId: number;
    groupName: string;
  };

  const [sender] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, senderId))
    .limit(1);

  if (!sender) {
    res.status(404).json({ error: "Sender not found" });
    return;
  }

  await db.insert(notificationsTable).values({
    userId: debtorUserId,
    type: "debt_reminder",
    title: "💸 Payment reminder",
    message: `${sender.name} is reminding you to pay ₹${amount.toFixed(2)} in ${groupName}`,
    groupId,
    read: false,
  });

  res.json({ success: true, message: "Reminder sent successfully" });
});

export default router;