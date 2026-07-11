import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Milk,
  Bell,
  LogOut,
  QrCode,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Banknote,
  Users,
  TrendingUp,
  MapPin,
  Phone,
  PackageCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";


//utils
import { formatTime } from "../../utils/formatTime";
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
// ── Replace these with your actual service imports ────────────────────────────
// import { currDmService } from "../../api/Services/AuthServices";
// import { getDmTodayDeliveriesService } from "../../api/Services/DM/DeliveryServices";
// import LoadingPageNoReturn from "../LoadingPageNoReturn";

// ── Types — align with your backend response shape ────────────────────────────

type DeliveryStatus = "delivered" | "skipped" | "pending" | "paused";

type DeliveryItem = {
  _id: string;
  customerName: string;
  customerMobile: string;
  address: string;
  productName: string;
  quantity: number;
  unit: string;
  status: DeliveryStatus;
  paymentMode?: "cash" | "upi" | "on_account";
  paymentAmount?: number;
  deliveredAt?: string; // ISO time string
};

type DMProfile = {
  _id: string;
  name: string;
  mobile: string;
  zone: string;
};

// ── Mock — delete and replace with useEffect / API calls ─────────────────────

const MOCK_DM: DMProfile = {
  _id: "dm_001",
  name: "Ravi Kumar",
  mobile: "98760 11111",
  zone: "Zone A",
};

const MOCK_DELIVERIES: DeliveryItem[] = [
  {
    _id: "d1",
    customerName: "Venkata Rao",
    customerMobile: "98761 23456",
    address: "H-7, Laxmi Colony",
    productName: "Cow Milk",
    quantity: 2,
    unit: "L",
    status: "delivered",
    paymentMode: "cash",
    paymentAmount: 120,
    deliveredAt: "2026-06-16T08:41:00",
  },
  {
    _id: "d2",
    customerName: "Sridevi Kumari",
    customerMobile: "98762 34567",
    address: "Flat 203, MG Nagar",
    productName: "Buffalo Milk",
    quantity: 1,
    unit: "L",
    status: "delivered",
    paymentMode: "on_account",
    deliveredAt: "2026-06-16T08:38:00",
  },
  {
    _id: "d3",
    customerName: "Mohan Prasad",
    customerMobile: "98763 45678",
    address: "B-12, NTR Colony",
    productName: "Cow Milk",
    quantity: 1.5,
    unit: "L",
    status: "skipped",
    deliveredAt: "2026-06-16T08:35:00",
  },
  {
    _id: "d4",
    customerName: "Anitha Reddy",
    customerMobile: "98764 56789",
    address: "F-5, Green Valley",
    productName: "Organic Milk",
    quantity: 1,
    unit: "L",
    status: "pending",
  },
  {
    _id: "d5",
    customerName: "Rama Krishna",
    customerMobile: "98765 67890",
    address: "House 9, NTR Colony",
    productName: "Cow Milk",
    quantity: 2,
    unit: "L",
    status: "pending",
  },
];


const statusConfig: Record<
  DeliveryStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }
