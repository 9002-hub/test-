import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = Router();
router.use(auth, adminOnly);

router.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, role: true, active: true, createdAt: true }
  });
  res.json(users);
});

router.post("/users", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(1),
    role: z.enum(["ADMIN", "CASHIER"]),
    pin: z.string().regex(/^\d{4}$/)
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Name, role and 4-digit PIN are required" });

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      role: parsed.data.role,
      pinHash: await bcrypt.hash(parsed.data.pin, 12)
    },
    select: { id: true, name: true, role: true, active: true }
  });

  res.status(201).json(user);
});

router.put("/users/:id", async (req, res) => {
  const parsed = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(["ADMIN", "CASHIER"]).optional(),
    pin: z.string().regex(/^\d{4}$/).optional(),
    active: z.boolean().optional()
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid user data" });

  const data = { ...parsed.data };
  if (data.pin) {
    data.pinHash = await bcrypt.hash(data.pin, 12);
    delete data.pin;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: { id: true, name: true, role: true, active: true }
  });

  res.json(user);
});

router.delete("/users/:id", async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot delete yourself" });
  await prisma.user.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).end();
});

router.get("/settings", async (_req, res) => {
  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  res.json(settings);
});

router.put("/settings", async (req, res) => {
  const parsed = z.object({
    storeName: z.string().min(1),
    taxRate: z.coerce.number().min(0),
    currency: z.string().min(1).max(8)
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Invalid settings" });

  const settings = await prisma.setting.upsert({
    where: { id: 1 },
    update: parsed.data,
    create: { id: 1, ...parsed.data }
  });

  res.json(settings);
});

export default router;
