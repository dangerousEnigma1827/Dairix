import { Server } from "socket.io";
import { socketAuth } from "../socket/socketAuth.js";
import { registerConnectionHandlers } from "../socket/connectionHandler.js";

let io = null;

/**
 * Initializes Socket.IO and attaches it to the existing HTTP server instance.
 * Configures CORS matching the Express application settings and mounts auth middleware.
 *
 * @param {import("http").Server} server - The shared HTTP server instance
 * @returns {import("socket.io").Server} The initialized Socket.IO server instance
 */
export const initSocket = (server) => {
  const allowedOrigins = [
    process.env.CLIENT_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ].filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // Attach authentication middleware
  io.use(socketAuth);

  // Register basic connection and lifecycle event handlers
  registerConnectionHandlers(io);

  console.log("[Socket.IO] Initialized and attached to HTTP server");
  return io;
};

/**
 * Access the initialized Socket.IO server instance anywhere in the application.
 * Prevents circular dependencies when emitting events from controllers or services.
 *
 * @returns {import("socket.io").Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error(
      "[Socket.IO] Server instance has not been initialized. Call initSocket(server) first."
    );
  }
  return io;
};
