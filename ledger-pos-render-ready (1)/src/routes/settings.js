import { Router } from "express";
import { prisma } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const settings = await prisma.setting.findUnique({ where: { id: 1 } });
  res.json(settings || { id: 1, storeName: "My Store", taxRate: 0, currency: "$" });
});

export default router;
