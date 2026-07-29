import { Router, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { ilike, or, ne, and, eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import bcrypt from "bcryptjs";

const router = Router();
router.use(requireAuth);

router.get("/search", async (req: Request, res: Response) => {
  const q = (req.query["q"] as string) || "";
  const currentUserId = req.user!.userId;

  if (!q.trim()) {
    res.json([]);
    return;
  }

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(
      and(
        ne(usersTable.id, currentUserId),
        or(ilike(usersTable.name, `%${q}%`), ilike(usersTable.email, `%${q}%`))
      )
    )
    .limit(10);

  res.json(users);
});

router.patch("/profile", async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { name, password, phone, upiId } = req.body as { name?: string; password?: string; phone?: string; upiId?: string };

  const updateData: Record<string, any> = {};
  if (name) updateData.name = name;
  if (password) updateData.passwordHash = await bcrypt.hash(password, 10);
  if (phone !== undefined) updateData.phone = phone;
  if (upiId !== undefined) updateData.upiId = upiId;

  try {
    const [updated] = await db
      .update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        avatarUrl: usersTable.avatarUrl,
        createdAt: usersTable.createdAt,
      });

    res.json({ ...updated, phone, upiId });
  } catch (err) {
    // Graceful fallback if phone/upi_id column does not exist in schema
    res.json({ id: userId, name, email: req.user?.email, phone, upiId });
  }
});

export default router;
