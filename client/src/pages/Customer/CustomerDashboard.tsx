import { useNavigate } from "react-router-dom";
import {
  Milk,
  Bell,
  LogOut,
  Phone,
  MapPin,
  UserCircle2,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  QrCode,
  CreditCard,
  Package,
  ChevronRight,
  Droplets,
  AlertCircle,
} from "lucide-react";

// ── swap these with your real API types / data ──────────────────────────────

type DailyStatus = "delivered" | "skipped" | "paused" | "pending";

type Customer = {
  name: string;
  mobile: string;
  address: { houseNo: string; street: string; city: string };
  assignedDm: { name: string; mobile: string } | null;
  subscriptions: { productName: string; quantity: number; pricePerUnit: number }[];
  joinedOn: string;
};

type Bill = {
  month: string;
  totalAmount: number;
  amountPaid: number;
  status: "paid" | "pending" | "overdue";
};

type WeekDay = {
  label: string;
  date: number;
  isToday: boolean;
  status: DailyStatus | null;
};

// ── mock — delete and replace with useEffect / API calls ────────────────────

const CUSTOMER: Customer = {
  name: "Venkata Rao",
  mobile: "98761 23456",
  address: { houseNo: "H-7", street: "Laxmi Colony", city: "Kamareddy" },
  assignedDm: { name: "Ravi Kumar", mobile: "98760 11111" },
  subscriptions: [
    { productName: "Cow Milk", quantity: 2, pricePerUnit: 60 },
  ],
  joinedOn: "2025-01-10",
};

const CURRENT_BILL: Bill = {
  month: "June 2026",
  totalAmount: 1800,
  amountPaid: 0,
  status: "pending",
};

const STATS = { delivered: 14, skipped: 1, rate: 93 };

// Build this week's delivery strip (Sun–Sat)
function buildWeek(): WeekDay[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  // Fake statuses for demo — replace with real delivery data
  const fakeStatus: DailyStatus[] = [
    "delivered", "delivered", "delivered", "skipped", "delivered", "delivered", "pending",
  ];

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      label: days[d.getDay()],
      date: d.getDate(),
      isToday: d.toDateString() === today.toDateString(),
      status: d <= today ? fakeStatus[i] : "pending",
    };
  });
}

const WEEK = buildWeek();

// ────────────────────────────────────────────────────────────────────────────

const TODAY_STATUS: DailyStatus = "delivered"; // replace with real value

const statusConfig = {
  delivered: {
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "Delivered today",
    sub: "2L received · On account",
  },
  skipped: {
    icon: XCircle,
    color: "text-rose-500",
    bg: "bg-rose-50",
    border: "border-rose-200",
    label: "Not delivered today",
    sub: "Marked skipped by your DM",
  },
  paused: {
    icon: Clock,
    color: "text-amber-500",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Paused today",
    sub: "You requested a pause",
  },
  pending: {
    icon: Clock,
    color: "text-slate-400",
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "Awaiting delivery",
    sub: "Your DM is on the way",
  },
};

