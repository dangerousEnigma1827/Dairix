import { z } from "zod";

const productSchema = z.object({
    name: z
        .string()
        .trim()
        .min(2, "Product name must be at least 2 characters")
        .max(50, "Product name is too long"),

    price: z
        .number({
            required_error: "Price is required",
        })
        .positive("Price must be greater than 0"),

    unit: z
        .string()
        .trim()
        .min(1, "Unit is required")
        .max(20, "Unit is too long"),

    image: z
        .string()
        .url("Please provide a valid image URL"),
});

export default productSchema;