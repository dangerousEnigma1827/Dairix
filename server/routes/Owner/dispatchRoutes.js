import express from "express";
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { createDispatch, getTodaysDispatch } from "../../controllers/Owner/dispatchControllers.js";
import { rateLimiter } from "../../middlewares/rateLimiterMiddlewares.js";

const router = express.Router();

router.post('/', authenticate,rateLimiter,reateDispatch)
router.get('/today', authenticate,rateLimiter,getTodaysDispatch)

export default router;