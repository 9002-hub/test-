import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const products = [
  ["White T-Shirt (M)", "100001", "Apparel", 12.99, 40, 8],
  ["Denim Jeans", "100002", "Apparel", 34.50, 18, 5],
  ["Ceramic Mug", "100003", "Home", 8.00, 6, 10],
  ["Notebook A5", "100004", "Stationery", 3.25, 60, 15],
  ["Ballpoint Pen", "100005", "Stationery", 0.99, 200, 30],
  ["Canvas Tote Bag", "100006", "Accessories", 15.00, 22, 8],
  ["Sunglasses", "100007", "Accessories", 19.99, 9, 5],
  ["Water Bottle 1L", "100008", "Home", 11.50, 30, 10]
];

async function main() {
  const adminPin = await bcrypt.hash("1234", 12);
  const cashierPin = await bcrypt.hash("1111", 12);

  await prisma.user.upsert({
    where: { id: "seed-admin" },
    update: {},
    create: { id: "seed-admin", name: "Store Admin", role: "ADMIN", pinHash: adminPin }
  });

  await prisma.user.upsert({
    where: { id: "seed-cashier" },
    update: {},
    create: { id: "seed-cashier", name: "Cashier One", role: "CASHIER", pinHash: cashierPin }
  });

  for (const [name, barcode, category, price, stock, lowStockLevel] of products) {
    await prisma.product.upsert({
      where: { barcode },
      update: {},
      create: { name, barcode, category, price, stock, lowStockLevel }
    });
  }

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, storeName: "My Store", taxRate: 0, currency: "$" }
  });

  console.log("Seed complete.");
}

main().finally(() => prisma.$disconnect());
