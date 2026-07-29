import { Router, Request, Response } from "express";
import { db, notificationsTable, membershipsTable, expensesTable, usersTable, groupsTable, settlementsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  let notifications: any[] = [];
  try {
    notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, userId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(20);
  } catch (err) {
    notifications = [];
  }

  let synthesizedNotifications: Array<{ id: string; type: string; title: string; message: string; createdAt: Date; isRead: boolean }> = [];

  try {
    const memberships = await db
      .select()
      .from(membershipsTable)
      .where(eq(membershipsTable.userId, userId));

    const groupIds = memberships.map((m: any) => m.groupId);

    if (groupIds.length > 0) {
      const recentExpenses = await db
        .select()
        .from(expensesTable)
        .where(inArray(expensesTable.groupId, groupIds))
        .orderBy(desc(expensesTable.createdAt))
        .limit(10);

      const payerIds = Array.from(new Set(recentExpenses.map((e: any) => e.payerId)));
      const payers = payerIds.length > 0
        ? await db.select().from(usersTable).where(inArray(usersTable.id, payerIds))
        : [];

      const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));

      for (const exp of recentExpenses) {
        if (exp.payerId !== userId) {
          const payer = payers.find((p: any) => p.id === exp.payerId);
          const group = groups.find((g: any) => g.id === exp.groupId);
          synthesizedNotifications.push({
            id: `exp-${exp.id}`,
            type: "expense_added",
            title: "New Expense Added",
            message: `${payer?.name || "A member"} added "${exp.description}" (${exp.amount} ${group?.currency || "INR"}) in ${group?.name || "group"}`,
            createdAt: exp.createdAt,
            isRead: false,
          });
        }
      }

      const recentSettlements = await db
        .select()
        .from(settlementsTable)
        .where(inArray(settlementsTable.groupId, groupIds))
        .orderBy(desc(settlementsTable.createdAt))
        .limit(10);

      for (const st of recentSettlements) {
        if (st.payerId === userId || st.receiverId === userId) {
          const payer = payers.find((p: any) => p.id === st.payerId);
          const group = groups.find((g: any) => g.id === st.groupId);
          synthesizedNotifications.push({
            id: `st-${st.id}`,
            type: "settlement_recorded",
            title: "Settlement Recorded",
            message: `${st.payerId === userId ? "You" : payer?.name || "Member"} recorded a settlement of ${st.amount} ${group?.currency || "INR"} in ${group?.name || "group"}`,
            createdAt: st.createdAt,
            isRead: false,
          });
        }
      }
    }
  } catch (err) {
    // Ignore synthesized notification errors gracefully
  }

  const dbNotifs = notifications.map((n: any) => ({
    id: `db-${n.id}`,
    type: n.type,
    title: n.title,
    message: n.message,
    createdAt: n.createdAt,
    isRead: n.read || n.isRead || false,
  }));

  const all = [...synthesizedNotifications, ...dbNotifs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  res.json(all);
});

router.post("/read-all", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  try {
    await db
      .update(notificationsTable)
      .set({ read: true } as any)
      .where(eq(notificationsTable.userId, userId));
  } catch (err) {
    // Ignore if table not present
  }

  res.json({ success: true });
});

export default router;