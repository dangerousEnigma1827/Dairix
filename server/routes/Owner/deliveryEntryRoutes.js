import express from "express";
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { getDmTodayDeliveries } from "../../controllers/Owner/deliveryEntryControllers.js";
import { updateDeliveryStatus } from "../../controllers/Dm/deliveryEntryControllers.js";


const router = express.Router();

router.get(
    "/today",
    authenticate,
    getDmTodayDeliveries
);


router.post(
    "/delivery/:customerId",
    (req,res,next)=>{
        console.log("step 1");
        next();
    },
    authenticate,
    (req,res,next)=>{
        console.log("step 2");
        next();
    },

    updateDeliveryStatus
);

export default router;