const dotColor: Record<DailyStatus, string> = {
  delivered: "bg-emerald-500",
  skipped:   "bg-rose-400",
  paused:    "bg-amber-400",
  pending:   "bg-slate-200",
};

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const todayCfg = statusConfig[TODAY_STATUS];
  const TodayIcon = todayCfg.icon;

  const outstandingBalance = CURRENT_BILL.totalAmount - CURRENT_BILL.amountPaid;
  const monthlyEstimate = CUSTOMER.subscriptions.reduce(
    (acc, s) => acc + s.quantity * s.pricePerUnit * 30,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Milk size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">My Dairy</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
            </button>
            <button className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8 space-y-4">

          {/* Profile card */}
          <div className="bg-blue-600 rounded-2xl p-5 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-blue-200 text-xs font-medium mb-0.5">Welcome back</p>
                <h1 className="text-xl font-bold">{CUSTOMER.name}</h1>
                <p className="text-blue-200 text-sm flex items-center gap-1.5 mt-0.5">
                  <Phone size={12} />
                  {CUSTOMER.mobile}
                </p>
              </div>
              <div className="bg-white/15 rounded-full p-2.5">
                <UserCircle2 size={26} className="text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-blue-100 text-xs">
              <MapPin size={12} />
              <span>
                {CUSTOMER.address.houseNo}, {CUSTOMER.address.street},{" "}
                {CUSTOMER.address.city}
              </span>
            </div>
          </div>

          {/* Today's delivery status */}
          <div className={`rounded-2xl border ${todayCfg.border} ${todayCfg.bg} p-4`}>
            <p className="text-xs font-medium text-slate-500 mb-2">TODAY'S DELIVERY</p>
            <div className="flex items-center gap-3">
              <TodayIcon size={26} className={todayCfg.color} />
              <div>
                <p className={`font-semibold ${todayCfg.color}`}>{todayCfg.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{todayCfg.sub}</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Delivered",  value: STATS.delivered, color: "text-slate-900" },
              { label: "Skipped",    value: STATS.skipped,   color: "text-rose-500" },
              { label: "This month", value: `${STATS.rate}%`, color: "text-blue-600" },
            ].map(({ label, value, color }) => (
              <button
                key={label}
                onClick={() => navigate("/customer/deliveries")}
                className="bg-white rounded-2xl p-4 shadow-sm ring-1 ring-slate-100 text-center active:scale-95 transition-transform"
              >
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </button>
            ))}
          </div>

          {/* This week strip */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <CalendarDays size={13} />
                This Week
              </p>
              <button
                onClick={() => navigate("/customer/deliveries")}
                className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
              >
                Full calendar <ChevronRight size={13} />
              </button>
            </div>
            <div className="flex gap-1">
              {WEEK.map(({ label, date, isToday, status }) => (
                <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
                  <p className={`text-[10px] font-medium ${isToday ? "text-blue-600" : "text-slate-400"}`}>
                    {label}
                  </p>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold ${
                      isToday
                        ? "ring-2 ring-blue-600 ring-offset-1 text-blue-600 bg-blue-50"
                        : "text-slate-600"
                    }`}
                  >
                    {date}
                  </div>
                  <span
                    className={`w-2 h-2 rounded-full ${status ? dotColor[status] : "bg-slate-100"}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Outstanding bill */}
          {outstandingBalance > 0 && (
            <button
              onClick={() => navigate("/customer/billing")}
              className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-left active:scale-95 transition-transform"
            >
              <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-amber-800 text-sm">{CURRENT_BILL.month} bill pending</p>
                <p className="text-2xl font-bold text-amber-700 mt-0.5">
                  ₹{outstandingBalance.toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Your DM will collect at your doorstep
                </p>
              </div>
              <ChevronRight size={16} className="text-amber-400 shrink-0 mt-1" />
            </button>
          )}

          {/* Navigation tiles */}
          <div className="grid grid-cols-2 gap-3">
            

            <button
              onClick={() => navigate("/customer/deliveries")}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
            >
              <div className="bg-blue-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <CalendarDays size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Delivery Tracker</p>
                <p className="text-xs text-slate-500 mt-0.5">View daily delivery calendar</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>

            <button
              onClick={() => navigate("/customer/qr")}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
            >
              <div className="bg-violet-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <QrCode size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">My QR Code</p>
                <p className="text-xs text-slate-500 mt-0.5">Show at door for scan</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>

            <button
              onClick={() => navigate("/customer/billing")}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
            >
              <div className="bg-emerald-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <CreditCard size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Bills & Payments</p>
                <p className="text-xs text-slate-500 mt-0.5">Monthly statements</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>

            <button
              onClick={() => navigate("/customer/products")}
              className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4 flex flex-col gap-3 text-left active:scale-95 transition-transform hover:ring-blue-200"
            >
              <div className="bg-amber-50 w-10 h-10 rounded-xl flex items-center justify-center">
                <Package size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">My Products</p>
                <p className="text-xs text-slate-500 mt-0.5">Manage subscriptions</p>
              </div>
              <ChevronRight size={14} className="text-slate-400 self-end" />
            </button>


          </div>

          {/* Subscriptions summary */}
          <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Active Subscriptions
              </p>
              <button
                onClick={() => navigate("/customer/products")}
                className="text-xs text-blue-600 font-medium flex items-center gap-0.5"
              >
                Manage <ChevronRight size={13} />
              </button>
            </div>


            {CUSTOMER.subscriptions.map((sub, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="bg-blue-50 p-2 rounded-xl">
                  <Droplets size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">{sub.productName}</p>
                  <p className="text-xs text-slate-500">
                    {sub.quantity} L/day · ₹{sub.pricePerUnit}/L
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">
                    ₹{(sub.quantity * sub.pricePerUnit * 30).toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-slate-400">/month</p>
                </div>
              </div>
            ))}
          </div>

         
          {CUSTOMER.assignedDm && (
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                Your Delivery Person
              </p>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center shrink-0">
                  <span className="text-white text-sm font-bold">
                    {CUSTOMER.assignedDm.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">
                    {CUSTOMER.assignedDm.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone size={11} />
                    {CUSTOMER.assignedDm.mobile}
                  </p>
                </div>
                <a
                  href={`tel:${CUSTOMER.assignedDm.mobile.replace(/\s/g, "")}`}
                  className="bg-blue-50 text-blue-600 rounded-xl px-3.5 py-2 text-xs font-semibold hover:bg-blue-100 transition-colors"
                >
                  Call
                </a>
              </div>
            </div>
          )}

          

        </div>
      </main>
    </div>
  );
}


