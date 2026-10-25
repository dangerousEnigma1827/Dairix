import Dispatch from "../models/dispatchModels.js";
import DeliveryEntry from "../models/deliveryEntryModels.js";

// In-memory store of active delivery sessions: Map<dmId, SessionData>
const activeSessions = new Map();
// Lookup map from socketId -> dmId for instant disconnect cleanup
const socketToDm = new Map();

/**
 * Checks whether a delivery man has at least one eligible pending order for today.
 *
 * @param {string} dmId - The MongoDB ObjectId string of the delivery man
 * @returns {Promise<number>} Number of eligible pending delivery orders today
 */
export const checkPendingDeliveries = async (dmId) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  // Look for today's dispatch by createdAt or date
  const dispatch = await Dispatch.findOne({
    $or: [
      { createdAt: { $gte: start, $lte: end } },
      { date: { $gte: start, $lte: end } },
    ],
  });

  let pendingCount = 0;
  if (dispatch) {
    pendingCount = await DeliveryEntry.countDocuments({
      dispatch: dispatch._id,
      dm: dmId,
      status: "pending",
    });
  }

  // Fallback: check any delivery entries created today directly assigned to this DM
  if (pendingCount === 0) {
    pendingCount = await DeliveryEntry.countDocuments({
      dm: dmId,
      status: "pending",
      createdAt: { $gte: start, $lte: end },
    });
  }

  return pendingCount;
};

/**
 * Validates GPS latitude and longitude values.
 */
export const isValidCoordinates = (latitude, longitude) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return false;
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  return true;
};

/**
 * Starts an active delivery session for a DM.
 */
export const startSession = (dmId, socketId, user) => {
  const session = {
    dmId,
    socketId,
    name: user.name,
    mobile: user.mobile,
    startedAt: new Date().toISOString(),
    lastLocation: null,
  };
  activeSessions.set(dmId, session);
  socketToDm.set(socketId, dmId);
  return session;
};

/**
 * Retrieves the active session for a DM, if any.
 */
export const getSession = (dmId) => {
  return activeSessions.get(dmId) || null;
};

/**
 * Updates the last known GPS location of an active delivery session.
 */
export const updateSessionLocation = (dmId, coords) => {
  const session = activeSessions.get(dmId);
  if (!session) return null;

  session.lastLocation = {
    ...coords,
    updatedAt: new Date().toISOString(),
  };
  return session;
};

/**
 * Stops an active delivery session.
 */
export const stopSession = (dmId) => {
  const session = activeSessions.get(dmId);
  if (session) {
    socketToDm.delete(session.socketId);
    activeSessions.delete(dmId);
  }
  return session;
};

/**
 * Cleans up an active session when the socket disconnects.
 */
export const handleDisconnect = (socketId) => {
  const dmId = socketToDm.get(socketId);
  if (dmId) {
    socketToDm.delete(socketId);
    const session = activeSessions.get(dmId);
    activeSessions.delete(dmId);
    return session;
  }
  return null;
};

/**
 * Returns all active delivery sessions (for owner inspection or test assertions).
 */
export const getAllActiveSessions = () => {
  return Array.from(activeSessions.values());
};

/**
 * Returns a sanitized snapshot of currently active delivery sessions for authorized owners.
 * Excludes internal socket identifiers and prunes sessions older than 24 hours.
 *
 * @returns {Array<Object>} List of active delivery sessions with sanitized fields
 */
export const getActiveSessionsSnapshot = () => {
  const now = Date.now();
  const sessions = [];

  for (const session of activeSessions.values()) {
    // Prune stale sessions started more than 24 hours ago
    const startedTime = new Date(session.startedAt).getTime();
    if (now - startedTime > 24 * 60 * 60 * 1000) {
      stopSession(session.dmId);
      continue;
    }

    sessions.push({
      dmId: session.dmId,
      name: session.name,
      mobile: session.mobile,
      startedAt: session.startedAt,
      lastLocation: session.lastLocation
        ? {
            latitude: session.lastLocation.latitude,
            longitude: session.lastLocation.longitude,
            accuracy: session.lastLocation.accuracy,
            heading: session.lastLocation.heading,
            speed: session.lastLocation.speed,
            updatedAt: session.lastLocation.updatedAt,
          }
        : null,
    });
  }

  return sessions;
};

/**
 * Clears all active sessions (primarily for testing purposes).
 */
export const clearAllSessions = () => {
  activeSessions.clear();
  socketToDm.clear();
};

/**
 * Registers delivery tracking events for authenticated owners.
 * Exposes live snapshot queries via callback with role-based authorization.
 */
