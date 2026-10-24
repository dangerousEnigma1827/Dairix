import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { getDmTodayDeliveries } from "../../controllers/Owner/deliveryEntryControllers.js";
import { updateDeliveryStatus } from "../../controllers/Dm/deliveryEntryControllers.js";

const router = express.Router();

router.use(authenticate, requireRole("dm", "owner"));

router.get("/today", getDmTodayDeliveries);
router.post("/delivery/:customerId", updateDeliveryStatus);

export default router;