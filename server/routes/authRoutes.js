import { Router } from "express";
import { signup, login, logout, getMe, getUserFromId } from "../controllers/authControllers.js";
import { authenticate } from "../middlewares/authMiddlewares.js";
import { signUpSchema, loginSchema } from "../schemas/authSchemas.js";
import validate from '../middlewares/validateMiddlewares.js'

const router = Router();

// router.post("/signup", validate(signUpSchema), signup);
router.post("/signup", signup);
// router.post("/login", validate(loginSchema), login);
router.post("/login", login);
router.post("/logout",authenticate, logout);
router.get("/me", authenticate, getMe); // protected
router.get(`/:_id`, authenticate, getUserFromId); // protected

export default router;