import express from "express";
import {
    createProduct,
    getProducts,
    // updateProduct,
    // deleteProduct,
} from "../controllers/productControllers.js";

import productSchema from "../schemas/productSchema.js"
import validate from "../middlewares/validateMiddlewares.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
// router.patch("/:id", updateProduct);
// router.delete("/:id", deleteProduct);

export default router;