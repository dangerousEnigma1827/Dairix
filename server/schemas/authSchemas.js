import { z } from "zod";

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),

  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),

  role: z
    .enum(["owner", "dm", "customer"])
    .optional(),
});

export const loginSchema = z.object({
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});