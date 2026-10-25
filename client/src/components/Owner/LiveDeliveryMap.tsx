import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Navigation,
  Radio,
  RefreshCw,
  Maximize2,
  AlertTriangle,
  User,
  Phone,
  Clock,
  Wifi,
  WifiOff,
  CheckCircle2,
  Compass,
  Gauge,
  Info,
} from "lucide-react";
import { getSocket } from "../../api/socket";
import {
  getActiveDeliverySessionsService,
  type ActiveDeliverySession,
} from "../../api/Services/Owner/DashboardServices";
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";

// Staleness threshold in milliseconds (5 minutes)
const STALE_THRESHOLD_MS = 5 * 60 * 1000;
// Default map center (India / regional fallback)
const DEFAULT_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 13;

function formatRelativeTime(dateString?: string | null): string {
  if (!dateString) return "Never";
  const diffMs = Date.now() - new Date(dateString).getTime();
  if (diffMs < 0) return "Just now";
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 15) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}h ago`;
}

function isLocationStale(updatedAt?: string | null): boolean {
  if (!updatedAt) return true;
  return Date.now() - new Date(updatedAt).getTime() > STALE_THRESHOLD_MS;
}

export const LiveDeliveryMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [sessions, setSessions] = useState<Map<string, ActiveDeliverySession>>(new Map());
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [, setTick] = useState<number>(0);

  // Tick every 10 seconds to refresh relative time labels
  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Compute active delivery personnel list
  const activeSessionsList = useMemo(() => {
    return Array.from(sessions.values());
  }, [sessions]);

  // Compute delivery personnel with valid, non-stale coordinates
  const liveSessionsWithCoords = useMemo(() => {
    return activeSessionsList.filter((s) => {
      if (!s.lastLocation) return false;
      const { latitude, longitude, updatedAt } = s.lastLocation;
      if (typeof latitude !== "number" || typeof longitude !== "number") return false;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return false;
      return !isLocationStale(updatedAt);
    });
  }, [activeSessionsList]);

  // ── Helper to create high-visibility animated DivIcon ─────────────────────
  const createDeliveryMarkerIcon = useCallback((session: ActiveDeliverySession, isSelected: boolean) => {
    const initials = getInitials(session.name);
    const stale = isLocationStale(session.lastLocation?.updatedAt);
    const pulseColor = stale ? "bg-amber-400" : "bg-emerald-500";
    const ringColor = stale ? "border-amber-400" : "border-emerald-500";
    const bgBg = isSelected ? "bg-blue-600 ring-4 ring-blue-300" : "bg-slate-900";

    return L.divIcon({
      className: "custom-delivery-marker-icon",
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          ${
            !stale
              ? `<span style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; opacity: 0.75; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;" class="${pulseColor}"></span>`
              : ""
          }
          <div style="position: relative; width: 36px; height: 36px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.25);" class="${bgBg} ${ringColor}">
            <span style="color: white; font-size: 12px; font-weight: 700; font-family: ui-sans-serif, system-ui, sans-serif;">${initials}</span>
          </div>
          <div style="position: absolute; bottom: -6px; width: 8px; height: 8px; transform: rotate(45deg); background: ${isSelected ? "#2563eb" : "#0f172a"}; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 40],
      popupAnchor: [0, -40],
    });
  }, []);

  // ── Create custom HTML Popup for Delivery Marker ─────────────────────────
  const createPopupContent = useCallback((session: ActiveDeliverySession) => {
    const coords = session.lastLocation;
    const stale = isLocationStale(coords?.updatedAt);
    const relativeTime = formatRelativeTime(coords?.updatedAt);
    const exactTime = coords?.updatedAt ? new Date(coords.updatedAt).toLocaleTimeString() : "N/A";
    const initials = getInitials(session.name);

    return `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 220px; padding: 4px;">
        <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="width: 32px; height: 32px; border-radius: 9999px; background: #2563eb; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 12px;">
            ${initials}
          </div>
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${session.name}
            </p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">
              ${session.mobile || "Delivery Personnel"}
            </p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 11px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #64748b;">Status:</span>
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 9999px; font-weight: 600; font-size: 10px; ${
              stale
                ? "background: #fef3c7; color: #b45309;"
                : "background: #dcfce7; color: #15803d;"
            }">
              <span style="width: 6px; height: 6px; border-radius: 9999px; background: ${stale ? "#f59e0b" : "#22c55e"};"></span>
              ${stale ? "Stale Location" : "Tracking Live"}
            </span>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="color: #64748b;">Last Updated:</span>
            <span style="font-weight: 600; color: #1e293b;">${relativeTime} (${exactTime})</span>
          </div>

          ${
            coords?.speed !== null && coords?.speed !== undefined
              ? `<div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: #64748b;">Speed:</span>
                  <span style="font-weight: 600; color: #1e293b;">${Math.round(coords.speed * 3.6)} km/h</span>
                </div>`
              : ""
          }

          ${
            coords?.accuracy !== null && coords?.accuracy !== undefined
              ? `<div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: #64748b;">Accuracy:</span>
                  <span style="font-weight: 600; color: #1e293b;">±${Math.round(coords.accuracy)} m</span>
                </div>`
              : ""
          }

          ${
            session.mobile
              ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: center;">
                  <a href="tel:${session.mobile}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: none;">
                    Call Delivery Staff
                  </a>
                </div>`
              : ""
          }
        </div>
      </div>
    `;
  }, []);

  // ── Initialize Leaflet Map Instance ───────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Sync Map Markers with live sessions ──────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markers = markersRef.current;
    const currentActiveIds = new Set<string>();

    // Update or add markers for sessions with valid, recent coordinates
    liveSessionsWithCoords.forEach((session) => {
      const { dmId, lastLocation } = session;
      if (!lastLocation) return;
      currentActiveIds.add(dmId);

      const latLng: [number, number] = [lastLocation.latitude, lastLocation.longitude];
      const isSelected = selectedDmId === dmId;
      const icon = createDeliveryMarkerIcon(session, isSelected);
      const popupHtml = createPopupContent(session);

      const existingMarker = markers.get(dmId);
      if (existingMarker) {
        // Prevent duplicate markers: smoothly update existing marker
        existingMarker.setLatLng(latLng);
        existingMarker.setIcon(icon);
        const popup = existingMarker.getPopup();
        if (popup) {
          popup.setContent(popupHtml);
        } else {
          existingMarker.bindPopup(popupHtml);
        }
      } else {
        // Create new marker
        const marker = L.marker(latLng, { icon }).addTo(map);
        marker.bindPopup(popupHtml);
        marker.on("click", () => {
          setSelectedDmId(dmId);
        });
        markers.set(dmId, marker);
      }
    });

    // Remove markers for sessions that are no longer active or lack valid coordinates
    markers.forEach((marker, dmId) => {
      if (!currentActiveIds.has(dmId)) {
        marker.remove();
        markers.delete(dmId);
      }
    });
  }, [liveSessionsWithCoords, selectedDmId, createDeliveryMarkerIcon, createPopupContent]);

  // ── Fit Map Bounds to Active Markers ─────────────────────────────────────
  const fitMapToMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (liveSessionsWithCoords.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (liveSessionsWithCoords.length === 1) {
      const loc = liveSessionsWithCoords[0].lastLocation;
      if (loc) {
        map.flyTo([loc.latitude, loc.longitude], 15, { duration: 1 });
      }
      return;
    }

    const bounds = L.latLngBounds(
      liveSessionsWithCoords.map((s) => [
        s.lastLocation!.latitude,
        s.lastLocation!.longitude,
      ])
    );
    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 16,
      animate: true,
    });
  }, [liveSessionsWithCoords]);

  // ── Fetch Initial Snapshot ────────────────────────────────────────────────
  const fetchSnapshot = useCallback(async (isManualRefresh = false) => {
    isManualRefresh ? setRefreshing(true) : setLoading(true);
    setErrorMessage(null);

    const socket = getSocket();

    // 1. Try Socket.IO snapshot callback first
    let snapshotReceived = false;

    if (socket.connected) {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 3000);
          socket.emit(
            "delivery:active-sessions:request",
            (res: { success: boolean; sessions?: ActiveDeliverySession[]; message?: string }) => {
              clearTimeout(timeout);
              if (res && res.success && Array.isArray(res.sessions)) {
                snapshotReceived = true;
                setSessions((prev) => {
                  const nextMap = new Map<string, ActiveDeliverySession>();
                  res.sessions!.forEach((s) => {
                    // Retain any newer location update if arrived while fetching
                    const existing = prev.get(s.dmId);
                    if (
                      existing?.lastLocation?.updatedAt &&
                      s.lastLocation?.updatedAt &&
                      new Date(existing.lastLocation.updatedAt) > new Date(s.lastLocation.updatedAt)
                    ) {
                      nextMap.set(s.dmId, existing);
                    } else {
                      nextMap.set(s.dmId, s);
                    }
                  });
                  return nextMap;
                });
              }
              resolve();
            }
          );
        });
      } catch (err) {
        console.warn("[LiveMap] Socket snapshot callback timed out or errored:", err);
      }
    }

    // 2. If socket wasn't connected or didn't respond, fallback to authenticated REST endpoint
    if (!snapshotReceived) {
      try {
        const restSessions = await getActiveDeliverySessionsService();
        setSessions((prev) => {
          const nextMap = new Map<string, ActiveDeliverySession>();
          restSessions.forEach((s) => {
            const existing = prev.get(s.dmId);
            if (
              existing?.lastLocation?.updatedAt &&
              s.lastLocation?.updatedAt &&
              new Date(existing.lastLocation.updatedAt) > new Date(s.lastLocation.updatedAt)
            ) {
              nextMap.set(s.dmId, existing);
            } else {
              nextMap.set(s.dmId, s);
            }
          });
          return nextMap;
        });
      } catch (restErr: any) {
        console.error("[LiveMap] Failed to fetch delivery sessions via REST:", restErr);
        if (!snapshotReceived) {
          setErrorMessage(restErr?.response?.data?.message || "Failed to load active delivery sessions");
        }
      }
    }

    isManualRefresh ? setRefreshing(false) : setLoading(false);
  }, []);

  // ── Socket.IO Real-Time Event Handlers ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setSocketStatus("connected");
      setErrorMessage(null);
      // Fetch fresh snapshot upon connection/reconnection
      fetchSnapshot();
    };

    const handleDisconnect = () => {
      setSocketStatus("disconnected");
    };

    const handleConnectError = (err: Error) => {
      console.warn("[LiveMap] Socket connect error:", err.message);
      setSocketStatus("error");
    };

    // When a DM starts their delivery session
    const handleDmActive = (payload: { dmId: string; name: string; mobile?: string; startedAt: string }) => {
      setSessions((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.dmId);
        next.set(payload.dmId, {
          dmId: payload.dmId,
          name: payload.name,
          mobile: payload.mobile || existing?.mobile,
          startedAt: payload.startedAt,
          lastLocation: existing?.lastLocation || null,
        });
        return next;
      });
    };

    // When a DM transmits a live GPS coordinate update
    const handleLocationBroadcast = (payload: {
      dmId: string;
      name: string;
      mobile?: string;
      coords: {
        latitude: number;
        longitude: number;
        accuracy?: number | null;
        heading?: number | null;
        speed?: number | null;
      };
      timestamp: string;
    }) => {
      setSessions((prev) => {
        const next = new Map(prev);
        const existing = next.get(payload.dmId);

        // Discard older updates to prevent race conditions
        if (
          existing?.lastLocation?.updatedAt &&
          new Date(existing.lastLocation.updatedAt) > new Date(payload.timestamp)
        ) {
          return prev;
        }

        next.set(payload.dmId, {
          dmId: payload.dmId,
          name: payload.name,
          mobile: payload.mobile || existing?.mobile,
          startedAt: existing?.startedAt || payload.timestamp,
          lastLocation: {
            ...payload.coords,
            updatedAt: payload.timestamp,
          },
        });
        return next;
      });
    };

    // When a DM stops sharing location or disconnects
    const handleDmInactive = (payload: { dmId: string; name?: string; reason?: string }) => {
      setSessions((prev) => {
        if (!prev.has(payload.dmId)) return prev;
        const next = new Map(prev);
        next.delete(payload.dmId);
        return next;
      });

      if (selectedDmId === payload.dmId) {
        setSelectedDmId(null);
      }
    };

    // Initial state check
    if (socket.connected) {
      setSocketStatus("connected");
    } else {
      setSocketStatus("connecting");
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("delivery:dm:active", handleDmActive);
    socket.on("delivery:location:broadcast", handleLocationBroadcast);
    socket.on("delivery:dm:inactive", handleDmInactive);

    // Initial load
    fetchSnapshot();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("delivery:dm:active", handleDmActive);
      socket.off("delivery:location:broadcast", handleLocationBroadcast);
      socket.off("delivery:dm:inactive", handleDmInactive);
    };
  }, [fetchSnapshot, selectedDmId]);

  // Handle clicking a delivery person in the drawer to focus map on them
  const handleSelectDm = (session: ActiveDeliverySession) => {
    setSelectedDmId(session.dmId);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (session.lastLocation) {
      const { latitude, longitude } = session.lastLocation;
      map.flyTo([latitude, longitude], 16, { duration: 1 });
      const marker = markersRef.current.get(session.dmId);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 flex flex-col gap-4">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Navigation size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Live Delivery Tracking</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {activeSessionsList.length} Active {activeSessionsList.length === 1 ? "Driver" : "Drivers"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time GPS coordinates of active delivery staff on route today.
            </p>
          </div>
        </div>

        {/* ── Controls & Status Indicators ── */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Socket status badge */}
          <div className="flex items-center">
            {socketStatus === "connected" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                <Wifi size={13} className="text-emerald-600" />
                Live
              </span>
            )}
            {socketStatus === "connecting" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                <Radio size={13} className="animate-spin text-amber-600" />
                Connecting…
              </span>
            )}
            {(socketStatus === "disconnected" || socketStatus === "error") && (
              <button
                onClick={() => getSocket().connect()}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition"
                title="Click to reconnect live updates"
              >
                <WifiOff size={13} className="text-rose-600" />
                Disconnected · Reconnect
              </button>
            )}
          </div>

          {/* Fit Bounds Button */}
          <button
            onClick={fitMapToMarkers}
            disabled={liveSessionsWithCoords.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Fit map view to all active delivery drivers"
          >
            <Maximize2 size={13} />
            Fit Map
          </button>

          {/* Refresh Snapshot Button */}
          <button
            onClick={() => fetchSnapshot(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh active delivery sessions snapshot"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-600" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner if any ── */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertTriangle size={15} className="shrink-0 text-rose-500" />
          <p className="flex-1">{errorMessage}</p>
          <button
            onClick={() => fetchSnapshot(true)}
            className="font-semibold underline hover:text-rose-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Map Container & Active Driver Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Viewport (Takes 3 columns on desktop) */}
        <div className="lg:col-span-3 relative h-[380px] sm:h-[460px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Overlay: Loading state */}
          {loading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center gap-2.5 z-10">
              <RefreshCw size={18} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-700">Loading live tracking map…</span>
            </div>
          )}

          {/* Overlay: Empty State when no drivers active */}
          {!loading && activeSessionsList.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-4 z-10 pointer-events-none">
              <div className="max-w-md rounded-2xl bg-white/95 p-5 text-center shadow-lg border border-slate-200/80 pointer-events-auto">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Navigation size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Delivery Staff Currently Active</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  When delivery personnel start their deliveries and share GPS locations from their app, their live positions will appear here instantly.
                </p>
              </div>
            </div>
          )}

          {/* Map floating control badge */}
          {liveSessionsWithCoords.length > 0 && (
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/80 text-[11px] font-medium text-slate-700 flex items-center gap-1.5 z-10 pointer-events-none">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>
                {liveSessionsWithCoords.length} driver{liveSessionsWithCoords.length > 1 ? "s" : ""} transmitting live GPS
              </span>
            </div>
          )}
        </div>

        {/* ── Active Drivers List / Side Panel ── */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 h-[380px] sm:h-[460px] overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/80">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User size={13} className="text-slate-500" />
              Active Staff ({activeSessionsList.length})
            </h3>
            <span className="text-[10px] text-slate-400">Click to locate</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pt-2.5 pr-0.5">
            {activeSessionsList.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-full py-8 text-slate-400 gap-1.5">
                <Radio size={20} className="text-slate-300" />
                <p className="text-xs font-medium text-slate-600">No active drivers</p>
                <p className="text-[11px] text-slate-400 max-w-[180px]">
                  Waiting for staff to start delivering today
                </p>
              </div>
            ) : (
              activeSessionsList.map((session, idx) => {
                const hasCoords = !!session.lastLocation;
                const stale = isLocationStale(session.lastLocation?.updatedAt);
                const isSelected = selectedDmId === session.dmId;
                const palette = avatarPalette[idx % avatarPalette.length];

                return (
                  <button
                    key={session.dmId}
                    onClick={() => handleSelectDm(session)}
                    className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-2 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-100"
                        : "bg-white border-slate-200 hover:bg-slate-100/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${palette}`}
                        >
                          {getInitials(session.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {session.name}
                          </p>
                          {session.mobile && (
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Phone size={9} />
                              {session.mobile}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Status indicator badge */}
                      {hasCoords && !stale && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                          Live
                        </span>
                      )}
                      {hasCoords && stale && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Stale
                        </span>
                      )}
                      {!hasCoords && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                          Awaiting GPS
                        </span>
                      )}
                    </div>

                    {/* Metadata footer */}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                      <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {hasCoords
                          ? `Updated ${formatRelativeTime(session.lastLocation?.updatedAt)}`
                          : `Started ${formatRelativeTime(session.startedAt)}`}
                      </span>
                      {hasCoords && session.lastLocation?.speed !== null && session.lastLocation?.speed !== undefined && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Gauge size={10} />
                          {Math.round(session.lastLocation.speed * 3.6)} km/h
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDeliveryMap;
