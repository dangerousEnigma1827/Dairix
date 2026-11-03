import { Router } from "express";
import { signup, login, logout, getMe, updateMe, getUserFromId } from "../controllers/authControllers.js";
import { authenticate } from "../middlewares/authMiddlewares.js";
import { signUpSchema, loginSchema } from "../schemas/authSchemas.js";
import validate from '../middlewares/validateMiddlewares.js'

const router = Router();

router.post("/signup", validate(signUpSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/logout", authenticate, logout);
router.get("/me", authenticate, (req,res)=>{
    getMe(req,res);
});
router.put("/me", authenticate, updateMe);
router.patch("/me", authenticate, updateMe);
router.get(`/:_id`, authenticate, getUserFromId); // protected

export default router;