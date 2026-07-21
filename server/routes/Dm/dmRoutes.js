import express from "express";
import { authenticate } from "../../middlewares/authMiddlewares.js";
import { getDmCustomers } from "../../controllers/Dm/dmControllers.js";

const router = express.Router();

router.get('/customers', getDmCustomers)

export default router;