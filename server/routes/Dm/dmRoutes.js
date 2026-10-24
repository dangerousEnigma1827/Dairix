import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { getDmCustomers, getDmCustomersById } from "../../controllers/Dm/dmControllers.js";

const router = express.Router();

router.get('/customers', authenticate, requireRole("dm"), getDmCustomers);
router.get('/:dmId/customers', authenticate, requireRole("owner", "dm"), getDmCustomersById);

export default router;