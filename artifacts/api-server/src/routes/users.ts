import { Router, Request, Response } from "express";
import { db, usersTable } from "@workspace/db";
import { like, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();
router.use(requireAuth);

router.get("/search", async (req: Request, res: Response) => {
  const q = req.query["q"] as string;
  if (!q || q.length < 2) {
    res.json([]);
    return;
  }

  const users = await db
    .select()
    .from(usersTable)
    .where(
      or(
        like(usersTable.email, `%${q}%`),
        like(usersTable.name, `%${q}%`)
      )
    )
    .limit(10);

  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    }))
  );
});

export default router;
