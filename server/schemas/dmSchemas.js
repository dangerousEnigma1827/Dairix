import { z } from "zod";

const createDMSchema = z.object({
    name: z
        .string()
        .min(2, "Name is too short")
        .max(50, "Name is too long")
        .trim(),

    mobile: z
        .string()
        .regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits"),

    password: z
        .string()
        .min(6, "Password must be at least 6 characters")
        .max(50, "Password too long")
});

export default createDMSchema