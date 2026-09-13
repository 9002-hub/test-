import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import saleRoutes from "./routes/sales.js";
import reportRoutes from "./routes/reports.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.disable("x-powered-by");
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "ledger-pos-api" }));
app.use("/api/auth", authRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

const publicDir = path.resolve(__dirname, "../app");
app.use(express.static(publicDir));
app.get(/.*/, (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === "P2002") return res.status(409).json({ error: "A record with that value already exists" });
  if (err?.code === "P2025") return res.status(404).json({ error: "Record not found" });
  res.status(500).json({ error: process.env.NODE_ENV === "production" ? "Internal server error" : (err?.message || "Internal server error") });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`Ledger POS running on http://localhost:${port}`));
