import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ChevronLeft,
  Phone,
  Users,
  Truck,
  Milk,
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  Search,
  Loader2,
  AlertCircle,
  UserX,
  X,
} from "lucide-react";

// utils
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";

// components — reused as-is from the Customers page for visual consistency
import CustomerCard from "../../components/Owner/Customers/CustomerCard";
import type { Customer } from "../../components/Owner/Customers/CustomerCard";

// services — all already exist in your codebase
import { getAllDms } from "../../api/Services/Owner/DmServices";
import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import { getTodayDispatchService } from "../../api/Services/Owner/DispatchServices";

// ── Types ────────────────────────────────────────────────────────────────

type DM = {
  _id: string;
  name: string;
  mobile: string;
};

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
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
  dm: { _id: string };
  products: { product: Product; quantity: number }[];
  status: "pending" | "delivered" | "skipped";
  deliveredAt?: string;
};

type DispatchData = {
  _id: string;
  date: string;
  deliveries: DMDeliveryBlock[];
};

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

// ── Small presentational bits ───────────────────────────────────────────────

function EntryStatusPill({ status }: { status: DeliveryEntry["status"] }) {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
        <CheckCircle2 size={11} /> Delivered
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
        <XCircle size={11} /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
      <Circle size={11} /> Pending
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tint: "blue" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<typeof tint, { bg: string; text: string; blur: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", blur: "bg-blue-50" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-500", blur: "bg-emerald-50" },
    amber: { bg: "bg-amber-50", text: "text-amber-500", blur: "bg-amber-50" },
    rose: { bg: "bg-rose-50", text: "text-rose-500", blur: "bg-rose-50" },
  };
  const t = tints[tint];
  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${t.blur} blur-2xl transition-opacity group-hover:opacity-80`} />
      <div className="relative flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${t.bg} ${t.text}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────

function DmDetails() {
  const {dmId} = useParams<{ dmId: string }>();
  const navigate = useNavigate();

  const [dm, setDm] = useState<DM | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dispatchDoc, setDispatchDoc] = useState<DispatchData | null>(null);
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const [dmRes, custRes, dispatchRes] = await Promise.all([
        getAllDms(),
        getAllCustomers(),
        getTodayDispatchService(),
      ]);

      const matchedDm = dmRes.find((d: DM) => d._id === dmId) ?? null;
      
      if (!matchedDm) {
        setNotFound(true);
        return;
      }

      setDm(matchedDm);
      setCustomers(custRes);
      setDispatchDoc(dispatchRes?.dispatch ?? null);
      setDeliveryEntries(dispatchRes?.deliveryEntries ?? []);
    } catch (err) {
      console.error("Error fetching DM details:", err);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dmId]);

  const assignedCustomers = useMemo(
    () => customers.filter((c) => c.assignedDm && c.assignedDm._id === dmId),
    [customers, dmId]
  );

  const filteredCustomers = assignedCustomers.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.mobile.includes(search)
  );

  const dmBlock = dispatchDoc?.deliveries.find((block) => block.dm._id === dmId) ?? null;
  const dmEntries = deliveryEntries.filter((e) => e.dm._id === dmId);

  const deliveredToday = dmEntries.filter((e) => e.status === "delivered").length;
  const skippedToday = dmEntries.filter((e) => e.status === "skipped").length;
  const pendingToday = dmEntries.filter((e) => e.status === "pending").length;
  const totalStops = dmEntries.length;
  const progressPct = totalStops
    ? Math.round(((deliveredToday + skippedToday) / totalStops) * 100)
    : 0;

  const volumeToday = dmBlock?.allocations.reduce((s, a) => s + a.quantity, 0) ?? 0;
  const valueToday = dmBlock?.allocations.reduce((s, a) => s + a.quantity * a.product.price, 0) ?? 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-sm shadow-blue-200">
          <Truck size={26} className="text-white" />
        </div>
        <Loader2 size={22} className="text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading delivery staff details…</p>
      </div>
    );
  }

  if (notFound || !dm) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 md:p-8">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => navigate("/owner/delivery-staff")}
            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
          >
            <ChevronLeft size={16} />
            Back to delivery staff
          </button>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50">
              <UserX size={24} className="text-rose-500" />
            </div>
            <p className="font-semibold text-slate-800 mt-1">Delivery man not found</p>
            <p className="text-sm text-slate-500">
              This profile may have been removed. Head back to the staff list to try again.
            </p>
            <button
              onClick={() => navigate("/owner/delivery-staff")}
              className="mt-3 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
            >
              Back to staff list
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── Back link ── */}
        <button
          onClick={() => navigate("/owner/delivery-staff")}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-700"
        >
          <ChevronLeft size={16} />
          Back to delivery staff
        </button>

        {/* ── Profile header ── */}
        <div className="flex flex-col gap-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-xl font-bold ring-4 ring-blue-50 ${avatarPalette[0]}`}
            >
              {getInitials(dm.name)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{dm.name}</h1>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-500">
                <Phone size={13} />
                {dm.mobile}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  <Users size={11} />
                  {assignedCustomers.length} customers assigned
                </span>
                {dmBlock ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      dmBlock.status === "completed"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-500"
                        : "border-amber-200 bg-amber-50 text-amber-500"
                    }`}
                  >
                    <Truck size={11} />
                    {dmBlock.status === "completed" ? "Round complete" : "Out for delivery"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500">
                    <Clock size={11} />
                    No dispatch today
                  </span>
                )}
              </div>
            </div>
          </div>

          <a
            href={`tel:${dm.mobile}`}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition-all hover:bg-blue-700 hover:shadow-md active:scale-[0.98]"
          >
            <Phone size={16} />
            Call {dm.name.split(" ")[0]}
          </a>
        </div>

        {/* ── Stats ── */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Users} label="Assigned customers" value={String(assignedCustomers.length)} tint="blue" />
          <StatCard icon={Truck} label="Today's stops" value={String(totalStops)} tint="emerald" />
          <StatCard icon={Milk} label="Today's volume" value={`${volumeToday.toFixed(1)} L`} tint="amber" />
          <StatCard icon={IndianRupee} label="Today's value" value={`₹${valueToday.toLocaleString("en-IN")}`} tint="rose" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {/* ── LEFT: today's dispatch (span 2) ── */}
          <div className="space-y-6 xl:col-span-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Truck size={15} className="text-slate-400" />
                  Today's Dispatch — {today}
                </h3>
              </div>

              {!dmBlock ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                    <AlertCircle size={20} className="text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">
                    No stock has been dispatched to {dm.name.split(" ")[0]} today
                  </p>
                  <button
                    onClick={() => navigate("/owner/deliveries")}
                    className="mt-1 text-xs font-semibold text-blue-600 underline underline-offset-2"
                  >
                    Go to dispatch
                  </button>
                </div>
              ) : (
                <>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {progressPct}% of {totalStops} stops closed out
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5">
                      <CheckCircle2 size={16} className="shrink-0 text-emerald-500" />
                      <div>
                        <p className="text-sm font-bold leading-none text-emerald-700">{deliveredToday}</p>
                        <p className="mt-0.5 text-[10px] text-emerald-600">Delivered</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5">
                      <Clock size={16} className="shrink-0 text-amber-500" />
                      <div>
                        <p className="text-sm font-bold leading-none text-amber-700">{pendingToday}</p>
                        <p className="mt-0.5 text-[10px] text-amber-600">Pending</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5">
                      <XCircle size={16} className="shrink-0 text-rose-500" />
                      <div>
                        <p className="text-sm font-bold leading-none text-rose-700">{skippedToday}</p>
                        <p className="mt-0.5 text-[10px] text-rose-600">Skipped</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-1 border-t border-slate-100 pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Allocated quantities
                    </p>
                    {dmBlock.allocations.map((a) => (
                      <div
                        key={a.product._id}
                        className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg border border-slate-200 bg-white p-1.5">
                            <Milk size={13} className="text-blue-600" />
                          </div>
                          <span className="text-sm font-medium text-slate-800">{a.product.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-900">
                            {a.quantity} {a.product.unit}
                          </span>
                          <span className="ml-2 text-xs text-slate-500">
                            ₹{(a.quantity * a.product.price).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* ── Today's stops list ── */}
            {dmEntries.length > 0 && (
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Users size={15} className="text-slate-400" />
                  Delivery Stops ({dmEntries.length})
                </h3>
                <div className="space-y-1">
                  {dmEntries.map((entry, idx) => {
                    const productNames = entry.products
                      .map((p) => `${p.quantity}${p.product.unit} ${p.product.name}`)
                      .join(", ");
                    return (
                      <div
                        key={entry._id}
                        className="flex items-center gap-3 rounded-lg border-b border-slate-50 px-1 py-2.5 transition-colors last:border-0 hover:bg-slate-50"
                      >
                        <div
                          className={`${avatarPalette[idx % avatarPalette.length]} flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold`}
                        >
                          {getInitials(entry.customer.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-800">
                            {entry.customer.name}
                          </p>
                          <p className="truncate text-xs text-slate-400">{productNames}</p>
                        </div>
                        <EntryStatusPill status={entry.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: assigned customers ── */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Users size={15} className="text-slate-400" />
                Assigned Customers ({assignedCustomers.length})
              </h3>

              <div className="relative mb-3">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers…"
                  className="w-full rounded-xl bg-white py-2.5 pl-9 pr-8 text-xs text-slate-800 placeholder:text-slate-400 shadow-sm ring-1 ring-slate-100 outline-none transition-shadow focus:ring-2 focus:ring-blue-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {assignedCustomers.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  No customers assigned to this delivery man yet.
                </p>
              ) : filteredCustomers.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">No matches for that search.</p>
              ) : (
                <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
                  {filteredCustomers.map((c, idx) => (
                    <CustomerCard key={c._id} customer={c} idx={idx} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DmDetails;