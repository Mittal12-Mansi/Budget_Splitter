import { Router, Request, Response } from "express";
import { db, groupsTable, membershipsTable, expensesTable, expenseSplitsTable, usersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import { invalidateCache } from "../lib/cache.js";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireAuth);

const formatUser = (user: any) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
});

router.get("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userMemberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.userId, userId));

  const groupIds = userMemberships.map((m: any) => m.groupId);
  if (groupIds.length === 0) {
    res.json([]);
    return;
  }

  const groups = await db.select().from(groupsTable).where(inArray(groupsTable.id, groupIds));
  const allMemberships = await db.select().from(membershipsTable).where(inArray(membershipsTable.groupId, groupIds));
  const allExpenses = await db.select().from(expensesTable).where(inArray(expensesTable.groupId, groupIds));
  const expenseIds = allExpenses.map((e: any) => e.id);
  const allSplits = expenseIds.length > 0
    ? await db.select().from(expenseSplitsTable).where(inArray(expenseSplitsTable.expenseId, expenseIds))
    : [];

  const result = groups.map((g: any) => {
    const groupMembers = allMemberships.filter((m: any) => m.groupId === g.id);
    const groupExpenses = allExpenses.filter((e: any) => e.groupId === g.id);
    const totalExpenses = groupExpenses.reduce((s: number, e: any) => s + parseFloat(e.amount as string || "0"), 0);

    const paidByMe = groupExpenses
      .filter((e: any) => e.payerId === userId)
      .reduce((s: number, e: any) => s + parseFloat(e.amount as string || "0"), 0);

    const groupExpenseIds = new Set(groupExpenses.map((e: any) => e.id));
    const owedByMe = allSplits
      .filter((s: any) => groupExpenseIds.has(s.expenseId) && s.userId === userId)
      .reduce((s: number, sRecord: any) => s + parseFloat(sRecord.amount as string || "0"), 0);

    const myBalance = Math.round((paidByMe - owedByMe) * 100) / 100;

    return {
      ...g,
      memberCount: groupMembers.length,
      totalExpenses,
      myBalance,
    };
  });

  res.json(result);
});

router.post("/", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, description, currency } = req.body as {
    name: string;
    description?: string;
    currency?: string;
  };

  if (!name) {
    res.status(400).json({ error: "Validation error", message: "Group name is required" });
    return;
  }

  const [group] = await db
    .insert(groupsTable)
    .values({
      name,
      description: description || null,
      currency: currency || "INR",
      ownerId: userId,
    })
    .returning();

  await db.insert(membershipsTable).values({
    groupId: group.id,
    userId,
    role: "owner",
  });

  invalidateCache(`dashboard:user:${userId}`);
  res.status(201).json(group);
});

router.get("/:groupId", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const userId = req.user!.userId;

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Not found", message: "Group not found" });
    return;
  }

  const isMember = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, userId)))
    .limit(1);

  if (isMember.length === 0) {
    res.status(403).json({ error: "Forbidden", message: "Not a member of this group" });
    return;
  }

  const memberships = await db
    .select()
    .from(membershipsTable)
    .where(eq(membershipsTable.groupId, groupId));

  const userIds = memberships.map((m: any) => m.userId);
  const users = userIds.length > 0
    ? await db.select().from(usersTable).where(inArray(usersTable.id, userIds))
    : [];

  const expenses = await db.select().from(expensesTable).where(eq(expensesTable.groupId, groupId));
  const splits = expenses.length > 0
    ? await db.select().from(expenseSplitsTable).where(
        inArray(expenseSplitsTable.expenseId, expenses.map((e: any) => e.id))
      )
    : [];

  const members = memberships.map((m: any) => {
    const user = users.find((u: any) => u.id === m.userId)!;
    const totalPaid = expenses
      .filter((e: any) => e.payerId === m.userId)
      .reduce((s: number, e: any) => s + parseFloat(e.amount as string), 0);
    const totalOwed = splits
      .filter((s: any) => s.userId === m.userId)
      .reduce((s: number, split: any) => s + parseFloat(split.amount as string), 0);
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
  const groupId = parseInt((req.params as any).groupId);
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
  const groupId = parseInt((req.params as any).groupId);
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
  const groupId = parseInt((req.params as any).groupId);
  const { email, name, phone } = req.body as { email?: string; name?: string; phone?: string };

  let cleanEmail = email ? email.toLowerCase().trim() : "";
  let cleanName = name ? name.trim() : "";
  let cleanPhone = phone ? phone.trim() : "";

  if (!cleanName && !cleanEmail && !cleanPhone) {
    res.status(400).json({ error: "Validation error", message: "Name, Phone number, or Email is required" });
    return;
  }

  if (!cleanEmail) {
    const sanitizePhone = cleanPhone.replace(/\D/g, "");
    const sanitizeName = (cleanName || "member").toLowerCase().replace(/\s+/g, "");
    cleanEmail = `${sanitizeName || "user"}_${sanitizePhone || Date.now().toString().slice(-6)}@split.app`;
  }

  let targetUser: any = null;

  if (cleanEmail) {
    [targetUser] = await db.select().from(usersTable).where(eq(usersTable.email, cleanEmail)).limit(1);
  }

  if (!targetUser) {
    const formattedName = cleanName || cleanEmail.split("@")[0];
    const defaultPassword = await bcrypt.hash("Password123!", 10);

    [targetUser] = await db
      .insert(usersTable)
      .values({
        name: formattedName,
        email: cleanEmail,
        passwordHash: defaultPassword,
      })
      .returning();
  }

  const existing = await db
    .select()
    .from(membershipsTable)
    .where(and(eq(membershipsTable.groupId, groupId), eq(membershipsTable.userId, targetUser.id)))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "User is already a member of this group" });
    return;
  }

  const [membership] = await db
    .insert(membershipsTable)
    .values({ groupId, userId: targetUser.id, role: "member" })
    .returning();

  invalidateCache(`group:${groupId}`);
  res.status(201).json({ ...membership, user: targetUser });
});

router.delete("/:groupId/members/:userId", async (req: Request, res: Response) => {
  const groupId = parseInt((req.params as any).groupId);
  const targetUserId = parseInt((req.params as any).userId);
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