export const registerOwnerDeliveryHandlers = (io, socket) => {
  const user = socket.user;
  if (user?.role !== "owner") return;

  const handleActiveSessionsRequest = (callback) => {
    if (typeof callback !== "function") return;

    if (socket.user?.role !== "owner") {
      return callback({
        success: false,
        message: "Access denied: Only authorized owners can view live delivery tracking",
      });
    }

    try {
      const sessions = getActiveSessionsSnapshot();
      return callback({
        success: true,
        sessions,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[Owner Delivery Handler Error]:", err);
      return callback({
        success: false,
        message: "Failed to fetch active delivery sessions snapshot",
      });
    }
  };

  // Primary event name and alias
  socket.on("delivery:active-sessions:request", handleActiveSessionsRequest);
  socket.on("delivery:owner:get-active-sessions", handleActiveSessionsRequest);
};

/**
 * Registers delivery session events on an authenticated socket.
 */
export const registerDeliverySessionHandlers = (io, socket) => {
  const user = socket.user;

  // 1. Start delivery session
  socket.on("delivery:session:start", async (data, callback) => {
    // Support invocation with or without payload: (callback) or (data, callback)
    const cb = typeof data === "function" ? data : callback;

    try {
      if (user?.role !== "dm") {
        return cb?.({
          success: false,
          message: "Access denied: Only delivery personnel can start a delivery session",
        });
      }

      // Check if this DM has eligible pending orders
      const pendingCount = await checkPendingDeliveries(user._id);
      if (pendingCount === 0) {
        return cb?.({
          success: false,
          message: "No eligible pending orders found for delivery today",
          pendingCount: 0,
        });
      }

      // Prevent duplicate sessions on the same socket
      const existingSession = getSession(user._id);
      if (existingSession && existingSession.socketId === socket.id) {
        return cb?.({
          success: true,
          message: "Delivery session is already active",
          session: existingSession,
          pendingCount,
        });
      }

      const session = startSession(user._id, socket.id, user);

      // Notify authorized owners of active DM
      io.to("role:owner").emit("delivery:dm:active", {
        dmId: user._id,
        name: user.name,
        mobile: user.mobile,
        startedAt: session.startedAt,
      });

      console.log(
        `[Delivery Session] Started for DM: ${user.name} (${user.mobile}), socketId=${socket.id}, pending=${pendingCount}`
      );

      return cb?.({
        success: true,
        message: "Delivery session started successfully",
        session,
        pendingCount,
      });
    } catch (err) {
      console.error("[Delivery Session Start Error]:", err);
      return cb?.({
        success: false,
        message: "Failed to start delivery session due to a server error",
      });
    }
  });

  // 2. Receive live location updates from DM
  socket.on("delivery:location:update", (coords, callback) => {
    const cb = typeof coords === "function" ? coords : callback;
    const locationData = typeof coords === "object" && coords !== null ? coords : {};

    try {
      if (user?.role !== "dm") {
        return cb?.({
          success: false,
          message: "Access denied: Only delivery personnel can transmit location updates",
        });
      }

      const session = getSession(user._id);
      if (!session) {
        return cb?.({
          success: false,
          message: "No active delivery session found. Please start a session first.",
        });
      }

      const { latitude, longitude, accuracy, heading, speed } = locationData;
      if (!isValidCoordinates(latitude, longitude)) {
        return cb?.({
          success: false,
          message: "Invalid GPS coordinates: latitude and longitude are required and must be valid numbers within range",
        });
      }

      const timestamp = new Date().toISOString();
      const validatedCoords = {
        latitude,
        longitude,
        accuracy: typeof accuracy === "number" && Number.isFinite(accuracy) ? accuracy : null,
        heading: typeof heading === "number" && Number.isFinite(heading) ? heading : null,
        speed: typeof speed === "number" && Number.isFinite(speed) ? speed : null,
      };

      updateSessionLocation(user._id, validatedCoords);

      // Broadcast exclusively to authorized owners
      io.to("role:owner").emit("delivery:location:broadcast", {
        dmId: user._id,
        name: user.name,
        mobile: user.mobile,
        coords: validatedCoords,
        timestamp,
      });

      return cb?.({
        success: true,
        timestamp,
      });
    } catch (err) {
      console.error("[Delivery Location Update Error]:", err);
      return cb?.({
        success: false,
        message: "Failed to process location update",
      });
    }
  });

  // 3. Stop delivery session
  socket.on("delivery:session:stop", (data, callback) => {
    const cb = typeof data === "function" ? data : callback;

    try {
      if (user?.role !== "dm") {
        return cb?.({
          success: false,
          message: "Access denied",
        });
      }

      const session = stopSession(user._id);
      const stoppedAt = new Date().toISOString();

      if (session) {
        io.to("role:owner").emit("delivery:dm:inactive", {
          dmId: user._id,
          name: user.name,
          stoppedAt,
          reason: "stopped",
        });

        console.log(
          `[Delivery Session] Stopped by DM: ${user.name} (${user.mobile})`
        );
      }

      return cb?.({
        success: true,
        message: "Delivery session stopped successfully",
        stoppedAt,
      });
    } catch (err) {
      console.error("[Delivery Session Stop Error]:", err);
      return cb?.({
        success: false,
        message: "Failed to stop delivery session",
      });
    }
  });

  // 4. Query current session status
  socket.on("delivery:session:status", (callback) => {
    if (typeof callback !== "function") return;
    const session = getSession(user?._id);
    callback({
      active: !!session,
      session: session || null,
    });
  });
};
