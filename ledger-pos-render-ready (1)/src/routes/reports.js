import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const router = Router();
router.use(auth);

router.get("/summary", async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days || 7), 1), 365);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  const where = {
    timestamp: { gte: start },
    ...(req.user.role === "ADMIN" ? {} : { cashierId: req.user.id })
  };

  const sales = await prisma.sale.findMany({
    where,
    include: { items: true }
  });

  const revenue = sales.reduce((s, x) => s + Number(x.total), 0);
  const todayKey = new Date().toDateString();
  const todaySales = sales.filter(s => new Date(s.timestamp).toDateString() === todayKey);

  const productTotals = {};
  for (const sale of sales) {
    for (const item of sale.items) {
      productTotals[item.name] = (productTotals[item.name] || 0) + item.qty;
    }
  }

  const topProducts = Object.entries(productTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, qty]) => ({ name, qty }));

  res.json({
    days,
    todayRevenue: todaySales.reduce((s, x) => s + Number(x.total), 0),
    todayTransactions: todaySales.length,
    rangeRevenue: revenue,
    transactionCount: sales.length,
    averageTicket: sales.length ? revenue / sales.length : 0,
    topProducts
  });
});

export default router;
