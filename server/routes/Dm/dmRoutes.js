import express from "express";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import { getDmCustomers, getDmCustomersById, updateDmProfile } from "../../controllers/Dm/dmControllers.js";

const router = express.Router();

router.get('/customers', authenticate, requireRole("dm"), getDmCustomers);
router.get('/:dmId/customers', authenticate, requireRole("owner", "dm"), getDmCustomersById);
router.put('/profile', authenticate, requireRole("dm"), updateDmProfile);
router.patch('/profile', authenticate, requireRole("dm"), updateDmProfile);

export default router;