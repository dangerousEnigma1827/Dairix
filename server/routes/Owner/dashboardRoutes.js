import express from "express"
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { getWeeklyStats } from "../../controllers/Owner/dashboardControllers.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

router.get("/weekly-stats", authenticate, rateLimiter,getWeeklyStats);

export default router;