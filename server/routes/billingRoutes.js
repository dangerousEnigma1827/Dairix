import express from "express";
import { authenticate, requireRole } from "../middlewares/authMiddlewares.js";
import {
    getMyStatement,
    getMyPayments,
    getDmBillingCustomers,
    getDmCollections,
    getDmCustomerStatement,
    recordDmPayment,
    getOwnerBillingOverview,
    getOwnerCustomerStatement,
    recordOwnerPayment,
    getOwnerPendingCollections,
    settleDmCollections,
    voidPayment,
} from "../controllers/billingControllers.js";

const router = express.Router();

router.use(authenticate);

// Customer: own bill and payment history
router.get("/customer/statement", requireRole("customer"), getMyStatement);
router.get("/customer/payments", requireRole("customer"), getMyPayments);

// Delivery partner: dues of assigned customers, doorstep collection, daily summary
router.get("/dm/customers", requireRole("dm"), getDmBillingCustomers);
router.get("/dm/customers/:customerId/statement", requireRole("dm"), getDmCustomerStatement);
router.get("/dm/collections", requireRole("dm"), getDmCollections);
router.post("/dm/payments", requireRole("dm"), recordDmPayment);

// Owner: business-wide billing, direct payments, DM cash handover
router.get("/owner/overview", requireRole("owner"), getOwnerBillingOverview);
router.get("/owner/customers/:customerId/statement", requireRole("owner"), getOwnerCustomerStatement);
router.post("/owner/payments", requireRole("owner"), recordOwnerPayment);
router.patch("/owner/payments/:paymentId/void", requireRole("owner"), voidPayment);
router.get("/owner/collections", requireRole("owner"), getOwnerPendingCollections);
router.post("/owner/collections/settle", requireRole("owner"), settleDmCollections);

export default router;
