import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.IO client instance configured for the Dairix backend.
 */
export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
    socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      autoConnect: false,
    });
  }
  return socket;
};

/**
 * Disconnects and resets the Socket.IO client instance (e.g. on logout).
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
