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
//utils
import { formatTime } from "../../utils/formatTime";
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import { currUserService } from "../../api/Services/AuthServices";
import { getDmTodayDeliveriesService } from "../../api/Services/Owner/DeliveryEntryServices";

// ── Types — align with your backend response shape ────────────────────────────

type DeliveryStatus = "delivered" | "skipped" | "pending" | "paused";

type DeliveryItem = {
  _id: string;

  customer: {
    _id: string;
    name: string;
    mobile: string;
    address: {
      houseNo?: string;
      street?: string;
      landmark?: string;
      city?: string;
      pincode?: string;
    };
  };

  products: {
    product: {
      _id: string;
      name: string;
      price: number;
      unit: string;
    };
    quantity: number;
  }[];

  status: DeliveryStatus;
  deliveredAt?: string;
};

type DMProfile = {
  _id: string;
  name: string;
  mobile: string;
  zone: string;
};

const statusConfig: Record<
  DeliveryStatus,
  { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }
> = {
  delivered: {
    label: "Delivered",
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  skipped: {
    label: "Skipped",
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
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
    border: "border-amber-200",
    icon: Clock,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatAddress(address: DeliveryItem["customer"]["address"] | undefined) {
  if (!address) return "";
  return [address.houseNo, address.street, address.landmark].filter(Boolean).join(", ");
}

function getOrderTotal(products: DeliveryItem["products"]) {
  return products.reduce((sum, p) => sum + p.quantity * p.product.price, 0);
}

function getOrderSummary(products: DeliveryItem["products"]) {
  return products.map((p) => `${p.quantity}${p.product.unit} ${p.product.name}`).join(", ");
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DeliveryDashboard() {
  const navigate = useNavigate();

  const [dm, setDm] = useState<DMProfile | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState({
    dmLoading: false,
    deliveriesLoading: false,
  });

  const handleGetDm = async () => {
    setLoading((prev) => ({ ...prev, dmLoading: true }));
    try {
      const req = await currUserService();
      setDm(req);
    } catch (err) {
      console.error("Error fetching DM profile:", err);
    } finally {
      setLoading((prev) => ({ ...prev, dmLoading: false }));
    }
  };

  const handleGetDeliveries = async () => {
    setLoading((prev) => ({ ...prev, deliveriesLoading: true }));
    try {
      const req = await getDmTodayDeliveriesService();
      console.log(req)
      setDeliveries(req);
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

  const total     = deliveries.length;
  const delivered = deliveries?.filter((d) => d.status === "delivered").length;
  const skipped   = deliveries?.filter((d) => d.status === "skipped").length;
  const pending   = deliveries?.filter((d) => d.status === "pending").length;
  const completed = delivered + skipped;

  const rate = total > 0
  ? Math.round((completed / total) * 100)
  : 0;

  const recentDeliveries = [...deliveries]
    .filter((d) => d.status !== "pending")
    .sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? ""))
    .slice(0, 4);

  const pendingDeliveries = deliveries?.filter((d) => d.status === "pending");

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
              <p className="text-2xl font-bold text-emerald-500">{delivered}</p>
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
                { label: "Delivered", value: delivered, color: "text-emerald-500", dot: "bg-emerald-500" },
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
                {pendingDeliveries.slice(0, 3).map((d, idx) => {
                  const address = formatAddress(d.customer.address);
                  const total = getOrderTotal(d.products);
                  return (
                    <div
                      key={d._id}
                      className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex flex-col gap-3"
                    >
                      <button
                        onClick={() => navigate("/dm/scan")}
                        className="w-full flex items-center gap-3 text-left active:scale-95 transition-transform"
                      >
                        <div
                          className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold shrink-0 ring-2 ring-amber-100`}
                        >
                          {getInitials(d.customer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {d.customer.name}
                          </p>
                          {address && (
                            <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1">
                              <MapPin size={10} className="shrink-0 text-slate-400" />
                              {address}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-slate-800">₹{total.toFixed(0)}</p>
                          <p className="text-[10px] text-slate-400">
                            {d.products.length} item{d.products.length > 1 ? "s" : ""}
                          </p>
                        </div>
                        <ChevronRight size={15} className="text-slate-300 shrink-0" />
                      </button>

                      {/* Product chips — shows every item, not just the first */}
                      <div className="flex flex-wrap gap-1.5 pl-[52px]">
                        {d.products.map((p) => (
                          <span
                            key={p.product._id}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-1 rounded-lg ring-1 ring-slate-100"
                          >
                            <Milk size={10} className="text-blue-500" />
                            {p.quantity}{p.product.unit} {p.product.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
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
                      className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-center gap-3"
                    >
                      <div
                        className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0 ring-2 ${
                          d.status === "delivered" ? "ring-emerald-100" : "ring-rose-100"
                        }`}
                      >
                        {getInitials(d.customer.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {d.customer.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {getOrderSummary(d.products)}
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