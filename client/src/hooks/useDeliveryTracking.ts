import { useState, useEffect, useRef, useCallback } from "react";
import { getSocket, disconnectSocket } from "../api/socket";
import toast from "react-hot-toast";

export type LocationStatus =
  | "idle"
  | "requesting"
  | "tracking"
  | "denied"
  | "unavailable"
  | "error";

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

export function useDeliveryTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<Coordinates | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const isTrackingRef = useRef(isTracking);
  isTrackingRef.current = isTracking;

  // Manage socket connection lifecycle listeners
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
      // If we were tracking and reconnect, re-register session on server
      if (isTrackingRef.current) {
        socket.emit("delivery:session:start", (res: any) => {
          if (!res?.success) {
            console.warn("[Delivery Tracking] Re-sync session failed:", res?.message);
          }
        });
      }
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    const onConnectError = (err: any) => {
      console.warn("[Socket.IO Connection Error]:", err?.message);
      setSocketConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
    };
  }, []);

  // Stop location watcher helper
  const clearLocationWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Stop delivery session
  const stopDelivering = useCallback(async () => {
    if (isStopping) return;
    setIsStopping(true);

    try {
      clearLocationWatch();
      const socket = getSocket();

      if (socket.connected) {
        await new Promise<void>((resolve) => {
          socket.emit("delivery:session:stop", () => resolve());
          // Timeout fallback in case callback isn't acknowledged
          setTimeout(resolve, 1500);
        });
      }

      setIsTracking(false);
      setLocationStatus("idle");
      setLocationError(null);
      setLastCoords(null);
      toast.success("Delivery session ended");
    } catch (err: any) {
      console.error("Error stopping delivery session:", err);
      toast.error("Failed to stop delivery session cleanly");
    } finally {
      setIsStopping(false);
    }
  }, [isStopping, clearLocationWatch]);

  // Start delivery session
  const startDelivering = useCallback(
    async (pendingOrdersCount: number) => {
      // Prevent duplicate clicks
      if (isStarting || isTracking) return;

      if (pendingOrdersCount <= 0) {
        toast.error("No eligible pending orders to deliver");
        return;
      }

      if (!("geolocation" in navigator)) {
        setLocationStatus("error");
        setLocationError("Geolocation is not supported by your browser");
        toast.error("GPS geolocation is not supported on this device");
        return;
      }

      setIsStarting(true);
      setLocationStatus("requesting");
      setLocationError(null);

      const socket = getSocket();
      if (!socket.connected) {
        socket.connect();
      }

      // Step 1: Verify and start session on server
      socket.emit("delivery:session:start", (response: any) => {
        if (!response?.success) {
          setIsStarting(false);
          setLocationStatus("idle");
          const errorMsg = response?.message || "Failed to start delivery session";
          setLocationError(errorMsg);
          toast.error(errorMsg);
          return;
        }

        // Step 2: Request GPS watch position
        clearLocationWatch();

        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, accuracy, heading, speed } = position.coords;
            const coordsObj: Coordinates = {
              latitude,
              longitude,
              accuracy: typeof accuracy === "number" ? accuracy : null,
            };

            setLastCoords(coordsObj);
            setLastUpdated(new Date());
            setIsTracking(true);
            setIsStarting(false);
            setLocationStatus("tracking");
            setLocationError(null);

            // Transmit location update through Socket.IO
            socket.emit("delivery:location:update", {
              latitude,
              longitude,
              accuracy,
              heading,
              speed,
            });
          },
          (geoError) => {
            console.warn("[Geolocation Warning]:", geoError.code, geoError.message);

            if (geoError.code === geoError.PERMISSION_DENIED) {
              // Location permission denied by user
              clearLocationWatch();
              setIsStarting(false);
              setIsTracking(false);
              setLocationStatus("denied");
              setLocationError(
                "Location permission was denied. Please allow location access in your browser settings to share your live delivery route."
              );

              // Inform backend that session could not proceed with location
              socket.emit("delivery:session:stop");
              toast.error("Location permission denied. Live tracking stopped.");
            } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
              setLocationStatus("unavailable");
              setLocationError("GPS signal unavailable. Trying to acquire signal...");
            } else if (geoError.code === geoError.TIMEOUT) {
              setLocationStatus("unavailable");
              setLocationError("GPS signal search timed out. Retrying...");
            }
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        );

        watchIdRef.current = watchId;
      });
    },
    [isStarting, isTracking, clearLocationWatch]
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      clearLocationWatch();
      const socket = getSocket();
      if (isTrackingRef.current && socket.connected) {
        socket.emit("delivery:session:stop");
      }
      disconnectSocket();
    };
  }, [clearLocationWatch]);

  return {
    isTracking,
    isStarting,
    isStopping,
    locationStatus,
    locationError,
    lastCoords,
    lastUpdated,
    socketConnected,
    startDelivering,
    stopDelivering,
  };
}
