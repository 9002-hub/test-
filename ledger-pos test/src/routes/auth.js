import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true }
  });
  res.json(users);
});

router.post("/login", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    pin: z.string().regex(/^\d{4}$/)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "User and 4-digit PIN are required" });

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user || !user.active) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await bcrypt.compare(parsed.data.pin, user.pinHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role }
  });
});

router.get("/me", auth, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name, role: req.user.role });
});

export default router;
