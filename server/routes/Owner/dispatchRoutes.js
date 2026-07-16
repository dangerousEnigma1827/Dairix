import express from "express";
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { createDispatch, getTodaysDispatch } from "../../controllers/Owner/dispatchControllers.js";

const router = express.Router();

router.post('/', authenticate,createDispatch)
router.get('/today', authenticate,getTodaysDispatch)

export default router;