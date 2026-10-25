/**
 * Registers basic connection and disconnection event handlers for Socket.IO.
 * Sets up development logging and role/user room isolation for future tracking phases.
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
    }

    socket.on("disconnect", (reason) => {
      console.log(
        `[Socket.IO] Client disconnected: socketId=${socket.id}, userId=${user?._id}, reason=${reason}`
      );
    });

    socket.on("error", (err) => {
      console.error(`[Socket.IO] Error on socket ${socket.id}:`, err);
    });
  });
};
