import User from "../models/userModels.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import cookieOptions from "../utils/cookieOptions.js";
import jwt from "jsonwebtoken"
import bcrypt from 'bcrypt'
import { redisClient } from "../config/redis.js";


export const signup = asyncHandler(async (req, res) => {
  const { 
    name, 
    mobile, 
    password,
    address,
    deliveryNotes
  } = req.body;

  console.log("recieved1")

  const existingUser = await User.findOne({ mobile });

  console.log("recieved2")

  if (existingUser){
    throw new ApiError(409, "An account with this mobile already exists");
  }


  const hashedPassword = await bcrypt.hash(password, 10);

  // console.log("recieved2")

  const user = await User.create({
    name,
    mobile,
    password: hashedPassword,

    role: "customer",

    address,
    deliveryNotes
  });



  const token = jwt.sign(
    {
      _id: user._id,
      mobile: user.mobile,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );


  return res
    .status(201)
    .cookie("token", token, cookieOptions)
    .json(
      new ApiResponse(
        201,
        { user },
        "Signup Successful"
      )
    );

});

export const login = asyncHandler(async (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) {
    throw new ApiError(400, "mobile and password are required");
  }

  const user = await User.findOne({ mobile }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid mobile or password");
  }

  const isMatch = await bcrypt.compare(password, user.password)

  if (!isMatch) {
    throw new ApiError(401, "Invalid mobile or password");
  }

  const token =  jwt.sign(
    {
      _id: user._id,
      mobile: user.mobile,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(new ApiResponse(200, {user}, "User Logged In Successfully"))
});


export const logout = asyncHandler(async (_req, res) => {
  res
    .status(200)
    .cookie("token", "", { ...cookieOptions, maxAge: 0 })
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});


export const getMe = asyncHandler(async (req, res) => {
  const cache = await redisClient.get(`customer:${req.user._id}`);
  if(cache){
    return res.json(new ApiResponse(200, cache, "User fetched successfully"));
  }

  const user = await User.findById(req.user._id).populate("assignedDm");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  await redisClient.set(`customer:${req.user._id}`,
    JSON.stringify(user),
    {
      EX:600
    }
  );

  

  res.json(new ApiResponse(200, JSON.parse(user), "User fetched successfully"));
});


export const getUserFromId = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params._id).populate("assignedDm");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json(new ApiResponse(200, user, "User fetched successfully"));
});