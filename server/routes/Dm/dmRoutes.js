import express from "express";
import { authenticate } from "../../middlewares/authMiddlewares.js";
import { getDmCustomers } from "../../controllers/Dm/dmControllers.js";

const router = express.Router();

router.get('/customers', (req,res,next)=>{
    console.log("sdghfbgh")
    next();
},authenticate,
(req,res,next)=>{
    console.log("abscd")
    next();
},
getDmCustomers)

export default router;