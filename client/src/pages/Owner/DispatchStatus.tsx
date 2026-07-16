
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  XCircle,
  Search,
  Loader2,
  RefreshCw,
  Users,
  Milk,
  Package,
  X,
  Info,
  Lock,
} from "lucide-react";
import { avatarPalette as avatarColors, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import { getTodayDispatchService } from "../../api/Services/Owner/DispatchServices";

// ── Types ──────────────────────────────────────────────────────────────────
// These mirror the Dispatch / DeliveryEntry mongoose models. The backend is
// expected to populate `dm`, `product` and `customer` refs before sending
// this payload down.

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
};

type DM = {
  _id: string;
  name: string;
  mobile: string;
};

type Customer = {
  _id: string;
  name: string;
  mobile: string;
  address: string;
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

type DeliveryEntryProduct = {
  product: Product;
  quantity: number;
};

type DeliveryEntry = {
  _id: string;
  customer: Customer;
  dm: DM;
  products: DeliveryEntryProduct[];
  status: "pending" | "delivered" | "skipped";
  deliveredAt?: string;
};

type DispatchData = {
  _id: string;
  date: string;
  deliveries: DMDeliveryBlock[];
  status: "created" | "completed";
};

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ── Small presentational helpers ────────────────────────────────────────────

function DmStatusPill({ status }: { status: DMDeliveryBlock["status"] }) {
  const done = status === "completed";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
      done ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
           : "bg-blue-50 text-blue-600 border border-blue-200"
    }`}>
      {done ? <CheckCircle2 size={11} /> : <Truck size={11} />}
      {done ? "Round complete" : "Out for delivery"}
    </span>
  );
}

function EntryStatusPill({ status }: { status: DeliveryEntry["status"] }) {
  if (status === "delivered") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
        <CheckCircle2 size={11} /> Delivered
      </span>
    );
  }
  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200">
        <XCircle size={11} /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
      <Circle size={11} /> Pending
    </span>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function DispatchStatus() {
  const navigate = useNavigate();

  const [loading, setLoading]                 = useState(true);
  const [dispatch, setDispatch]                = useState<DispatchData | null>(null);
  const [deliveryEntries, setDeliveryEntries]  = useState<DeliveryEntry[]>([]);
  const [expandedDm, setExpandedDm]            = useState<string | null>(null);
  const [search, setSearch]                    = useState("");

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
      setLoading(true);

      try {
          const res = await getTodayDispatchService();

          if(res.exists){
              setDispatch(res.dispatch);
              setDeliveryEntries(res.deliveryEntries ?? []);
          }
          else{
              setDispatch(null);
              setDeliveryEntries([]);
          }

      } catch (err) {
          console.error("Error fetching today's dispatch:", err);
      } finally {
          setLoading(false);
      }
  };

  const dms = dispatch?.deliveries ?? [];

  // ── Derived totals ────────────────────────────────────────────────────────
  const productTotals = (() => {
    const map = new Map<string, { product: Product; total: number }>();
    dms.forEach((block) => {
      block.allocations.forEach((a) => {
        const existing = map.get(a.product._id);
        if (existing) existing.total += a.quantity;
        else map.set(a.product._id, { product: a.product, total: a.quantity });
      });
    });
    return Array.from(map.values());
  })();

  const totalLitres = productTotals.reduce((s, p) => s + p.total, 0);
  const totalValue  = productTotals.reduce((s, p) => s + p.total * p.product.price, 0);

  const dmTotalLitres = (dmId: string) =>
    dms.find((d) => d.dm._id === dmId)?.allocations.reduce((s, a) => s + a.quantity, 0) ?? 0;

  const dmTotalValue = (dmId: string) =>
    dms.find((d) => d.dm._id === dmId)?.allocations.reduce((s, a) => s + a.quantity * a.product.price, 0) ?? 0;

  const entriesForDm = (dmId: string) => deliveryEntries.filter((e) => e.dm._id === dmId);

  const deliveredCount = deliveryEntries.filter((e) => e.status === "delivered").length;
  const skippedCount   = deliveryEntries.filter((e) => e.status === "skipped").length;
  const pendingCount   = deliveryEntries.filter((e) => e.status === "pending").length;
  const totalStops     = deliveryEntries.length;
  const progressPct    = totalStops ? Math.round(((deliveredCount + skippedCount) / totalStops) * 100) : 0;

  const filteredEntries = deliveryEntries.filter(
    (e) =>
      e.customer.name.toLowerCase().includes(search.toLowerCase()) ||
      e.customer.mobile.includes(search)
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Truck size={18} className="text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Today's Dispatch</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                <Lock size={10} /> Locked
              </span>
            </div>
            <p className="text-sm text-slate-500">{today}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchStatus}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <button
              onClick={() => navigate("/owner")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 size={22} className="text-blue-600 animate-spin" />
          <span className="text-slate-500 text-sm">Loading today's dispatch…</span>
        </div>
      ) : !dispatch ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <div className="bg-slate-100 rounded-full p-5">
            <Truck size={36} className="text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">No dispatch has been created for today yet.</p>
          <button
            onClick={() => navigate("/owner/deliveries")}
            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Go to Morning Dispatch
          </button>
        </div>
      ) : (
        <div className="max-w-screen-xl mx-auto px-6 py-5">
          <div className="grid grid-cols-12 gap-5">

            {/* ── LEFT COLUMN: Summary cards ── */}
            <div className="col-span-3 space-y-4">

              <div className="bg-blue-600 rounded-xl p-4 text-white">
                <p className="text-blue-200 text-xs font-medium mb-1">Dispatched for</p>
                <p className="text-base font-bold leading-tight">
                  {new Date(dispatch.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                </p>
                <p className="text-blue-200 text-xs mt-2">
                  {dms.length} DMs · {totalStops} customers
                </p>
              </div>

              {/* Delivery progress */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Delivery Progress
                </p>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">{progressPct}% of stops closed out</p>

                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div className="text-center">
                    <p className="text-sm font-bold text-emerald-600">{deliveredCount}</p>
                    <p className="text-[10px] text-slate-400">Delivered</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-amber-500">{pendingCount}</p>
                    <p className="text-[10px] text-slate-400">Pending</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-rose-500">{skippedCount}</p>
                    <p className="text-[10px] text-slate-400">Skipped</p>
                  </div>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Dispatched Totals
                </p>
                {productTotals.map(({ product, total }) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-sm text-slate-700">{product.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-slate-900">{total.toFixed(1)} L</span>
                      <span className="text-xs text-slate-400 ml-1">· ₹{(total * product.price).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-slate-100 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total volume</span>
                    <span className="text-sm font-bold text-slate-900">{totalLitres.toFixed(1)} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-500">Total value</span>
                    <span className="text-sm font-bold text-blue-600">₹{totalValue.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  This dispatch is locked for the day. Allocations can no longer be edited — only delivery
                  status updates from the DM app will be reflected here.
                </p>
              </div>
            </div>

            {/* ── CENTRE COLUMN: DM status list ── */}
            <div className="col-span-6 space-y-3">

              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users size={15} className="text-slate-400" />
                  Delivery Man Status
                </h2>
                <span className="text-xs text-slate-400">{dms.length} delivery men</span>
              </div>

              {dms.map((block, dmIdx) => {
                const isExpanded   = expandedDm === block.dm._id;
                const dmEntries    = entriesForDm(block.dm._id);
                const dmDelivered  = dmEntries.filter((e) => e.status === "delivered").length;

                return (
                  <div
                    key={block.dm._id}
                    className={`bg-white rounded-xl border transition-all ${
                      isExpanded ? "border-blue-200 shadow-sm" : "border-slate-200"
                    }`}
                  >
                    {/* DM header row */}
                    <button
                      onClick={() => setExpandedDm(isExpanded ? null : block.dm._id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                    >
                      <div className={`${avatarColors[dmIdx % avatarColors.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}>
                        {getInitials(block.dm.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{block.dm.name}</p>
                          <DmStatusPill status={block.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {block.dm.mobile} · {dmEntries.length} stops · {dmDelivered} delivered
                        </p>
                      </div>

                      <div className="hidden sm:flex items-center gap-3 mr-2">
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-900">{dmTotalLitres(block.dm._id).toFixed(1)} L</p>
                          <p className="text-[10px] text-slate-400">total</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-blue-600">₹{dmTotalValue(block.dm._id).toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-slate-400">value</p>
                        </div>
                      </div>

                      {isExpanded
                        ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                        : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                      }
                    </button>

                    {/* Expanded: allocations + customer delivery entries (read-only) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100">

                        <div className="px-4 py-3 bg-slate-50 space-y-2">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                            Allocated Quantities
                          </p>
                          {block.allocations.map((a) => (
                            <div key={a.product._id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="bg-white border border-slate-200 p-1.5 rounded-lg shrink-0">
                                  <Milk size={13} className="text-blue-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-800">{a.product.name}</span>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-slate-900">{a.quantity} L</span>
                                <span className="text-xs text-slate-500 ml-2">₹{(a.quantity * a.product.price).toLocaleString("en-IN")}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-3 border-t border-slate-100">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Customers ({dmEntries.length})
                          </p>
                          <div className="space-y-1.5">
                            {dmEntries.map((entry) => {
                              const productNames = entry.products
                                .map((p) => `${p.quantity}L ${p.product.name}`)
                                .join(", ");

                              return (
                                <div key={entry._id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                                    {getInitials(entry.customer.name)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-slate-800 truncate">{entry.customer.name}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{productNames}</p>
                                  </div>
                                  <EntryStatusPill status={entry.status} />
                                </div>
                              );
                            })}
                            {dmEntries.length === 0 && (
                              <p className="text-xs text-slate-400 text-center py-2">No customer stops recorded.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT COLUMN: Overview + customer lookup ── */}
            <div className="col-span-3 space-y-4">

              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Per DM Overview
                </p>
                {dms.map((block, i) => {
                  const dmEntries   = entriesForDm(block.dm._id);
                  const dmDelivered = dmEntries.filter((e) => e.status === "delivered").length;

                  return (
                    <button
                      key={block.dm._id}
                      onClick={() => setExpandedDm(expandedDm === block.dm._id ? null : block.dm._id)}
                      className="w-full flex items-center gap-2 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                    >
                      <div className={`${avatarColors[i % avatarColors.length]} rounded-full w-6 h-6 flex items-center justify-center text-[9px] font-bold shrink-0`}>
                        {getInitials(block.dm.name)}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-semibold text-slate-800">{block.dm.name}</p>
                        <p className="text-[10px] text-slate-400">{dmDelivered}/{dmEntries.length} delivered</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-900">{dmTotalLitres(block.dm._id).toFixed(1)}L</p>
                        <DmStatusPill status={block.status} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Customer lookup */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Package size={12} />
                  Customer Lookup
                </p>
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 mb-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customer…"
                    className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                  />
                  {search && (
                    <button onClick={() => setSearch("")}>
                      <X size={12} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  )}
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {filteredEntries.map((entry) => {
                    const productNames = entry.products
                      .map((p) => `${p.quantity}L ${p.product.name}`)
                      .join(", ");

                    return (
                      <div key={entry._id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                        <div className="bg-slate-100 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">
                          {getInitials(entry.customer.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-800 truncate">{entry.customer.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{productNames}</p>
                          <p className="text-[10px] text-blue-500">→ {entry.dm.name}</p>
                        </div>
                        <EntryStatusPill status={entry.status} />
                      </div>
                    );
                  })}
                  {filteredEntries.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-3">No customers found</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}