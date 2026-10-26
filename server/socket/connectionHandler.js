import {
  registerDeliverySessionHandlers,
  registerOwnerDeliveryHandlers,
  handleDisconnect as handleSessionDisconnect,
} from "./deliverySession.js";

/**
 * Registers connection and disconnection event handlers for Socket.IO.
 * Sets up room isolation, delivery session handling, and development logging.
 */
export const registerConnectionHandlers = (io) => {
  io.on("connection", (socket) => {
    const user = socket.user;

    console.log(
      `[Socket.IO] Client connected: socketId=${socket.id}, userId=${user?._id}, name="${user?.name}", role=${user?.role}`
    );

    // Join room for user's personal ID and user's role
    if (user?._id) {
      socket.join(`user:${user._id}`);
      socket.join(`role:${user.role}`);

      // Business-scoped room joining for multi-tenancy isolation
      const businessId = user.businessId ? user.businessId.toString() : (user.role === "owner" ? user._id.toString() : null);
      if (businessId) {
        socket.join(`business:${businessId}`);
        if (user.role === "owner") {
          socket.join(`business:${businessId}:owner`);
        }
      }
    }

    // Register delivery session events (internally enforces role checks and returns descriptive error callbacks)
    registerDeliverySessionHandlers(io, socket);

    // Register live tracking handlers for owners
    if (user?.role === "owner") {
      registerOwnerDeliveryHandlers(io, socket);
    }

    socket.on("disconnect", (reason) => {
      console.log(
        `[Socket.IO] Client disconnected: socketId=${socket.id}, userId=${user?._id}, reason=${reason}`
      );

      // If DM was actively sharing live location, terminate session and notify owners
      const terminatedSession = handleSessionDisconnect(socket.id);
      if (terminatedSession) {
        const businessId = terminatedSession.businessId;
        const ownerRoom = businessId ? `business:${businessId}:owner` : "role:owner";
        io.to(ownerRoom).emit("delivery:dm:inactive", {
          dmId: terminatedSession.dmId,
          name: terminatedSession.name,
          stoppedAt: new Date().toISOString(),
          reason: "disconnected",
          businessId: businessId || null,
        });
        console.log(
          `[Delivery Session] Active session terminated on disconnect for DM: ${terminatedSession.name}`
        );
      }
    });

    socket.on("error", (err) => {
      console.error(`[Socket.IO] Error on socket ${socket.id}:`, err);
    });
  });
};
