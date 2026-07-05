import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser())


app.get("/api/health", (req, res) => {
  res.json({ status: "ok", project: "Dairix", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ status: "ok", project: "Dairix", timestamp: new Date().toISOString() });
});

// ── Routes (mount here as you build them) ─────────────────────────────────────
// import authRoutes from "./routes/auth.routes.js";
// app.use("/api/auth", authRoutes);

import authRoutes from "./routes/authRoutes.js"
app.use('/api/auth', authRoutes)

// ── 404 + global error handler (must be last) ──────────────────────────────────

export default app;