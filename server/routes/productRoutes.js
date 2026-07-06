import express from "express";
import { createProduct } from "../controllers/productControllers.js";
import validate from "../middlewares/validateMiddlewares.js";
import productSchema from "../schemas/productSchema.js"

const router = express.Router();

router.post("/", createProduct);
// router.get("/", getProducts);
// router.patch("/:id", updateProduct);
// router.delete("/:id", deleteProduct);

export default router;