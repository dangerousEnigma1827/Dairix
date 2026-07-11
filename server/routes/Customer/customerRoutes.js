import express from "express";

import validate from "../../middlewares/validateMiddlewares.js";
import createDMSchema from "../../schemas/dmSchemas.js";
import { updateCustomerSubs } from "../../controllers/Customer/customerControllers.js";

const router = express.Router();

// CREATE DM (Owner only)
router.post(`/:customerId/products/manage`, updateCustomerSubs);


export default router;