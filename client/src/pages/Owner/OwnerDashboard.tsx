import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Truck,
  Milk,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ArrowUpRight,
  Plus,
  TrendingUp,
  PieChart as PieChartIcon,
  RefreshCw,
  Loader2,
  ChevronRight,
  CalendarClock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

// utils
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";

// services — all four already exist in your codebase
import { getAllDms } from "../../api/Services/Owner/DmServices";
import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import { getProducts } from "../../api/Services/Owner/ProductServices";
import { getTodayDispatchService } from "../../api/Services/Owner/DispatchServices";
// NOTE: this one is new — add it next to getTodayDispatchService. It should return the
// last 7 days of DeliveryEntry data aggregated per day, e.g. via a Mongo $group on
// deliveredAt/createdAt: [{ date: "2026-07-13", delivered: 42, skipped: 3, volume: 61.5 }, ...]
// import { getWeeklyDispatchStatsService } from "../../api/Services/Owner/DispatchServices";

// ── Types (mirrors your mongoose models) ───────────────────────────────────

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
};

type Customer = {
  _id: string;
  name: string;
  mobile: string;
  assignedDm: { _id: string } | null;
};

type DM = {
  _id: string;
  name: string;
  mobile: string;
};

type Allocation = {
  product: Product;
  quantity: number;
};

type DMDeliveryBlock = {
  dm: DM;
  allocations: Allocation[];
  status: "assigned" | "completed";
};

type DeliveryEntry = {
  _id: string;
  customer: { _id: string; name: string };
  dm: { _id: string; name: string };
  products: { product: Product; quantity: number }[];
  status: "pending" | "delivered" | "skipped";
  deliveredAt?: string;
};

type DispatchData = {
  _id: string;
  date: string;
  deliveries: DMDeliveryBlock[];
  status: "created" | "completed";
};

type DailyStat = {
  date: string;
  delivered: number;
  skipped: number;
  volume: number;
};

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#8b5cf6", "#f43f5e", "#0ea5e9"];

