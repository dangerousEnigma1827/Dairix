import express from "express";
import {authenticate} from "../../middlewares/authMiddlewares.js";
import { createDispatch } from "../../controllers/Owner/dispatchControllers.js";

const router = express.Router();

router.post('/', authenticate,createDispatch)

export default router;