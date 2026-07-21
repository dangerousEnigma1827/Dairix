import { useNavigate } from "react-router-dom";
import {
  Milk,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Package,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getMonthlyDeliveryTrack,
  type MonthlyDeliveryEntry,
} from "../../api/Services/Customer/CustomerServices";

// ────────────────────────────────────────────────────────────────────────────
// Types

type DailyStatus = "delivered" | "skipped" | "pending"

type DayEntry = {
  date: Date;
  status: DailyStatus;
  deliveredAt: string | null;
  hasEntry: boolean; // whether the backend actually returned a record for this day
};

const statusConfig = {
  delivered: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    dot: "bg-emerald-500",
    cellBg: "bg-emerald-50",
    label: "Delivered",
  },
  skipped: {
    icon: XCircle,
    color: "text-rose-500",
    dot: "bg-rose-400",
    cellBg: "bg-rose-50",
    label: "Skipped",
  },
  pending: {
    icon: Clock,
    color: "text-slate-400",
    dot: "bg-slate-300",
    cellBg: "bg-slate-50",
    label: "Upcoming",
  },
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export default function DeliveryTracker() {
  const navigate = useNavigate();
  const [monthOffset, setMonthOffset] = useState(0);
  const [entries, setEntries] = useState<MonthlyDeliveryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const today = new Date();
  const anchor = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const month = anchor.getMonth() + 1; // 1-12, matches backend contract
  const year = anchor.getFullYear();
  const isCurrentMonth = monthOffset === 0;

  const monthLabel = anchor.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // ── Fetch whenever the visible month changes ──
  useEffect(() => {
    let cancelled = false;

    const fetchTrack = async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await getMonthlyDeliveryTrack(month, year);
        if (!cancelled) setEntries(data);
      } catch (err) {
        console.log("error fetching monthly delivery track", err);
        if (!cancelled) {
          setEntries([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTrack();
    return () => {
      cancelled = true;
    };
  }, [month, year]);

  // Index entries by day-of-month for O(1) lookup while building the calendar
  const entriesByDay = useMemo(() => {
    const map = new Map<number, MonthlyDeliveryEntry>();
    entries.forEach((e) => {
      map.set(new Date(e.date).getDate(), e);
    });
    return map;
  }, [entries]);

  // Days with no DeliveryEntry record are treated as "pending" (no attempt logged yet)
  const days: DayEntry[] = useMemo(() => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      const entry = entriesByDay.get(dayNum);
      return {
        date: new Date(year, month - 1, dayNum),
        status: entry?.status ?? "pending",
        deliveredAt: entry?.deliveredAt ?? null,
        hasEntry: !!entry,
      };
    });
  }, [entriesByDay, month, year]);

  const leadingBlanks = days[0]?.date.getDay() ?? 0;

  const stats = useMemo(() => {
    const past = days.filter((d) => d.hasEntry);
    const delivered = past.filter((d) => d.status === "delivered").length;
    const skipped = past.filter((d) => d.status === "skipped").length;
    const rate = past.length ? Math.round((delivered / past.length) * 100) : 0;
    return { delivered, skipped, rate };
  }, [days]);

  // Most recent first, only days that actually have a logged entry
  const log = [...days].filter((d) => d.hasEntry).reverse();

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
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Milk size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Delivery Tracker</span>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

          {/* Month card */}
          <div className="bg-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-transform"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="text-blue-200 text-xs font-medium mb-0.5">Monthly overview</p>
                <h1 className="text-lg font-bold">{monthLabel}</h1>
              </div>
              <button
                onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                disabled={isCurrentMonth}
                className="p-1.5 rounded-lg hover:bg-white/10 active:scale-95 transition-transform disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-8 text-center">
              <p className="text-sm text-slate-400">Loading delivery history…</p>
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
              <p className="text-sm text-rose-600 font-medium">Couldn't load this month's data.</p>
              <button
                onClick={() => setMonthOffset((m) => m)}
                className="mt-2 text-xs text-rose-500 underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Delivered", value: stats.delivered, color: "text-slate-900" },
                  { label: "Skipped", value: stats.skipped, color: "text-rose-500" },
                  { label: "Success rate", value: `${stats.rate}%`, color: "text-blue-600" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center"
                  >
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Calendar */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-3">
                  <CalendarDays size={13} />
                  Calendar
                </p>

                <div className="grid grid-cols-7 gap-1 mb-1">
                  {WEEKDAY_LABELS.map((w, i) => (
                    <p key={i} className="text-center text-[10px] font-medium text-slate-400">
                      {w}
                    </p>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {days.map((d) => {
                    const cfg = statusConfig[d.status];
                    const isToday = d.date.toDateString() === today.toDateString();
                    return (
                      <div key={d.date.toISOString()} className="flex items-center justify-center">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold ${cfg.cellBg} ${
                            isToday ? "ring-2 ring-blue-600 ring-offset-1" : ""
                          } ${d.status === "pending" ? "text-slate-400" : "text-slate-700"}`}
                        >
                          {d.date.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
                  {(["delivered", "skipped", "pending"] as DailyStatus[]).map((s) => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${statusConfig[s].dot}`} />
                      <span className="text-[11px] text-slate-500">{statusConfig[s].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery log */}
              <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                    <TrendingUp size={13} />
                    Delivery Log
                  </p>
                  <span className="text-[11px] text-slate-400">{log.length} entries</span>
                </div>

                {log.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-slate-400">No deliveries recorded yet this month.</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {log.map((d) => {
                      const cfg = statusConfig[d.status];
                      const Icon = cfg.icon;
                      const deliveredAtDate = d.deliveredAt ? new Date(d.deliveredAt) : null;
                      return (
                        <div
                          key={d.date.toISOString()}
                          className="flex items-center gap-3 rounded-xl p-2.5 ring-1 ring-slate-100"
                        >
                          <div className={`w-9 h-9 rounded-lg ${cfg.cellBg} flex items-center justify-center shrink-0`}>
                            <Icon size={17} className={cfg.color} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {d.date.toLocaleDateString("en-IN", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                              })}
                            </p>
                            <p className="text-xs text-slate-500">
                              {d.status === "delivered"
                                ? "Delivered to your doorstep"
                                : d.status === "skipped"
                                ? "Marked skipped by your DM"
                                : "Awaiting delivery"}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                            {deliveredAtDate && (
                              <p className="text-[11px] text-slate-400">
                                {deliveredAtDate.toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZone: "Asia/Kolkata",
                                })}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Products shortcut */}
          <button
            onClick={() => navigate("/customer/products")}
            className="w-full bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 flex items-center gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
          >
            <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center shrink-0">
              <Package size={20} className="text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 text-sm">Manage subscriptions</p>
              <p className="text-xs text-slate-500 mt-0.5">Pause, resume, or change daily quantity</p>
            </div>
            <ChevronRight size={16} className="text-slate-400 shrink-0" />
          </button>

        </div>
      </main>
    </div>
  );
}