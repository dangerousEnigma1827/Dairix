import User from "../models/userModels.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import cookieOptions from "../utils/cookieOptions.js";
import jsonwebtoken from "jsonwebtoken"
import bcrypt from 'bcrypt'

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup
// ─────────────────────────────────────────────────────────────────────────────
export const signup = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email, and password are required");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, hashedPassword, role });

  const token =  jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );

  return res
    .status(201)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(201, {user}, "Sign Up Successfull"))

});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  const token =  jwt.sign(
    {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(200, user, "User Logged In Successfully"))
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
export const logout = asyncHandler(async (_req, res) => {
  res
    .status(200)
    .cookie("token", "", { ...cookieOptions, maxAge: 0 })
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me   (protected — needs auth middleware, added in next step)
// ─────────────────────────────────────────────────────────────────────────────
export const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  res.json(new ApiResponse(200, { user }, "User fetched successfully"));
});