> = {
  delivered: {
    label: "Delivered",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  skipped: {
    label: "Skipped",
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-100",
    icon: XCircle,
  },
  pending: {
    label: "Pending",
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    icon: Clock,
  },
  paused: {
    label: "Paused",
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: Clock,
  },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DeliveryDashboard() {
  const navigate = useNavigate();

  const [dm, setDm] = useState<DMProfile | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState({
    dmLoading: false,
    deliveriesLoading: false,
  });

  // ── API calls — swap mock with real services ──────────────────────────────
  const handleGetDm = async () => {
    setLoading((prev) => ({ ...prev, dmLoading: true }));
    try {
      // const req = await currDmService();
      // setDm(req);
      setDm(MOCK_DM); // remove this line when using real API
    } catch (err) {
      console.error("Error fetching DM profile:", err);
    } finally {
      setLoading((prev) => ({ ...prev, dmLoading: false }));
    }
  };

  const handleGetDeliveries = async () => {
    setLoading((prev) => ({ ...prev, deliveriesLoading: true }));
    try {
      // const req = await getDmTodayDeliveriesService();
      // setDeliveries(req);
      setDeliveries(MOCK_DELIVERIES); // remove this line when using real API
    } catch (err) {
      console.error("Error fetching deliveries:", err);
    } finally {
      setLoading((prev) => ({ ...prev, deliveriesLoading: false }));
    }
  };

  useEffect(() => {
    handleGetDm();
    handleGetDeliveries();
  }, []);

  // ── Show loading screen while fetching DM ─────────────────────────────────
  if (loading.dmLoading || !dm) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl">
          <Milk size={28} className="text-white" />
        </div>
        <Loader2 size={24} className="text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading your dashboard…</p>
      </div>
    );
  }

  // ── Computed stats ────────────────────────────────────────────────────────
  const total     = deliveries.length;
  const delivered = deliveries.filter((d) => d.status === "delivered").length;
  const skipped   = deliveries.filter((d) => d.status === "skipped").length;
  const pending   = deliveries.filter((d) => d.status === "pending").length;
  const rate      = total > 0 ? Math.round((delivered / (total - pending)) * 100) || 0 : 0;

  const cashCollected = deliveries
    .filter((d) => d.status === "delivered" && d.paymentMode === "cash")
    .reduce((acc, d) => acc + (d.paymentAmount ?? 0), 0);

  const upiCollected = deliveries
    .filter((d) => d.status === "delivered" && d.paymentMode === "upi")
    .reduce((acc, d) => acc + (d.paymentAmount ?? 0), 0);

  const onAccount = deliveries.filter(
    (d) => d.status === "delivered" && d.paymentMode === "on_account"
  ).length;

  const recentDeliveries = [...deliveries]
    .filter((d) => d.status !== "pending")
    .sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? ""))
    .slice(0, 4);

  const pendingDeliveries = deliveries.filter((d) => d.status === "pending");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Milk size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Dairix</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell size={18} />
              {pending > 0 && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
              )}
            </button>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

          {/* ── Profile card ── */}
          <div className="bg-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-0.5">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long", day: "numeric", month: "long",
                  })}
                </p>
                <h1 className="text-xl font-bold">{dm.name}</h1>
                <p className="text-blue-200 text-sm flex items-center gap-1.5 mt-0.5">
                  <Phone size={12} />
                  {dm.mobile}
                </p>
              </div>
              <div
                className={`${avatarPalette[0]} rounded-full w-11 h-11 flex items-center justify-center font-bold text-base shrink-0`}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              >
                {getInitials(dm.name)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-100 text-xs mt-2">
              <MapPin size={12} />
              <span>{dm.zone}</span>
            </div>
          </div>

          {/* ── Today's stats ── */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{total}</p>
              <p className="text-xs text-slate-500 mt-0.5">Assigned</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-emerald-600">{delivered}</p>
              <p className="text-xs text-slate-500 mt-0.5">Delivered</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-blue-600">{rate}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Rate</p>
            </div>
          </div>

          {/* ── Progress bar ── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp size={13} />
                Today's Progress
              </p>
              <span className="text-xs text-slate-500">
                {delivered} of {total} done
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${total > 0 ? (delivered / total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex gap-3 mt-3">
              {[
                { label: "Delivered", value: delivered, color: "text-emerald-600", dot: "bg-emerald-500" },
                { label: "Skipped",   value: skipped,   color: "text-rose-500",    dot: "bg-rose-400" },
                { label: "Pending",   value: pending,   color: "text-slate-500",   dot: "bg-slate-300" },
              ].map(({ label, value, color, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className={`text-xs font-semibold ${color}`}>{value}</span>
                  <span className="text-xs text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick actions ── */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/dm/scan")}
              className="bg-blue-600 rounded-2xl p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform shadow-sm shadow-blue-200"
            >
              <div className="bg-white/20 w-10 h-10 rounded-xl flex items-center justify-center">
                <QrCode size={20} className="text-white" />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Scan & Deliver</p>
                <p className="text-xs text-blue-200 mt-0.5">Scan customer QR code</p>
              </div>
              <ChevronRight size={14} className="text-blue-300 self-end" />
            </button>

            <button
              onClick={() => navigate("/dm/collections")}
              className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform shadow-sm"
            >
              <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <Banknote size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Collections</p>
                <p className="text-xs text-slate-500 mt-0.5">View cash & UPI collected</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>

            <button
              onClick={() => navigate("/dm/customers")}
              className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform shadow-sm"
            >
              <div className="bg-violet-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <Users size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">My Customers</p>
                <p className="text-xs text-slate-500 mt-0.5">View your delivery list</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>

            <button
              onClick={() => navigate("/dm/history")}
              className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform shadow-sm"
            >
              <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <PackageCheck size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">History</p>
                <p className="text-xs text-slate-500 mt-0.5">Past deliveries</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>
          </div>

          {/* ── Cash & UPI summary ── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
              Today's Collections
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-base font-bold text-emerald-700">
                  ₹{cashCollected.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">Cash</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-base font-bold text-blue-700">
                  ₹{upiCollected.toLocaleString("en-IN")}
                </p>
                <p className="text-[10px] text-blue-600 mt-0.5">UPI</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-base font-bold text-slate-700">{onAccount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">On Account</p>
              </div>
            </div>
          </div>

          {/* ── Pending deliveries ── */}
          {pendingDeliveries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertCircle size={13} className="text-amber-500" />
                  Pending ({pendingDeliveries.length})
                </p>
                <button
                  onClick={() => navigate("/dm/customers")}
                  className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
                >
                  View all <ChevronRight size={13} />
                </button>
              </div>
              <div className="space-y-2">
                {pendingDeliveries.slice(0, 3).map((d, idx) => (
                  <button
                    key={d._id}
                    onClick={() => navigate("/dm/scan")}
                    className="w-full bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
                  >
                    <div
                      className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}
                    >
                      {getInitials(d.customerName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {d.customerName}
                      </p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {d.address}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">
                        {d.quantity} {d.unit}
                      </p>
                      <p className="text-[10px] text-slate-400">{d.productName}</p>
                    </div>
                    <ChevronRight size={15} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent activity ── */}
          {recentDeliveries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Recent Activity
                </p>
                <button
                  onClick={() => navigate("/dm/history")}
                  className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
                >
                  Full history <ChevronRight size={13} />
                </button>
              </div>
              <div className="space-y-2">
                {recentDeliveries.map((d, idx) => {
                  const cfg    = statusConfig[d.status];
                  const Icon   = cfg.icon;
                  return (
                    <div
                      key={d._id}
                      className="bg-white rounded-2xl ring-1 ring-slate-100 p-4 flex items-center gap-3"
                    >
                      <div
                        className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {getInitials(d.customerName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {d.customerName}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {d.quantity} {d.unit} · {d.productName}
                          {d.paymentMode && d.paymentMode !== "on_account" && (
                            <span className="ml-1">
                              · {d.paymentMode.toUpperCase()}
                              {d.paymentAmount ? ` ₹${d.paymentAmount}` : ""}
                            </span>
                          )}
                          {d.paymentMode === "on_account" && " · On Account"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                          <Icon size={10} />
                          {cfg.label}
                        </span>
                        {d.deliveredAt && (
                          <p className="text-[10px] text-slate-400">
                            {formatTime(d.deliveredAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All done state ── */}
          {pending === 0 && delivered > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-3">
              <CheckCircle2 size={24} className="text-emerald-500 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-800">All deliveries done!</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  Great work today. {delivered} deliveries completed.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}