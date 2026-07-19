import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  X,
  Loader2,
  PackageCheck,
  CalendarDays,
} from "lucide-react";

// utils
import { formatTime } from "../../utils/formatTime";
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";

// api
// NOTE: add this service in api/Services/Owner/DeliveryEntryServices.ts following the
// same pattern as getDmTodayDeliveriesService — it should hit an endpoint that returns
// every DeliveryEntry for the logged-in DM (not just today's), most recent first.
// import { getDmDeliveryHistoryService } from "../../api/Services/Owner/DeliveryEntryServices";

// ── Types — align with your DeliveryEntry model ────────────────────────────

type DeliveryStatus = "delivered" | "skipped" | "pending";

type DeliveryHistoryItem = {
  _id: string;

  customer: {
    _id: string;
    name: string;
    mobile: string;
    address?: {
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
  createdAt: string;
};

type StatusFilter = "all" | "delivered" | "skipped";
type RangeFilter = "today" | "week" | "month" | "all";

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
};

const rangeOptions: { key: RangeFilter; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
];

const statusOptions: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "delivered", label: "Delivered" },
  { key: "skipped", label: "Skipped" },
];

// Groups a flat list of entries into { "17 July 2026": DeliveryHistoryItem[] } style buckets
function groupByDate(items: DeliveryHistoryItem[]) {
  const groups: Record<string, DeliveryHistoryItem[]> = {};
  for (const item of items) {
    const key = new Date(item.deliveredAt ?? item.createdAt).toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function isWithinRange(dateStr: string, range: RangeFilter) {
  if (range === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (range === "today") {
    return date >= startOfToday;
  }
  if (range === "week") {
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return date >= startOfWeek;
  }
  if (range === "month") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth;
  }
  return true;
}

export default function DeliveryHistory() {
  const navigate = useNavigate();

  const [entries, setEntries] = useState<DeliveryHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("week");
  const [search, setSearch] = useState("");

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
    //   const req = await getDmDeliveryHistoryService();
    //   setEntries(req);
    } catch (err) {
      console.error("Error fetching delivery history:", err);
      setError("Couldn't load your delivery history. Pull down to try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = useMemo(() => {
    return entries
      .filter((e) => e.status !== "pending")
      .filter((e) => (statusFilter === "all" ? true : e.status === statusFilter))
      .filter((e) => isWithinRange(e.deliveredAt ?? e.createdAt, rangeFilter))
      .filter((e) =>
        search.trim() === ""
          ? true
          : e.customer.name.toLowerCase().includes(search.trim().toLowerCase()) ||
            e.customer.mobile.includes(search.trim())
      )
      .sort((a, b) =>
        (b.deliveredAt ?? b.createdAt).localeCompare(a.deliveredAt ?? a.createdAt)
      );
  }, [entries, statusFilter, rangeFilter, search]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const dateKeys = Object.keys(grouped);

  const totalDelivered = filtered.filter((e) => e.status === "delivered").length;
  const totalSkipped = filtered.filter((e) => e.status === "skipped").length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold text-slate-900 text-sm">Delivery History</span>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">
          {/* ── Search ── */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or mobile"
              className="w-full bg-white ring-1 ring-slate-100 shadow-sm rounded-2xl pl-10 pr-9 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:ring-blue-300"
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

          {/* ── Range filter chips ── */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {rangeOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeFilter(opt.key)}
                className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  rangeFilter === opt.key
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-white text-slate-500 ring-1 ring-slate-100"
                }`}
              >
                <CalendarDays size={12} />
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Status filter chips ── */}
          <div className="flex gap-2">
            {statusOptions.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  statusFilter === opt.key
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-500 ring-1 ring-slate-100"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* ── Summary ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalDelivered}</p>
              <p className="text-xs text-slate-500 mt-0.5">Delivered</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center">
              <p className="text-2xl font-bold text-rose-500">{totalSkipped}</p>
              <p className="text-xs text-slate-500 mt-0.5">Skipped</p>
            </div>
          </div>

          {/* ── Loading state ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 size={24} className="text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Loading history…</p>
            </div>
          )}

          {/* ── Error state ── */}
          {!loading && error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 text-center">
              <p className="text-sm text-rose-600 font-medium">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-3 text-xs font-semibold text-blue-600 underline underline-offset-2"
              >
                Try again
              </button>
            </div>
          )}

          {/* ── Empty state ── */}
          {!loading && !error && dateKeys.length === 0 && (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 flex flex-col items-center text-center gap-2">
              <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                <PackageCheck size={22} className="text-slate-400" />
              </div>
              <p className="font-semibold text-slate-800 text-sm">No deliveries found</p>
              <p className="text-xs text-slate-500">
                Try a different date range, status, or search term.
              </p>
            </div>
          )}

          {/* ── Grouped history list ── */}
          {!loading &&
            !error &&
            dateKeys.map((dateKey) => (
              <div key={dateKey}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                  {dateKey}
                </p>
                <div className="space-y-2">
                  {grouped[dateKey].map((entry, idx) => {
                    const cfg = statusConfig[entry.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={entry._id}
                        className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-center gap-3"
                      >
                        <div
                          className={`${avatarPalette[idx % avatarPalette.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}
                        >
                          {getInitials(entry.customer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {entry.customer.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {entry.products
                              .map((p) => `${p.quantity} ${p.product.unit} ${p.product.name}`)
                              .join(", ")}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                          >
                            <Icon size={10} />
                            {cfg.label}
                          </span>
                          {entry.deliveredAt && (
                            <p className="text-[10px] text-slate-400">
                              {formatTime(entry.deliveredAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </main>
    </div>
  );
}