import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { createDispatch, getTodaysDispatch } from "../../controllers/Owner/dispatchControllers.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

router.use(authenticate, requireRole("owner"));

router.post('/', rateLimiter, createDispatch);
router.get('/today', rateLimiter, getTodaysDispatch);

export default router;