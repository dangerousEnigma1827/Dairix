import { z } from "zod";

export const addressSchema = z.object({
  houseNo: z.string().optional(),
  street: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
}).optional();

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required"),

  mobile: z
    .string()
    .trim()
    .min(10, "Enter a valid mobile number"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),

  confirmPassword: z.string().optional(),

  role: z
    .enum(["owner", "dm", "customer"])
    .optional(),

  address: addressSchema,
  deliveryNotes: z.string().optional(),
}).passthrough();

export const loginSchema = z.object({
  mobile: z
    .string()
    .trim()
    .min(1, "Mobile number is required"),

  password: z
    .string()
    .min(1, "Password is required"),
}).passthrough();