// ── Small presentational bits ───────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
  tint: "blue" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<typeof tint, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tints[tint]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon?: typeof Users;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          {Icon && <Icon size={15} className="text-slate-400" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function EntryStatusDot({ status }: { status: DeliveryEntry["status"] }) {
  if (status === "delivered") return <CheckCircle2 size={13} className="text-emerald-500" />;
  if (status === "skipped") return <XCircle size={13} className="text-rose-500" />;
  return <Clock size={13} className="text-amber-500" />;
}

// ── Main Page ────────────────────────────────────────────────────────────

export default function OwnerDashboard() {
  const navigate = useNavigate();

  const [dms, setDms] = useState<DM[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dispatchDoc, setDispatchDoc] = useState<DispatchData | null>(null);
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<DailyStat[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weeklyError, setWeeklyError] = useState(false);

  const fetchAll = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [dmRes, custRes, prodRes, dispatchRes] = await Promise.all([
        getAllDms(),
        getAllCustomers(),
        getProducts(),
        getTodayDispatchService(),
      ]);
      setDms(dmRes);
      setCustomers(custRes);
      setProducts(prodRes);
      setDispatchDoc(dispatchRes?.dispatch ?? null);
      setDeliveryEntries(dispatchRes?.deliveryEntries ?? []);
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      // const res = await getWeeklyDispatchStatsService();
      // setWeeklyStats(res ?? []);
      setWeeklyStats([]);
      setWeeklyError(false);
    } catch (err) {
      console.error("Error loading weekly stats:", err);
      setWeeklyError(true);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchWeeklyStats();
  }, []);

  const handleRefresh = () => {
    fetchAll(true);
    fetchWeeklyStats();
  };

  // ── Derived: today's dispatch numbers ─────────────────────────────────
  const statusDms = dispatchDoc?.deliveries ?? [];

  const productTotals = useMemo(() => {
    const map = new Map<string, { product: Product; total: number }>();
    statusDms.forEach((block) => {
      block.allocations.forEach((a) => {
        const existing = map.get(a.product._id);
        if (existing) existing.total += a.quantity;
        else map.set(a.product._id, { product: a.product, total: a.quantity });
      });
    });
    return Array.from(map.values());
  }, [statusDms]);

  const todaysVolume = productTotals.reduce((s, p) => s + p.total, 0);
  const todaysRevenue = productTotals.reduce((s, p) => s + p.total * p.product.price, 0);

  const deliveredCount = deliveryEntries.filter((e) => e.status === "delivered").length;
  const skippedCount = deliveryEntries.filter((e) => e.status === "skipped").length;
  const pendingCount = deliveryEntries.filter((e) => e.status === "pending").length;
  const totalStops = deliveryEntries.length;
  const progressPct = totalStops
    ? Math.round(((deliveredCount + skippedCount) / totalStops) * 100)
    : 0;

  const unassignedCount = customers.filter((c) => !c.assignedDm).length;

  const entriesForDm = (dmId: string) => deliveryEntries.filter((e) => e.dm._id === dmId);

  const dmChartData = statusDms.map((block) => {
    const entries = entriesForDm(block.dm._id);
    return {
      name: block.dm.name.split(" ")[0],
      Delivered: entries.filter((e) => e.status === "delivered").length,
      Skipped: entries.filter((e) => e.status === "skipped").length,
      Pending: entries.filter((e) => e.status === "pending").length,
    };
  });

  const pieData = productTotals.map((p) => ({ name: p.product.name, value: p.total }));

  const weeklyChartData = weeklyStats.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }),
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
        <Loader2 size={22} className="text-blue-600 animate-spin" />
        <span className="text-slate-500 text-sm">Loading your dashboard…</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500 md:text-base flex items-center gap-1.5">
              <CalendarClock size={14} />
              {today}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            {dispatchDoc ? (
              <button
                onClick={() => navigate("/owner/deliveries")}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Truck size={16} />
                View Dispatch
              </button>
            ) : (
              <button
                onClick={() => navigate("/owner/deliveries")}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={16} />
                Create Dispatch
              </button>
            )}
          </div>
        </div>

        {/* ── Top stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Total customers" value={String(customers.length)} tint="blue" />
          <StatCard icon={Truck} label="Delivery staff" value={String(dms.length)} tint="emerald" />
          <StatCard
            icon={Milk}
            label="Today's volume"
            value={`${todaysVolume.toFixed(1)} L`}
            sub={dispatchDoc ? undefined : "No dispatch yet"}
            tint="amber"
          />
          <StatCard
            icon={IndianRupee}
            label="Today's revenue"
            value={`₹${todaysRevenue.toLocaleString("en-IN")}`}
            sub={dispatchDoc ? undefined : "No dispatch yet"}
            tint="rose"
          />
        </div>

        {/* ── Unassigned customers alert ── */}
        {unassignedCount > 0 && (
          <button
            onClick={() => navigate("/owner/customers")}
            className="w-full flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-left transition hover:bg-amber-100"
          >
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <p className="flex-1 text-sm text-amber-700">
              <span className="font-semibold">{unassignedCount} customer{unassignedCount > 1 ? "s" : ""}</span>{" "}
              {unassignedCount > 1 ? "aren't" : "isn't"} assigned to a delivery man yet.
            </p>
            <ChevronRight size={16} className="text-amber-500 shrink-0" />
          </button>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── LEFT: charts (span 2) ── */}
          <div className="xl:col-span-2 space-y-6">
            {/* Today's dispatch progress */}
            <SectionCard
              title="Today's Dispatch Progress"
              icon={Truck}
              action={
                dispatchDoc ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200">
                    {dispatchDoc.status === "completed" ? "Completed" : "In progress"}
                  </span>
                ) : null
              }
            >
              {!dispatchDoc ? (
                <div className="flex flex-col items-center text-center gap-2 py-8">
                  <div className="bg-slate-50 w-12 h-12 rounded-2xl flex items-center justify-center">
                    <Truck size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">No dispatch created yet</p>
                  <p className="text-xs text-slate-400">
                    Start today's dispatch to allocate milk to your delivery staff.
                  </p>
                  <button
                    onClick={() => navigate("/owner/deliveries")}
                    className="mt-2 text-xs font-semibold text-blue-600 underline underline-offset-2"
                  >
                    Create dispatch
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {progressPct}% of {totalStops} stops closed out
                  </p>
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-emerald-700 leading-none">{deliveredCount}</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Delivered</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
                      <Clock size={16} className="text-amber-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-amber-700 leading-none">{pendingCount}</p>
                        <p className="text-[10px] text-amber-600 mt-0.5">Pending</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5">
                      <XCircle size={16} className="text-rose-600 shrink-0" />
                      <div>
                        <p className="text-sm font-bold text-rose-700 leading-none">{skippedCount}</p>
                        <p className="text-[10px] text-rose-600 mt-0.5">Skipped</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </SectionCard>

            {/* Weekly volume trend */}
            <SectionCard title="Delivery Volume — Last 7 Days" icon={TrendingUp}>
              {weeklyError || weeklyChartData.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-1 py-10">
                  <p className="text-sm text-slate-500">No weekly data available yet</p>
                  <p className="text-xs text-slate-400">
                    This chart fills in once a few days of dispatch history exist.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={weeklyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    {/* <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                      formatter={(value: number) => [`${value} L`, "Volume"]}
                    /> */}
                    <Area
                      type="monotone"
                      dataKey="volume"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#volumeFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </SectionCard>

            {/* DM delivery comparison */}
            <SectionCard title="Delivery Staff — Today's Stops" icon={Users}>
              {dmChartData.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-1 py-10">
                  <p className="text-sm text-slate-500">No stops to show yet</p>
                  <p className="text-xs text-slate-400">Create today's dispatch to see this chart.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={dmChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11 }}
                      iconType="circle"
                      iconSize={8}
                    />
                    <Bar dataKey="Delivered" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Pending" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="Skipped" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* ── RIGHT: side panels ── */}
          <div className="space-y-6">
            {/* Product split donut */}
            <SectionCard title="Today's Product Split" icon={PieChartIcon}>
              {pieData.length === 0 ? (
                <div className="flex flex-col items-center text-center gap-1 py-8">
                  <p className="text-sm text-slate-500">Nothing dispatched yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      {/* <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={3}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(value: number) => [`${value} L`, ""]}
                      /> */}
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {pieData.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-slate-600">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          {p.name}
                        </span>
                        <span className="font-semibold text-slate-800">{p.value} L</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </SectionCard>

            {/* DM snapshot */}
            <SectionCard
              title="Delivery Staff"
              icon={Truck}
              action={
                <button
                  onClick={() => navigate("/owner/delivery-staff")}
                  className="text-xs font-medium text-blue-600 flex items-center gap-0.5"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              }
            >
              {dms.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No delivery staff added yet</p>
              ) : (
                <div className="space-y-1">
                  {dms.slice(0, 6).map((dm, i) => {
                    const entries = entriesForDm(dm._id);
                    const delivered = entries.filter((e) => e.status === "delivered").length;
                    return (
                      <button
                        key={dm._id}
                        onClick={() => navigate(`/owner/delivery-staff/${dm._id}`)}
                        className="w-full flex items-center gap-3 py-2 px-2 -mx-2 rounded-xl text-left transition hover:bg-slate-50"
                      >
                        <div
                          className={`${avatarPalette[i % avatarPalette.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}
                        >
                          {getInitials(dm.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{dm.name}</p>
                          <p className="text-xs text-slate-400">
                            {entries.length > 0 ? `${delivered}/${entries.length} delivered` : "No stops today"}
                          </p>
                        </div>
                        <ChevronRight size={14} className="text-slate-300 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* Recent activity */}
            <SectionCard
              title="Recent Deliveries"
              icon={Clock}
              action={
                <button
                  onClick={() => navigate("/owner/deliveries")}
                  className="text-xs font-medium text-blue-600 flex items-center gap-0.5"
                >
                  View all <ArrowUpRight size={12} />
                </button>
              }
            >
              {deliveryEntries.filter((e) => e.status !== "pending").length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">Nothing recorded yet today</p>
              ) : (
                <div className="space-y-2">
                  {[...deliveryEntries]
                    .filter((e) => e.status !== "pending")
                    .sort((a, b) => (b.deliveredAt ?? "").localeCompare(a.deliveredAt ?? ""))
                    .slice(0, 5)
                    .map((entry) => (
                      <div key={entry._id} className="flex items-center gap-2.5 py-1.5">
                        <EntryStatusDot status={entry.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">
                            {entry.customer.name}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            via {entry.dm.name}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}