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
  ChevronDown,
  Loader2,
  Droplets,
  Wallet,
  Banknote,
  CreditCard,
  X,
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
  {
    label: string;
    color: string;
    bg: string;
    icon: typeof CheckCircle2;
    dot: string;
    ring: string;
  }
> = {
  delivered: { label: "Delivered", color: "text-emerald-500", bg: "bg-emerald-50", icon: CheckCircle2, dot: "bg-emerald-500", ring: "ring-emerald-100" },
  skipped:   { label: "Skipped",   color: "text-rose-500",    bg: "bg-rose-50",    icon: XCircle,      dot: "bg-rose-400",   ring: "ring-rose-100" },
  pending:   { label: "Pending",   color: "text-slate-400",   bg: "bg-slate-50",   icon: Clock,        dot: "bg-slate-300",  ring: "ring-slate-100" },
  paused:    { label: "Paused",    color: "text-amber-500",   bg: "bg-amber-50",   icon: Clock,        dot: "bg-amber-400",  ring: "ring-amber-100" },
};

const paymentIcon: Record<NonNullable<DMCustomer["paymentMode"]>, typeof Banknote> = {
  cash: Banknote,
  upi: Wallet,
  on_account: CreditCard,
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

  const deliveredCustomers = customers.filter((c) => c.todayStatus === "delivered");
  const litresDelivered = deliveredCustomers.reduce((sum, c) => sum + c.quantity, 0);
  const earningsToday = deliveredCustomers.reduce((sum, c) => sum + c.quantity * c.pricePerUnit, 0);
  const completionRate = counts.all > 0 ? Math.round((counts.delivered / counts.all) * 100) : 0;

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
            className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-2 rounded-xl text-xs font-semibold active:scale-95 transition-transform shadow-sm shadow-blue-200"
          >
            <QrCode size={14} />
            Scan
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-4">

          {/* ── Overview card ── */}
          <div className="bg-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-0.5">Today's Round</p>
                <h2 className="text-2xl font-bold">
                  {counts.delivered} <span className="text-blue-200 text-base font-semibold">/ {counts.all} done</span>
                </h2>
                <p className="text-blue-100 text-xs mt-1">
                  {counts.pending} pending · ₹{earningsToday.toLocaleString("en-IN")} collected
                </p>
              </div>
              <div className="bg-white/15 rounded-full p-2.5 shrink-0">
                <Droplets size={22} className="text-white" />
              </div>
            </div>

            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="flex gap-3 mt-3">
              {[
                { label: "Delivered", value: counts.delivered, dot: "bg-white" },
                { label: "Skipped",   value: counts.skipped,   dot: "bg-rose-300" },
                { label: "Pending",   value: counts.pending,   dot: "bg-blue-200" },
              ].map(({ label, value, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-xs font-semibold text-white">{value}</span>
                  <span className="text-xs text-blue-200">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Secondary stats ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-slate-900">{litresDelivered}L</p>
              <p className="text-xs text-slate-500 mt-0.5">Delivered today</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-blue-600">{completionRate}%</p>
              <p className="text-xs text-slate-500 mt-0.5">Route complete</p>
            </div>
          </div>

          {/* ── Sticky search + filters ── */}
          <div className="sticky top-14 z-30 -mx-4 px-4 bg-slate-50 pt-1 pb-2 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, mobile, address…"
                className="w-full bg-white ring-1 ring-slate-100 shadow-sm rounded-2xl pl-10 pr-9 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-300 transition-shadow"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {filterTabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors active:scale-95 ${
                    activeTab === id
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                      : "bg-white text-slate-500 ring-1 ring-slate-100"
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
          </div>

          {/* ── Customer list ── */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-10 text-center">
              <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Droplets size={22} className="text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No customers found</p>
              <p className="text-xs text-slate-500 mt-1">Try a different search or filter.</p>
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
                const cfg         = statusConfig[customer.todayStatus];
                const Icon        = cfg.icon;
                const isExpanded  = expanded === customer._id;
                const PayIcon     = customer.paymentMode ? paymentIcon[customer.paymentMode] : null;
                const amount      = customer.quantity * customer.pricePerUnit;

                return (
                  <div
                    key={customer._id}
                    className="relative bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Status accent */}
                    <span className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.dot}`} />

                    {/* Main row */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : customer._id)}
                      className="w-full flex items-center gap-3 pl-5 pr-4 py-3.5 text-left active:bg-slate-50 transition-colors"
                    >
                      {/* Avatar */}
                      <div
                        className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-11 h-11 flex items-center justify-center text-xs font-bold shrink-0 ring-2 ${cfg.ring}`}
                      >
                        {getInitials(customer.name)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {customer.name}
                          </p>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                          >
                            <Icon size={10} />
                            {cfg.label}
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="shrink-0" />
                          {customer.address}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg">
                            <Milk size={11} />
                            {customer.quantity}{customer.unit}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate">
                            {customer.productName}
                          </span>
                          {customer.deliveredAt && (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md ml-auto shrink-0">
                              {customer.deliveredAt}
                            </span>
                          )}
                          <span className={`text-[11px] text-slate-300 shrink-0 ${customer.deliveredAt ? "" : "ml-auto"}`}>
                            ₹{amount.toFixed(0)}
                          </span>
                        </div>
                      </div>

                      <ChevronDown
                        size={16}
                        className={`text-slate-300 shrink-0 transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Expanded detail — smooth grid-rows animation, no JS height measuring */}
                    <div
                      className={`grid transition-all duration-300 ease-out ${
                        isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-4">

                          {/* Contact */}
                          <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                              Contact
                            </p>
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
                          </div>

                          {/* Payment mode if delivered */}
                          {customer.paymentMode && customer.todayStatus === "delivered" && PayIcon && (
                            <div>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                                Payment
                              </p>
                              <div className="flex items-center justify-between text-xs bg-white rounded-xl ring-1 ring-slate-100 px-3 py-2">
                                <span className="text-slate-500 flex items-center gap-1.5">
                                  <PayIcon size={13} className="text-slate-400" />
                                  Mode
                                </span>
                                <span className="font-semibold text-slate-800">
                                  {customer.paymentMode === "on_account" ? "On Account" : customer.paymentMode.toUpperCase()}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Quick actions */}
                          <div className="flex gap-2">
                            <a
                              href={`tel:${customer.mobile.replace(/\s/g, "")}`}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl ring-1 ring-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 active:scale-95 transition-all"
                            >
                              <Phone size={13} />
                              Call
                            </a>

                            {customer.todayStatus === "pending" && (
                              <button
                                onClick={() => navigate("/dm/scan")}
                                className="flex-[2] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold active:scale-95 transition-all shadow-sm shadow-blue-200"
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
                      </div>
                    </div>
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