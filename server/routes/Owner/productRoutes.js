import express from "express";
import {
    createProduct,
    getProducts,
    // updateProduct,
    // deleteProduct,
} from "../../controllers/Owner/productControllers.js";
import { authenticate, requireRole } from "../../middlewares/authMiddlewares.js";
import productSchema from "../../schemas/productSchema.js";
import validate from "../../middlewares/validateMiddlewares.js";

const router = express.Router();

router.post("/", authenticate, requireRole("owner"), validate(productSchema), createProduct);
router.get("/", authenticate, getProducts);
// router.patch("/:id", authenticate, requireRole("owner"), updateProduct);
// router.delete("/:id", authenticate, requireRole("owner"), deleteProduct);

export default router;