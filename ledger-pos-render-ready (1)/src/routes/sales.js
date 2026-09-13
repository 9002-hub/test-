import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

const saleSchema = z.object({
  items: z.array(z.object({
    productId: z.string().min(1),
    qty: z.coerce.number().int().positive()
  })).min(1),
  payment: z.enum(["CASH", "CARD", "MOBILE"])
});

router.post("/", async (req, res) => {
  const parsed = saleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid sale", details: parsed.error.flatten() });

  try {
    const merged = new Map();
    for (const item of parsed.data.items) merged.set(item.productId, (merged.get(item.productId) || 0) + item.qty);
    const requestedItems = [...merged.entries()].map(([productId, qty]) => ({ productId, qty }));

    const sale = await prisma.$transaction(async (tx) => {
      const ids = requestedItems.map(i => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: ids }, active: true } });
      const byId = new Map(products.map(p => [p.id, p]));
      let subtotal = 0;
      const lines = [];

      for (const item of requestedItems) {
        const product = byId.get(item.productId);
        if (!product) throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        const price = Number(product.price);
        subtotal += price * item.qty;
        lines.push({ product, qty: item.qty, price });
      }

      for (const line of lines) {
        const updated = await tx.product.updateMany({
          where: { id: line.product.id, active: true, stock: { gte: line.qty } },
          data: { stock: { decrement: line.qty } }
        });
        if (updated.count !== 1) throw new Error(`INSUFFICIENT_STOCK:${line.product.name}`);
      }

      const setting = await tx.setting.findUnique({ where: { id: 1 } });
      const taxRate = Number(setting?.taxRate || 0);
      const tax = subtotal * taxRate / 100;
      const total = subtotal + tax;

      const created = await tx.sale.create({
        data: {
          cashierId: req.user.id,
          subtotal,
          tax,
          total,
          payment: parsed.data.payment,
          items: { create: lines.map(l => ({ productId: l.product.id, name: l.product.name, qty: l.qty, price: l.price })) }
        },
        include: { items: true, cashier: { select: { id: true, name: true } } }
      });

      for (const line of lines) {
        await tx.stockMovement.create({
          data: {
            productId: line.product.id,
            userId: req.user.id,
            before: line.product.stock,
            change: -line.qty,
            after: line.product.stock - line.qty,
            reason: `Sale ${created.id}`
          }
        });
      }

      return created;
    });

    res.status(201).json(sale);
  } catch (e) {
    if (e.message.startsWith("PRODUCT_NOT_FOUND:")) return res.status(404).json({ error: "Product not found" });
    if (e.message.startsWith("INSUFFICIENT_STOCK:")) return res.status(409).json({ error: e.message.replace("INSUFFICIENT_STOCK:", "Not enough stock: ") });
    throw e;
  }
});

router.get("/", async (req, res) => {
  const where = req.user.role === "ADMIN" ? {} : { cashierId: req.user.id };
  const sales = await prisma.sale.findMany({
    where,
    include: { items: true, cashier: { select: { name: true } } },
    orderBy: { timestamp: "desc" }
  });
  res.json(sales);
});

export default router;
