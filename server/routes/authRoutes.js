import { Router } from "express";
import { signup, login, logout, getMe } from "../controllers/authControllers.js";
// import { authenticate } from "../middlewares/authMiddlewares.js";
import { signUpSchema, loginSchema } from "../schemas/authSchemas.js";
import validate from '../middlewares/validateMiddlewares.js'


const router = Router();

router.post("/signup", validate(signUpSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authenticate, getMe); // protected

export default router;