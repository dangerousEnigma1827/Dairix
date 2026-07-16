import express from "express";
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { getDmTodayDeliveries } from "../../controllers/Owner/deliveryEntryControllers.js";


const router = express.Router();

router.get(
    "/today",
    authenticate,
    getDmTodayDeliveries
);

export default router;