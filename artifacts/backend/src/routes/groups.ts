import { Router, Request, Response } from "express";
import { db, usersTable, groupsTable, membershipsTable, expensesTable, expenseSplitsTable } from "@workspace/db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";

const router = Router();
router.use(requireAuth);

function formatUser(u: { id: number; name: string; email: string; avatarUrl: string | null; createdAt: Date }) {
  return { id: u.id, name: u.name, email: u.email, avatarUrl: u.avatarUrl, createdAt: u.createdAt };
}

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  if (memberships.length === 0) {
    res.json([]);
    return;
  }

  const groupIds = memberships.map((m) => m.groupId);
  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));

  const result = await Promise.all(
    groups.map(async (g) => {
      const members = await db.select().from(membershipsTable).where(eq(membershipsTable.groupId, g.id));
      const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, g.id));
      const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount as string), 0);

      const splits = expenses.length > 0
        ? await db.select().from(expenseSplitsTable).where(
            inArray(expenseSplitsTable.expenseId, expenses.map((e) => e.id))
          )
        : [];

      const totalPaid = expenses
        .filter((e) => e.payerId === userId)
        .reduce((s, e) => s + parseFloat(e.amount as string), 0);
      const totalOwed = splits
        .filter((s) => s.userId === userId)
        .reduce((s, split) => s + parseFloat(split.amount as string), 0);
      const myBalance = totalPaid - totalOwed;

      return {
        id: g.id,
        name: g.name,
        description: g.description,
        currency: g.currency,
        ownerId: g.ownerId,
        createdAt: g.createdAt,
        memberCount: members.length,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        myBalance: Math.round(myBalance * 100) / 100,
      };
    })
  );

  res.json(result);
});

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, description, currency } = req.body as { name: string; description?: string; currency?: string };
  if (!name) {
    res.status(400).json({ error: "Validation error", message: "name is required" });
    return;
  }

  const [group] = await db
    .insert(groupsTable)
    .values({ name, description, currency: currency ?? "USD", ownerId: userId })
    .returning();

  await db.insert(membershipsTable).values({ groupId: group.id, userId, role: "owner" });
  invalidateCache(`dashboard:user:${userId}`);
  res.status(201).json(group);
});

router.get("/:groupId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const isMember = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, userId)))
    .limit(1);
  if (isMember.length === 0) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.groupId, groupId));

  const userIds = memberships.map((m) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, groupId));
  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e) => e.id))
      )
    : [];

  const members = memberships.map((m) => {
    const user = users.find((u) => u.id === m.userId)!;
    const totalPaid = expenses
      .filter((e) => e.payerId === m.userId)
      .reduce((s, e) => s + parseFloat(e.amount as string), 0);
    const totalOwed = splits
      .filter((s) => s.userId === m.userId)
      .reduce((s, split) => s + parseFloat(split.amount as string), 0);
    return {
      id: m.id,
      userId: m.userId,
      role: m.role,
      joinedAt: m.joinedAt,
      user: formatUser(user),
      balance: Math.round((totalPaid - totalOwed) * 100) / 100,
    };
  });

  res.json({ ...group, members });
});

router.patch("/:groupId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group || group.ownerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { name, description, currency } = req.body as Partial<{ name: string; description: string; currency: string }>;
  const [updated] = await db
    .update(groupsTable)
    .set({ ...(name && { name }), ...(description !== undefined && { description }), ...(currency && { currency }) })
    .where(eq(groupsTable.id, groupId))
    .returning();

  res.json(updated);
});

router.delete("/:groupId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const userId = req.user!.userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group || group.ownerId !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db.delete(groupsTable).where(eq(groupsTable.id, groupId));
  invalidateCache(`group:${groupId}`);
  invalidateCache(`dashboard:user:${userId}`);
  res.status(204).send();
});

router.post("/:groupId/members", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const { email } = req.body as { email: string };

  const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!targetUser) {
    res.status(404).json({ error: "Not found", message: "User with that email not found" });
    return;
  }

  const existing = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, targetUser.id)))
    .limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "User is already a member" });
    return;
  }

  const [membership] = await db
    .insert(membershipsTable)
    .values({ groupId, userId: targetUser.id, role: "member" })
    .returning();

  invalidateCache(`group:${groupId}`);
  res.status(201).json(membership);
});

router.delete("/:groupId/members/:userId", async (req: Request, res: Response) => {
  const groupId = parseInt(req.params["groupId"]!);
  const targetUserId = parseInt(req.params["userId"]!);
  const requesterId = req.user!.userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (group.ownerId !== requesterId && targetUserId !== requesterId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  await db
    .delete(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, targetUserId)));

  invalidateCache(`group:${groupId}`);
  res.status(204).send();
});

export default router;
