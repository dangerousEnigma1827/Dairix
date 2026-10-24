import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { getWeeklyStats } from "../../controllers/Owner/dashboardControllers.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

router.use(authenticate, requireRole("owner"));

router.get("/weekly-stats", rateLimiter, getWeeklyStats);

export default router;