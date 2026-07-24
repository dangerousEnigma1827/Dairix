import express from "express";

import validate from "../../middlewares/validateMiddlewares.js";
import createDMSchema from "../../schemas/dmSchemas.js";
import { getMonthlyDeliveryTrack, getTodaysDeliveryStatus, getWeeklyDeliveryTrack, updateCustomerSubs } from "../../controllers/Customer/customerControllers.js";
import { authenticate } from "../../middlewares/authMiddlewares.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

// CREATE DM (Owner only)
router.post(`/:customerId/products/manage`, updateCustomerSubs);

router.get('/deliveries/today', authenticate, rateLimiter, getTodaysDeliveryStatus)

router.get('/deliveries/monthly', authenticate, rateLimiter, getMonthlyDeliveryTrack)
router.get('/deliveries/weekly', authenticate, rateLimiter, getWeeklyDeliveryTrack)


export default router;