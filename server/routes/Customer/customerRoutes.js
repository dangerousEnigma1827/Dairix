import express from "express";
import {
  getMonthlyDeliveryTrack,
  getTodaysDeliveryStatus,
  getWeeklyDeliveryTrack,
  updateCustomerSubs,
} from "../../controllers/Customer/customerControllers.js";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

// Customer or Owner can update customer subscriptions
router.post("/:customerId/products/manage", authenticate, requireRole("customer", "owner"), updateCustomerSubs);

// Customer delivery tracking
router.get("/deliveries/today", authenticate, requireRole("customer"), rateLimiter, getTodaysDeliveryStatus);
router.get("/deliveries/monthly", authenticate, requireRole("customer"), rateLimiter, getMonthlyDeliveryTrack);
router.get("/deliveries/weekly", authenticate, requireRole("customer"), rateLimiter, getWeeklyDeliveryTrack);

export default router;