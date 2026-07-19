import express from "express";

import validate from "../../middlewares/validateMiddlewares.js";
import createDMSchema from "../../schemas/dmSchemas.js";
import { getTodaysDeliveryStatus, updateCustomerSubs } from "../../controllers/Customer/customerControllers.js";
import { authenticate } from "../../middlewares/authMiddlewares.js";

const router = express.Router();

// CREATE DM (Owner only)
router.post(`/:customerId/products/manage`, updateCustomerSubs);

router.get('/deliveries/today', authenticate, getTodaysDeliveryStatus)


export default router;