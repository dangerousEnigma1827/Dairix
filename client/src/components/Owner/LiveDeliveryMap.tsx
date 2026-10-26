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
  XCircle,
  MapPin,
  Users,
  Layers,
  Filter,
  Package,
  Gauge,
  HelpCircle,
} from "lucide-react";
import { getSocket } from "../../api/socket";
import {
  getActiveDeliverySessionsService,
  getCustomerDeliveryLocationsService,
  type ActiveDeliverySession,
  type CustomerDeliveryLocation,
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

function isValidCoordinatePair(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

interface LiveDeliveryMapProps {
  selectedDate?: string;
}

export const LiveDeliveryMap: React.FC<LiveDeliveryMapProps> = ({ selectedDate }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const dmMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const customerMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  // Delivery personnel sessions
  const [sessions, setSessions] = useState<Map<string, ActiveDeliverySession>>(new Map());
  // Customer delivery locations for the day
  const [customerLocations, setCustomerLocations] = useState<CustomerDeliveryLocation[]>([]);

  // Toggles and selection
  const [showDrivers, setShowDrivers] = useState<boolean>(true);
  const [showCustomers, setShowCustomers] = useState<boolean>(true);
  const [customerFilter, setCustomerFilter] = useState<"all" | "delivered" | "pending" | "skipped">("all");
  const [activeTab, setActiveTab] = useState<"staff" | "customers">("staff");
  const [selectedDmId, setSelectedDmId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Status and loaders
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
      if (!isValidCoordinatePair(latitude, longitude)) return false;
      return !isLocationStale(updatedAt);
    });
  }, [activeSessionsList]);

  // All customers with valid coordinates
  const customersWithCoords = useMemo(() => {
    return customerLocations.filter(
      (c) => c.coordinates && isValidCoordinatePair(c.coordinates.latitude, c.coordinates.longitude)
    );
  }, [customerLocations]);

  // Customers without coordinates
  const customersWithoutCoords = useMemo(() => {
    return customerLocations.filter(
      (c) => !c.coordinates || !isValidCoordinatePair(c.coordinates.latitude, c.coordinates.longitude)
    );
  }, [customerLocations]);

  // Customer locations filtered by status for display on map
  const visibleCustomerLocations = useMemo(() => {
    if (!showCustomers) return [];
    return customersWithCoords.filter((c) => {
      if (customerFilter === "all") return true;
      if (customerFilter === "delivered") return c.overallStatus === "delivered";
      if (customerFilter === "skipped") return c.overallStatus === "skipped";
      if (customerFilter === "pending") return c.overallStatus === "pending" || c.overallStatus === "partial";
      return true;
    });
  }, [customersWithCoords, showCustomers, customerFilter]);

  // Status counts for customer filters
  const customerCounts = useMemo(() => {
    const delivered = customersWithCoords.filter((c) => c.overallStatus === "delivered").length;
    const skipped = customersWithCoords.filter((c) => c.overallStatus === "skipped").length;
    const pending = customersWithCoords.filter(
      (c) => c.overallStatus === "pending" || c.overallStatus === "partial"
    ).length;
    return {
      all: customersWithCoords.length,
      delivered,
      skipped,
      pending,
      totalUnmapped: customersWithoutCoords.length,
    };
  }, [customersWithCoords, customersWithoutCoords]);

  // ── Helper to create Driver Animated DivIcon ──────────────────────────────
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

  // ── Helper to create Customer Location DivIcon ────────────────────────────
  const createCustomerMarkerIcon = useCallback((customer: CustomerDeliveryLocation, isSelected: boolean) => {
    let pinColor = "#f59e0b"; // Amber (pending)
    let iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

    if (customer.overallStatus === "delivered") {
      pinColor = "#059669"; // Emerald (delivered)
      iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (customer.overallStatus === "skipped") {
      pinColor = "#e11d48"; // Rose (skipped)
      iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else if (customer.overallStatus === "partial") {
      pinColor = "#7c3aed"; // Violet (partial)
      iconSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
    }

    const ringEffect = isSelected ? "box-shadow: 0 0 0 4px #93c5fd, 0 6px 16px rgba(0,0,0,0.35); transform: scale(1.15);" : "box-shadow: 0 3px 10px rgba(0,0,0,0.22);";

    return L.divIcon({
      className: "custom-customer-marker-icon",
      html: `
        <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <div style="width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; border: 2px solid white; background-color: ${pinColor}; ${ringEffect}">
            ${iconSvg}
          </div>
          <div style="position: absolute; bottom: -4px; width: 6px; height: 6px; transform: rotate(45deg); background-color: ${pinColor};"></div>
        </div>
      `,
      iconSize: [34, 34],
      iconAnchor: [17, 30],
      popupAnchor: [0, -30],
    });
  }, []);

  // ── Create custom HTML Popup for Delivery Driver ──────────────────────────
  const createPopupContent = useCallback((session: ActiveDeliverySession) => {
    const coords = session.lastLocation;
    const stale = isLocationStale(coords?.updatedAt);
    const relativeTime = formatRelativeTime(coords?.updatedAt);
    const exactTime = coords?.updatedAt ? new Date(coords.updatedAt).toLocaleTimeString() : "N/A";
    const initials = getInitials(session.name);

    return `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 230px; padding: 4px;">
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
            <span style="color: #64748b;">Tracking:</span>
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 9999px; font-weight: 600; font-size: 10px; ${
              stale ? "background: #fef3c7; color: #b45309;" : "background: #dcfce7; color: #15803d;"
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

  // ── Create custom HTML Popup for Customer Marker ──────────────────────────
  const createCustomerPopupContent = useCallback((customer: CustomerDeliveryLocation) => {
    const addr = customer.address;
    const addressStr = addr
      ? [addr.houseNo, addr.street, addr.landmark, addr.city, addr.pincode].filter(Boolean).join(", ")
      : "No address recorded";

    const badgeConfig = {
      delivered: { bg: "#dcfce7", color: "#15803d", dot: "#22c55e", label: "Delivered" },
      pending: { bg: "#fef3c7", color: "#b45309", dot: "#f59e0b", label: "Pending" },
      skipped: { bg: "#ffe4e6", color: "#be123c", dot: "#f43f5e", label: "Skipped" },
      partial: { bg: "#ede9fe", color: "#6d28d9", dot: "#8b5cf6", label: "Partially Delivered" },
    }[customer.overallStatus] || { bg: "#f1f5f9", color: "#475569", dot: "#94a3b8", label: customer.overallStatus };

    const dmName = customer.assignedDm?.name || "Unassigned";
    const dmMobile = customer.assignedDm?.mobile;

    let deliveriesHtml = "";
    if (customer.deliveries.length > 1) {
      deliveriesHtml = `
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e2e8f0; font-size: 10px; color: #475569;">
          <div style="font-weight: 700; margin-bottom: 2px; color: #1e293b;">Stops Breakdown (${customer.deliveries.length}):</div>
          ${customer.deliveries
            .map(
              (d, idx) => `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                <span>#${idx + 1} ${d.products.map((p) => `${p.quantity}${p.unit} ${p.name}`).join(", ") || "Delivery"}</span>
                <span style="font-weight: 600; text-transform: capitalize;">${d.status}</span>
              </div>
            `
            )
            .join("")}
        </div>
      `;
    }

    return `
      <div style="font-family: ui-sans-serif, system-ui, sans-serif; min-width: 230px; max-width: 280px; padding: 4px;">
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="flex: 1; min-width: 0;">
            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${customer.name}
            </p>
            <p style="margin: 2px 0 0; font-size: 11px; color: #64748b;">
              📞 ${customer.mobile || "No phone"}
            </p>
          </div>
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 9999px; font-weight: 600; font-size: 10px; background: ${badgeConfig.bg}; color: ${badgeConfig.color}; white-space: nowrap;">
            <span style="width: 5px; height: 5px; border-radius: 9999px; background: ${badgeConfig.dot};"></span>
            ${badgeConfig.label}
          </span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 5px; font-size: 11px;">
          <div>
            <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600;">Address</span>
            <p style="margin: 1px 0 0; color: #1e293b; font-size: 11px; line-height: 1.35;">
              ${addressStr}
            </p>
          </div>

          <div>
            <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600;">Assigned DM</span>
            <p style="margin: 1px 0 0; color: #1e293b; font-weight: 600;">
              ${dmName} ${dmMobile ? `<span style="font-weight: 400; color: #64748b;">(${dmMobile})</span>` : ""}
            </p>
          </div>

          ${
            customer.productSummary
              ? `<div>
                  <span style="color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 600;">Products</span>
                  <p style="margin: 1px 0 0; color: #2563eb; font-weight: 600;">
                    ${customer.productSummary}
                  </p>
                </div>`
              : ""
          }

          ${deliveriesHtml}

          ${
            customer.mobile
              ? `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #f1f5f9; text-align: center;">
                  <a href="tel:${customer.mobile}" style="display: inline-flex; align-items: center; justify-content: center; gap: 4px; font-size: 11px; font-weight: 600; color: #2563eb; text-decoration: none;">
                    Call Customer
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

  // ── Sync Map Markers: Delivery Staff ──────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markers = dmMarkersRef.current;
    const currentActiveIds = new Set<string>();

    if (showDrivers) {
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
          existingMarker.setLatLng(latLng);
          existingMarker.setIcon(icon);
          const popup = existingMarker.getPopup();
          if (popup) {
            popup.setContent(popupHtml);
          } else {
            existingMarker.bindPopup(popupHtml);
          }
        } else {
          const marker = L.marker(latLng, { icon }).addTo(map);
          marker.bindPopup(popupHtml);
          marker.on("click", () => {
            setSelectedDmId(dmId);
            setSelectedCustomerId(null);
          });
          markers.set(dmId, marker);
        }
      });
    }

    // Remove markers that are no longer active or if layer is hidden
    markers.forEach((marker, dmId) => {
      if (!showDrivers || !currentActiveIds.has(dmId)) {
        marker.remove();
        markers.delete(dmId);
      }
    });
  }, [liveSessionsWithCoords, showDrivers, selectedDmId, createDeliveryMarkerIcon, createPopupContent]);

  // ── Sync Map Markers: Customer Locations ──────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const markers = customerMarkersRef.current;
    const activeCustomerIds = new Set<string>();

    if (showCustomers) {
      visibleCustomerLocations.forEach((cust) => {
        if (!cust.coordinates) return;
        const { latitude, longitude } = cust.coordinates;
        if (!isValidCoordinatePair(latitude, longitude)) return;

        activeCustomerIds.add(cust.customerId);
        const latLng: [number, number] = [latitude, longitude];
        const isSelected = selectedCustomerId === cust.customerId;
        const icon = createCustomerMarkerIcon(cust, isSelected);
        const popupHtml = createCustomerPopupContent(cust);

        const existingMarker = markers.get(cust.customerId);
        if (existingMarker) {
          existingMarker.setLatLng(latLng);
          existingMarker.setIcon(icon);
          const popup = existingMarker.getPopup();
          if (popup) {
            popup.setContent(popupHtml);
          } else {
            existingMarker.bindPopup(popupHtml);
          }
        } else {
          const marker = L.marker(latLng, { icon }).addTo(map);
          marker.bindPopup(popupHtml);
          marker.on("click", () => {
            setSelectedCustomerId(cust.customerId);
            setSelectedDmId(null);
          });
          markers.set(cust.customerId, marker);
        }
      });
    }

    // Clean up markers no longer visible or if layer disabled
    markers.forEach((marker, id) => {
      if (!showCustomers || !activeCustomerIds.has(id)) {
        marker.remove();
        markers.delete(id);
      }
    });
  }, [
    visibleCustomerLocations,
    showCustomers,
    selectedCustomerId,
    createCustomerMarkerIcon,
    createCustomerPopupContent,
  ]);

  // ── Fit Map Bounds to All Visible Markers ─────────────────────────────────
  const fitMapToMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const points: [number, number][] = [];

    if (showDrivers) {
      liveSessionsWithCoords.forEach((s) => {
        if (s.lastLocation && isValidCoordinatePair(s.lastLocation.latitude, s.lastLocation.longitude)) {
          points.push([s.lastLocation.latitude, s.lastLocation.longitude]);
        }
      });
    }

    if (showCustomers) {
      visibleCustomerLocations.forEach((c) => {
        if (c.coordinates && isValidCoordinatePair(c.coordinates.latitude, c.coordinates.longitude)) {
          points.push([c.coordinates.latitude, c.coordinates.longitude]);
        }
      });
    }

    if (points.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }

    if (points.length === 1) {
      map.flyTo(points[0], 15, { duration: 1 });
      return;
    }

    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, {
      padding: [45, 45],
      maxZoom: 16,
      animate: true,
    });
  }, [showDrivers, showCustomers, liveSessionsWithCoords, visibleCustomerLocations]);

  // ── Fetch Initial Snapshot (Drivers + Customers) ──────────────────────────
  const fetchSnapshot = useCallback(
    async (isManualRefresh = false) => {
      isManualRefresh ? setRefreshing(true) : setLoading(true);
      setErrorMessage(null);

      const socket = getSocket();
      let snapshotReceived = false;

      // 1. Fetch active delivery staff snapshot (via socket callback or REST)
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
        }
      }

      // 2. Fetch customer delivery locations for the day
      try {
        const custRes = await getCustomerDeliveryLocationsService(selectedDate);
        if (custRes && Array.isArray(custRes.data)) {
          setCustomerLocations(custRes.data);
        }
      } catch (custErr: any) {
        console.error("[LiveMap] Failed to fetch customer delivery locations:", custErr);
        setErrorMessage(
          custErr?.response?.data?.message || "Failed to load customer delivery locations for map"
        );
      }

      isManualRefresh ? setRefreshing(false) : setLoading(false);
    },
    [selectedDate]
  );

  // ── Socket.IO Real-Time Event Handlers ────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const handleConnect = () => {
      setSocketStatus("connected");
      setErrorMessage(null);
      fetchSnapshot();
    };

    const handleDisconnect = () => {
      setSocketStatus("disconnected");
    };

    const handleConnectError = (err: Error) => {
      console.warn("[LiveMap] Socket connect error:", err.message);
      setSocketStatus("error");
    };

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

    const handleEntryUpdated = (payload: {
      entryId: string;
      dispatchId?: string | null;
      customerId: string;
      dmId?: string | null;
      status: "delivered" | "skipped" | "pending";
      deliveredAt?: string | null;
      date?: string;
    }) => {
      setCustomerLocations((prevLocations) => {
        let modified = false;
        const nextLocations = prevLocations.map((cust) => {
          const hasMatchingDelivery = cust.deliveries.some(
            (d) => d.entryId === payload.entryId
          );
          if (!hasMatchingDelivery && cust.customerId !== payload.customerId) {
            return cust;
          }

          modified = true;
          const nextDeliveries = cust.deliveries.map((d) => {
            if (d.entryId === payload.entryId) {
              return {
                ...d,
                status: payload.status,
                deliveredAt: payload.deliveredAt || d.deliveredAt,
              };
            }
            return d;
          });

          // Recompute overall customer delivery status
          const statuses = nextDeliveries.map((d) => d.status);
          let overallStatus: "delivered" | "pending" | "skipped" | "partial" = "pending";
          if (statuses.length > 0) {
            if (statuses.every((s) => s === "delivered")) {
              overallStatus = "delivered";
            } else if (statuses.every((s) => s === "skipped")) {
              overallStatus = "skipped";
            } else if (statuses.some((s) => s === "delivered") && statuses.some((s) => s !== "delivered")) {
              overallStatus = "partial";
            } else {
              overallStatus = "pending";
            }
          }

          return {
            ...cust,
            deliveries: nextDeliveries,
            overallStatus,
          };
        });

        return modified ? nextLocations : prevLocations;
      });
    };

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
    socket.on("delivery:entry:updated", handleEntryUpdated);

    fetchSnapshot();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("delivery:dm:active", handleDmActive);
      socket.off("delivery:location:broadcast", handleLocationBroadcast);
      socket.off("delivery:dm:inactive", handleDmInactive);
      socket.off("delivery:entry:updated", handleEntryUpdated);
    };
  }, [fetchSnapshot, selectedDmId]);

  // Click handler for focusing DM
  const handleSelectDm = (session: ActiveDeliverySession) => {
    setSelectedDmId(session.dmId);
    setSelectedCustomerId(null);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (session.lastLocation) {
      const { latitude, longitude } = session.lastLocation;
      map.flyTo([latitude, longitude], 16, { duration: 1 });
      const marker = dmMarkersRef.current.get(session.dmId);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  // Click handler for focusing Customer
  const handleSelectCustomer = (customer: CustomerDeliveryLocation) => {
    setSelectedCustomerId(customer.customerId);
    setSelectedDmId(null);
    const map = mapInstanceRef.current;
    if (!map) return;

    if (customer.coordinates) {
      const { latitude, longitude } = customer.coordinates;
      map.flyTo([latitude, longitude], 16, { duration: 1 });
      const marker = customerMarkersRef.current.get(customer.customerId);
      if (marker) {
        marker.openPopup();
      }
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 flex flex-col gap-4">
      {/* ── Top Header Bar ── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Navigation size={18} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900">Live Delivery Tracking</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {activeSessionsList.length} Active {activeSessionsList.length === 1 ? "Driver" : "Drivers"}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                <MapPin size={11} className="text-blue-600" />
                {customersWithCoords.length} Customer {customersWithCoords.length === 1 ? "Stop" : "Stops"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time delivery personnel tracking with customer stops and statuses for today.
            </p>
          </div>
        </div>

        {/* ── Layer Toggles & Action Buttons ── */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {/* Toggle Drivers Layer */}
          <button
            onClick={() => setShowDrivers((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition shadow-xs ${
              showDrivers
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Toggle Delivery Staff Markers"
          >
            <User size={12} />
            Drivers ({activeSessionsList.length})
          </button>

          {/* Toggle Customers Layer */}
          <button
            onClick={() => setShowCustomers((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition shadow-xs ${
              showCustomers
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
            title="Toggle Customer Stop Markers"
          >
            <MapPin size={12} />
            Customers ({customersWithCoords.length})
          </button>

          {/* Fit Bounds Button */}
          <button
            onClick={fitMapToMarkers}
            disabled={liveSessionsWithCoords.length === 0 && visibleCustomerLocations.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Fit map view to all visible markers"
          >
            <Maximize2 size={13} />
            Fit Map
          </button>

          {/* Refresh Snapshot Button */}
          <button
            onClick={() => fetchSnapshot(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            title="Refresh map snapshot"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-blue-600" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {errorMessage && (
        <div className="flex items-center gap-2.5 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
          <AlertTriangle size={15} className="shrink-0 text-rose-500" />
          <p className="flex-1">{errorMessage}</p>
          <button onClick={() => fetchSnapshot(true)} className="font-semibold underline hover:text-rose-900">
            Retry
          </button>
        </div>
      )}

      {/* ── Main Map Viewport & Interactive Side Panel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Viewport (Takes 3 columns on desktop) */}
        <div className="lg:col-span-3 relative h-[420px] sm:h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Overlay: Loading state */}
          {loading && (
            <div className="absolute inset-0 bg-white/75 backdrop-blur-xs flex items-center justify-center gap-2.5 z-10">
              <RefreshCw size={18} className="animate-spin text-blue-600" />
              <span className="text-xs font-medium text-slate-700">Loading delivery tracking map…</span>
            </div>
          )}

          {/* Overlay: Empty State when no drivers active and no customers mapped */}
          {!loading && activeSessionsList.length === 0 && customersWithCoords.length === 0 && (
            <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[2px] flex items-center justify-center p-4 z-10 pointer-events-none">
              <div className="max-w-md rounded-2xl bg-white/95 p-5 text-center shadow-lg border border-slate-200/80 pointer-events-auto">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                  <Navigation size={22} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No Mapped Deliveries or Active Drivers</h4>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  When delivery personnel start deliveries or customer delivery addresses have coordinates, their markers will appear here.
                </p>
              </div>
            </div>
          )}

          {/* Floating Legend on Map (Bottom-right) */}
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs px-3 py-2 rounded-xl shadow-md border border-slate-200/80 text-[11px] font-medium text-slate-700 z-10 flex flex-col gap-1.5 max-w-[210px]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Map Legend</p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-white shadow-xs"></span>
              <span className="text-slate-600">Active Staff</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white shadow-xs"></span>
              <span className="text-slate-600">Customer Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-white shadow-xs"></span>
              <span className="text-slate-600">Customer Pending</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-xs"></span>
              <span className="text-slate-600">Customer Skipped</span>
            </div>
          </div>

          {/* Floating Live Indicator Badge (Bottom-left) */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg shadow-sm border border-slate-200/80 text-[11px] font-medium text-slate-700 flex items-center gap-2 z-10 pointer-events-none">
            {socketStatus === "connected" ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Socket Live
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-slate-500">
                <Radio size={12} className="animate-spin text-amber-500" />
                Reconnecting…
              </span>
            )}
            <span className="text-slate-300">|</span>
            <span>
              {visibleCustomerLocations.length} Stop{visibleCustomerLocations.length === 1 ? "" : "s"} Visible
            </span>
          </div>
        </div>

        {/* ── Side Panel: Interactive Staff & Customer Tabs ── */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/70 p-3 h-[420px] sm:h-[480px] overflow-hidden">
          {/* Navigation Tabs */}
          <div className="flex items-center rounded-xl bg-slate-200/70 p-1 mb-2.5 gap-1 shrink-0">
            <button
              onClick={() => setActiveTab("staff")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "staff"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <User size={13} />
              Staff ({activeSessionsList.length})
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === "customers"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users size={13} />
              Customers ({customersWithCoords.length})
            </button>
          </div>

          {/* TAB 1: Delivery Staff Panel */}
          {activeTab === "staff" && (
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
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
                            <p className="text-xs font-bold text-slate-900 truncate">{session.name}</p>
                            {session.mobile && (
                              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                <Phone size={9} />
                                {session.mobile}
                              </p>
                            )}
                          </div>
                        </div>

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

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {hasCoords
                            ? `Updated ${formatRelativeTime(session.lastLocation?.updatedAt)}`
                            : `Started ${formatRelativeTime(session.startedAt)}`}
                        </span>
                        {hasCoords &&
                          session.lastLocation?.speed !== null &&
                          session.lastLocation?.speed !== undefined && (
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
          )}

          {/* TAB 2: Customer Stops Panel */}
          {activeTab === "customers" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Customer Filter Pills */}
              <div className="flex items-center gap-1 pb-2 border-b border-slate-200/80 shrink-0 flex-wrap">
                <button
                  onClick={() => setCustomerFilter("all")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    customerFilter === "all"
                      ? "bg-slate-900 text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All ({customerCounts.all})
                </button>
                <button
                  onClick={() => setCustomerFilter("pending")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    customerFilter === "pending"
                      ? "bg-amber-500 text-white"
                      : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                  }`}
                >
                  Pending ({customerCounts.pending})
                </button>
                <button
                  onClick={() => setCustomerFilter("delivered")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    customerFilter === "delivered"
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  Done ({customerCounts.delivered})
                </button>
                <button
                  onClick={() => setCustomerFilter("skipped")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold transition ${
                    customerFilter === "skipped"
                      ? "bg-rose-500 text-white"
                      : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
                  }`}
                >
                  Skipped ({customerCounts.skipped})
                </button>
              </div>

              {/* Customer List */}
              <div className="flex-1 overflow-y-auto space-y-2 pt-2 pr-0.5">
                {visibleCustomerLocations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center h-full py-8 text-slate-400 gap-1.5">
                    <MapPin size={20} className="text-slate-300" />
                    <p className="text-xs font-medium text-slate-600">No customers found</p>
                    <p className="text-[11px] text-slate-400 max-w-[180px]">
                      {customersWithCoords.length === 0
                        ? "No customer stops have valid GPS coordinates recorded."
                        : `No stops matching '${customerFilter}' filter.`}
                    </p>
                  </div>
                ) : (
                  visibleCustomerLocations.map((cust) => {
                    const isSelected = selectedCustomerId === cust.customerId;
                    const statusColor = {
                      delivered: "text-emerald-700 bg-emerald-50 border-emerald-200",
                      pending: "text-amber-700 bg-amber-50 border-amber-200",
                      skipped: "text-rose-700 bg-rose-50 border-rose-200",
                      partial: "text-indigo-700 bg-indigo-50 border-indigo-200",
                    }[cust.overallStatus] || "text-slate-600 bg-slate-100 border-slate-200";

                    return (
                      <button
                        key={cust.customerId}
                        onClick={() => handleSelectCustomer(cust)}
                        className={`w-full text-left p-3 rounded-xl border transition flex flex-col gap-1.5 ${
                          isSelected
                            ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-100"
                            : "bg-white border-slate-200 hover:bg-slate-100/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{cust.name}</p>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize shrink-0 ${statusColor}`}
                          >
                            {cust.overallStatus}
                          </span>
                        </div>

                        {cust.address && (
                          <p className="text-[11px] text-slate-500 line-clamp-1 flex items-center gap-1">
                            <MapPin size={10} className="shrink-0 text-slate-400" />
                            {[cust.address.street, cust.address.city].filter(Boolean).join(", ")}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="truncate">DM: {cust.assignedDm?.name || "Unassigned"}</span>
                          {cust.totalDeliveries > 1 && (
                            <span className="font-semibold text-blue-600 shrink-0">
                              {cust.totalDeliveries} stops
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}

                {/* Sub-notice if unmapped customers exist */}
                {customersWithoutCoords.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 flex items-start gap-1.5 mt-2">
                    <HelpCircle size={13} className="shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      {customersWithoutCoords.length} customer{customersWithoutCoords.length === 1 ? "" : "s"} scheduled today do not have stored GPS coordinates and cannot be shown on the map.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveDeliveryMap;
