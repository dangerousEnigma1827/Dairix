import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  QrCode,
  Phone,
  MapPin,
  Milk,
  ChevronRight,
  Loader2,
  Filter,
  Droplets,
} from "lucide-react";

// ── Replace with your actual imports ─────────────────────────────────────────
// import { getDmCustomersService } from "../../api/Services/DM/DeliveryServices";
// import LoadingPageNoReturn from "../LoadingPageNoReturn";

// ── Types ─────────────────────────────────────────────────────────────────────

type DeliveryStatus = "delivered" | "skipped" | "pending" | "paused";

type DMCustomer = {
  _id: string;
  name: string;
  mobile: string;
  address: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  todayStatus: DeliveryStatus;
  deliveredAt?: string;
  paymentMode?: "cash" | "upi" | "on_account";
};

type FilterTab = "all" | "pending" | "delivered" | "skipped";

// ── Mock data — replace with API ──────────────────────────────────────────────

const MOCK_CUSTOMERS: DMCustomer[] = [
  {
    _id: "c1", name: "Venkata Rao",    mobile: "98761 23456", address: "H-7, Laxmi Colony",
    productName: "Cow Milk",     quantity: 2,   unit: "L", pricePerUnit: 60,
    todayStatus: "delivered", deliveredAt: "08:41", paymentMode: "cash",
  },
  {
    _id: "c2", name: "Sridevi Kumari", mobile: "98762 34567", address: "Flat 203, MG Nagar",
    productName: "Buffalo Milk", quantity: 1,   unit: "L", pricePerUnit: 75,
    todayStatus: "delivered", deliveredAt: "08:38", paymentMode: "on_account",
  },
  {
    _id: "c3", name: "Mohan Prasad",   mobile: "98763 45678", address: "B-12, NTR Colony",
    productName: "Cow Milk",     quantity: 1.5, unit: "L", pricePerUnit: 60,
    todayStatus: "skipped",
  },
  {
    _id: "c4", name: "Anitha Reddy",   mobile: "98764 56789", address: "F-5, Green Valley",
    productName: "Organic Milk", quantity: 1,   unit: "L", pricePerUnit: 90,
    todayStatus: "pending",
  },
  {
    _id: "c5", name: "Rama Krishna",   mobile: "98765 67890", address: "House 9, NTR Colony",
    productName: "Cow Milk",     quantity: 2,   unit: "L", pricePerUnit: 60,
    todayStatus: "pending",
  },
  {
    _id: "c6", name: "Padma Devi",     mobile: "98766 78901", address: "Plot 12, Nehru Nagar",
    productName: "Buffalo Milk", quantity: 1.5, unit: "L", pricePerUnit: 75,
    todayStatus: "pending",
  },
  {
    _id: "c7", name: "Suresh Goud",    mobile: "98767 89012", address: "D-3, Ambedkar Colony",
    productName: "Cow Milk",     quantity: 1,   unit: "L", pricePerUnit: 60,
    todayStatus: "delivered", deliveredAt: "08:22", paymentMode: "upi",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const avatarPalette = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
];

function getInitials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

const statusConfig: Record<
  DeliveryStatus,
  { label: string; color: string; bg: string; icon: typeof CheckCircle2; dot: string }
> = {
  delivered: { label: "Delivered", color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle2, dot: "bg-emerald-500" },
  skipped:   { label: "Skipped",   color: "text-rose-500",    bg: "bg-rose-50",    icon: XCircle,      dot: "bg-rose-400" },
  pending:   { label: "Pending",   color: "text-slate-400",   bg: "bg-slate-100",  icon: Clock,        dot: "bg-slate-300" },
  paused:    { label: "Paused",    color: "text-amber-500",   bg: "bg-amber-50",   icon: Clock,        dot: "bg-amber-400" },
};

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "all",       label: "All" },
  { id: "pending",   label: "Pending" },
  { id: "delivered", label: "Delivered" },
  { id: "skipped",   label: "Skipped" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DMCustomers() {
  const navigate = useNavigate();

  const [customers, setCustomers]   = useState<DMCustomer[]>([]);
  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState<FilterTab>("all");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [loading, setLoading]       = useState({ customersLoading: false });

  // ── API call ──────────────────────────────────────────────────────────────
  const handleGetCustomers = async () => {
    setLoading((prev) => ({ ...prev, customersLoading: true }));
    try {
      // const req = await getDmCustomersService();
      // setCustomers(req);
      setCustomers(MOCK_CUSTOMERS); // remove when using real API
    } catch (err) {
      console.error("Error fetching DM customers:", err);
    } finally {
      setLoading((prev) => ({ ...prev, customersLoading: false }));
    }
  };

  useEffect(() => {
    handleGetCustomers();
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const filtered = customers.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.mobile.includes(search) ||
      c.address.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "all" || c.todayStatus === activeTab;
    return matchesSearch && matchesTab;
  });

  const counts = {
    all:       customers.length,
    pending:   customers.filter((c) => c.todayStatus === "pending").length,
    delivered: customers.filter((c) => c.todayStatus === "delivered").length,
    skipped:   customers.filter((c) => c.todayStatus === "skipped").length,
  };

  if (loading.customersLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Loader2 size={24} className="text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading your customers…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-slate-900 text-sm">My Customers</h1>
            <p className="text-xs text-slate-400">
              {counts.delivered} of {counts.all} delivered today
            </p>
          </div>
          <button
            onClick={() => navigate("/dm/scan")}
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold"
          >
            <QrCode size={14} />
            Scan
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-3">

          {/* ── Summary strip ── */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Pending",   value: counts.pending,   color: "text-slate-700",   bg: "bg-white" },
              { label: "Delivered", value: counts.delivered, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Skipped",   value: counts.skipped,   color: "text-rose-500",    bg: "bg-rose-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`${bg} rounded-2xl ring-1 ring-slate-100 p-3 text-center`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Search ── */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2.5 ring-0 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 transition-all">
            <Search size={16} className="text-slate-400 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, address…"
              className="flex-1 text-sm outline-none text-slate-800 placeholder:text-slate-400 bg-transparent"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-slate-400 hover:text-slate-600">
                <XCircle size={15} />
              </button>
            )}
          </div>

          {/* ── Filter tabs ── */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            {filterTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-200 hover:ring-slate-300"
                }`}
              >
                {label}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {counts[id]}
                </span>
              </button>
            ))}
          </div>

          {/* ── Customer list ── */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
              <Droplets size={30} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-500">No customers found</p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-xs text-blue-600 font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((customer, idx) => {
                const cfg      = statusConfig[customer.todayStatus];
                const Icon     = cfg.icon;
                const isExpanded = expanded === customer._id;

                return (
                  <div
                    key={customer._id}
                    className="bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden"
                  >
                    {/* Main row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : customer._id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      {/* Avatar */}
                      <div
                        className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-10 h-10 flex items-center justify-center text-xs font-bold shrink-0`}
                      >
                        {getInitials(customer.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {customer.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          {customer.address}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Milk size={10} />
                            {customer.quantity}{customer.unit} {customer.productName}
                          </span>
                          {customer.deliveredAt && (
                            <span className="text-[10px] text-slate-300">·</span>
                          )}
                          {customer.deliveredAt && (
                            <span className="text-[10px] text-slate-400">{customer.deliveredAt}</span>
                          )}
                        </div>
                      </div>

                      {/* Status badge */}
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                        >
                          <Icon size={10} />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          ₹{(customer.quantity * customer.pricePerUnit).toFixed(0)}
                        </span>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 space-y-3">

                        {/* Contact + address */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Phone size={12} className="text-slate-400 shrink-0" />
                            {customer.mobile}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <MapPin size={12} className="text-slate-400 shrink-0" />
                            {customer.address}
                          </div>
                        </div>

                        {/* Payment mode if delivered */}
                        {customer.paymentMode && customer.todayStatus === "delivered" && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Payment mode</span>
                            <span className="font-semibold text-slate-800 capitalize">
                              {customer.paymentMode === "on_account" ? "On Account" : customer.paymentMode.toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-1">
                          <a
                            href={`tel:${customer.mobile.replace(/\s/g, "")}`}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <Phone size={13} />
                            Call
                          </a>

                          {customer.todayStatus === "pending" && (
                            <button
                              onClick={() => navigate("/dm/scan")}
                              className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold active:scale-95 transition-all"
                            >
                              <QrCode size={13} />
                              Scan & Deliver
                            </button>
                          )}

                          {customer.todayStatus === "skipped" && (
                            <button
                              onClick={() => navigate("/dm/scan")}
                              className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold active:scale-95 transition-all"
                            >
                              <QrCode size={13} />
                              Retry Delivery
                            </button>
                          )}

                          {customer.todayStatus === "delivered" && (
                            <div className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-semibold">
                              <CheckCircle2 size={13} />
                              Done
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}