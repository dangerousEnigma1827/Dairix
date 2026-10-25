import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { getDmTodayDeliveries } from "../../controllers/Owner/deliveryEntryControllers.js";
import { updateDeliveryStatus } from "../../controllers/Dm/deliveryEntryControllers.js";

const router = express.Router();

router.use(authenticate);

router.get("/today", requireRole("dm", "owner"), getDmTodayDeliveries);
router.post("/delivery/:customerId", requireRole("dm"), updateDeliveryStatus);

export default router;