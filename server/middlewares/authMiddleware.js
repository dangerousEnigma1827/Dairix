import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/userModels.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.token;

  if (!token){
    throw new ApiError(401, "Not authenticated, please log in");
  }

  let decoded;
  try {
    decoded = await jwt.verify(token, process.env.JWT_SECRET);
  }catch{
    throw new ApiError(401, "Token is invalid or has expired, please log in again");
  }

  const user = await User.findById(decoded._id);
  if(!user){
    throw new ApiError(401, "User belonging to this token no longer exists");
  }

  req.user = user;
  next();
});

 
export const requireRole = (...roles) => {
    return asyncHandler(async (req, _res, next) => {
        if (!roles.includes(req.user.role)) {
            throw new ApiError(403, `Access denied — required role: ${roles.join(" or ")}`);
        }
        next();
  });
}