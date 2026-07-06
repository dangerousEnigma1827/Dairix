import Product from "../models/productModels.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createProduct = asyncHandler(async (req, res) => {

    const { name, price, unit, image } = req.body;

    const existingProduct = await Product.findOne({ name });

    if (existingProduct) {
        throw new ApiError(409, "Product already exists");
    }

    const product = await Product.create({
        name,
        price,
        unit,
        image,
    });

    return res.status(201).json(
        new ApiResponse(201, product, "Product created successfully")
    );
});