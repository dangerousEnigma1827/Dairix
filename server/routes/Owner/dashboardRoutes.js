import express from "express"
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { getWeeklyStats } from "../../controllers/Owner/dashboardControllers.js";

const router = express.Router();

router.get("/dashboard/weekly-stats", authenticate, getWeeklyStats);

export default router;