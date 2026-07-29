import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/auth.js";
import { RegisterBody, LoginBody } from "@workspace/api-zod";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { name, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Conflict", message: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db
    .insert(usersTable)
    .values({ name, email, passwordHash })
    .returning();

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
  });
});

router.post("/login", async (req: Request, res: Response) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation error", message: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Unauthorized", message: "Invalid credentials" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt },
  });
});

router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }
  res.json({ id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl, createdAt: user.createdAt });
});

export default router;
