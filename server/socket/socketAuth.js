import jwt from "jsonwebtoken";
import User from "../models/userModels.js";

/**
 * Helper to parse the 'token' cookie from the Cookie header string.
 */
const parseCookieToken = (cookieHeader) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
};

/**
 * Socket.IO authentication middleware.
 * Verifies JWT token from handshake auth, Authorization header, or HTTP cookies.
 * Attaches the authenticated user object to socket.user.
 */
export const socketAuth = async (socket, next) => {
  try {
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const parts = socket.handshake.headers.authorization.split(" ");
      token = parts.length === 2 ? parts[1] : parts[0];
    }

    if (!token && socket.handshake.headers?.cookie) {
      token = parseCookieToken(socket.handshake.headers.cookie);
    }

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    const user = await User.findById(decoded._id).select("-password");
    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach sanitized user information to socket
    socket.user = {
      _id: user._id.toString(),
      name: user.name,
      mobile: user.mobile,
      role: user.role,
    };

    next();
  } catch (err) {
    console.error("[Socket.IO Auth Error]:", err.message);
    next(new Error("Authentication error: Internal authentication failure"));
  }
};
