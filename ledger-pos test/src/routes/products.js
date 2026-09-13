import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { auth, adminOnly } from "../middleware/auth.js";

const router = Router();
router.use(auth);

const productSchema = z.object({
  name: z.string().min(1),
  barcode: z.string().min(1),
  category: z.string().optional().default(""),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  lowStockLevel: z.coerce.number().int().min(0).default(5)
});

router.get("/", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const products = await prisma.product.findMany({
    where: {
      active: true,
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { barcode: { contains: q } }] } : {})
    },
    orderBy: { name: "asc" }
  });
  res.json(products);
});

router.get("/barcode/:barcode", async (req, res) => {
  const product = await prisma.product.findUnique({ where: { barcode: req.params.barcode } });
  if (!product || !product.active) return res.status(404).json({ error: "Product not found" });
  res.json(product);
});

router.post("/", adminOnly, async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product data", details: parsed.error.flatten() });

  try {
    const product = await prisma.product.create({
      data: {
        ...parsed.data,
        category: parsed.data.category || null
      }
    });
    res.status(201).json(product);
  } catch (e) {
    if (e.code === "P2002") return res.status(409).json({ error: "Barcode already exists" });
    throw e;
  }
});

router.put("/:id", adminOnly, async (req, res) => {
  const parsed = productSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid product data" });

  try {
    const product = await prisma.product.update({ where: { id: req.params.id }, data: parsed.data });
    res.json(product);
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

router.delete("/:id", adminOnly, async (req, res) => {
  await prisma.product.update({
    where: { id: req.params.id },
    data: { active: false }
  });
  res.status(204).end();
});

router.patch("/:id/stock", async (req, res) => {
  const parsed = z.object({
    stock: z.coerce.number().int().min(0)
  }).safeParse(req.body);

  if (!parsed.success) return res.status(400).json({ error: "Stock must be a non-negative integer" });

  const result = await prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: req.params.id } });
    if (!product) throw new Error("NOT_FOUND");

    const before = product.stock;
    const after = parsed.data.stock;

    const updated = await tx.product.update({
      where: { id: product.id },
      data: { stock: after }
    });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        userId: req.user.id,
        before,
        change: after - before,
        after,
        reason: "Manual stock adjustment"
      }
    });

    return updated;
  }).catch(e => e.message === "NOT_FOUND" ? null : Promise.reject(e));

  if (!result) return res.status(404).json({ error: "Product not found" });
  res.json(result);
});

export default router;
