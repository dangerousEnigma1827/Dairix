import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Truck,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  CheckCircle2,
  Circle,
  XCircle,
  AlertCircle,
  Search,
  Loader2,
  RefreshCw,
  Users,
  Milk,
  Package,
  ArrowRight,
  X,
  Info,
  Check,
  Lock,
} from "lucide-react";
import { avatarPalette as avatarColors, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import { getProducts } from "../../api/Services/Owner/ProductServices";
import { getAllCustomers } from "../../api/Services/Owner/CustomerServices";
import { getAllDms } from "../../api/Services/Owner/DmServices";
import {
  createDispatchService,
  getTodayDispatchService,
} from "../../api/Services/Owner/DispatchServices";

// ── Types: dispatch builder (pre-dispatch) ─────────────────────────────────

type Product = {
  _id: string;
  name: string;
  price: number;
  unit: string;
  image?: string;
  quantity: number;
};

type Customer = {
  _id: string;
  name: string;
  mobile: string;
  address: string;
  assignedDm: { _id: string };
  products: Product[];
};

type DM = {
  _id: string;
  name: string;
  mobile: string;
};

// ── Types: dispatch status (post-dispatch, read-only) ─────────────────────
// These mirror the Dispatch / DeliveryEntry mongoose models. The backend
// populates `dm`, `product`, and `customer` refs before sending this down.

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

type DispatchStatus = "idle" | "submitting" | "success" | "error";
type PageMode = "loading" | "builder" | "status";

// Compute default quantity for a DM+product: sum of all customers under that DM for that product
function computeDefaultQty(dmId: string, _id: string, customers: Customer[]): number {
  if (!customers) return 0;
  return customers
    .filter((c) => c.assignedDm._id === dmId)
    .flatMap((c) => c.products)
    .filter((p) => p._id === _id)
    .reduce((sum, p) => sum + p.quantity, 0);
}

const today = new Date().toLocaleDateString("en-IN", {
  weekday: "long", day: "numeric", month: "long", year: "numeric",
});

// ── Shared presentational bits ──────────────────────────────────────────────

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
      done   ? "bg-emerald-500 text-white" :
      active ? "bg-blue-600 text-white"    :
               "bg-slate-200 text-slate-500"
    }`}>
      {done ? <Check size={13} /> : n}
    </div>
  );
}

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

export default function Deliveries() {
  const navigate = useNavigate();

  // Which view we're in: unknown until we've checked whether today's
  // dispatch already exists.
  const [mode, setMode] = useState<PageMode>("loading");

  // ── Builder data (only loaded when no dispatch exists yet) ──────────────
  const [products, setProducts]   = useState<Product[]>([]);
  const [dms, setDms]             = useState<DM[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [builderLoading, setBuilderLoading] = useState({
    products: false, dms: false, customers: false,
  });
  const [step, setStep]                     = useState<1 | 2 | 3>(1);
  const [expandedDm, setExpandedDm]         = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatus>("idle");
  const [dispatches, setDispatches] = useState<Record<string, Record<string, number>>>({});

  // ── Status data (only loaded when today's dispatch already exists) ──────
  const [dispatchDoc, setDispatchDoc]         = useState<DispatchData | null>(null);
  const [deliveryEntries, setDeliveryEntries] = useState<DeliveryEntry[]>([]);
  const [statusLoading, setStatusLoading]     = useState(false);

  // ── Entry point: figure out which mode to render ─────────────────────────
  useEffect(() => {
    checkTodayDispatch();
  }, []);

  const checkTodayDispatch = async () => {
    try {
      const res = await getTodayDispatchService();
      if (res?.dispatch) {
        setDispatchDoc(res.dispatch);
        setDeliveryEntries(res.deliveryEntries ?? []);
        setMode("status");
      } else {
        setMode("builder");
        fetchBuilderData();
      }
    } catch (err) {
      console.error("Error checking today's dispatch:", err);
      // Fail open into the builder rather than stranding the owner on a blank page.
      setMode("builder");
      fetchBuilderData();
    }
  };

  const fetchStatusData = async () => {
    setStatusLoading(true);
    try {
      const res = await getTodayDispatchService();
      setDispatchDoc(res?.dispatch ?? null);
      setDeliveryEntries(res?.deliveryEntries ?? []);
    } catch (err) {
      console.error("Error refreshing dispatch status:", err);
    } finally {
      setStatusLoading(false);
    }
  };

  const fetchBuilderData = async () => {
    setBuilderLoading({ products: true, dms: true, customers: true });
    try {
      const req = await getProducts();
      const getallcustomersreq = await getAllCustomers();
      const getalldmssreq = await getAllDms();
      setProducts(req);
      setDms(getalldmssreq);
      setCustomers(getallcustomersreq);
    } catch (err) {
      console.error("Error fetching dispatch data:", err);
    } finally {
      setBuilderLoading({ products: false, dms: false, customers: false });
    }
  };

  // Build default dispatch quantities from customer subscriptions
  useEffect(() => {
    if (mode !== "builder") return;
    if (!dms.length || !products.length || !customers.length) return;
    const init: Record<string, Record<string, number>> = {};
    dms.forEach((dm) => {
      init[dm._id] = {};
      products.forEach((p) => {
        init[dm._id][p._id] = computeDefaultQty(dm._id, p._id, customers);
      });
    });
    setDispatches(init);
  }, [mode, dms, products, customers]);

  // ── Builder: qty controls ────────────────────────────────────────────────
  const setQty = (dmId: string, _id: string, value: number) => {
    setDispatches((prev) => ({
      ...prev,
      [dmId]: { ...prev[dmId], [_id]: Math.max(0, value) },
    }));
  };

  const adjustQty = (dmId: string, _id: string, delta: number) => {
    const current = dispatches[dmId]?.[_id] ?? 0;
    setQty(dmId, _id, Math.round((current + delta) * 2) / 2);
  };

  // ── Builder: derived totals ──────────────────────────────────────────────
  const totalPerProduct = products.map((p) => ({
    ...p,
    total: dms.reduce((sum, dm) => sum + (dispatches[dm._id]?.[p._id] ?? 0), 0),
  }));

  const totalLitres = totalPerProduct.reduce((s, p) => s + p.total, 0);
  const totalValue  = totalPerProduct.reduce((s, p) => s + p.total * p.price, 0);

  const dmCustomerCount = (dmId: string) => customers.filter((c) => c.assignedDm._id === dmId).length;

  const dmTotal = (dmId: string) =>
    products.reduce((s, p) => s + (dispatches[dmId]?.[p._id] ?? 0), 0);

  const dmValue = (dmId: string) =>
    products.reduce((s, p) => s + (dispatches[dmId]?.[p._id] ?? 0) * p.price, 0);

  const handleDispatch = async () => {
    setDispatchStatus("submitting");
    try {
      const payload = dms.map((dm) => ({
        dmId: dm._id,
        allocations: products
          .filter((p) => (dispatches[dm._id]?.[p._id] ?? 0) > 0)
          .map((p) => ({
            productId: p._id,
            quantity: dispatches[dm._id]?.[p._id] ?? 0,
          })),
      }));
      await createDispatchService(payload);
      setDispatchStatus("success");
      setStep(3);
    } catch {
      setDispatchStatus("error");
    }
  };

  const isBuilderLoading = builderLoading.products || builderLoading.dms || builderLoading.customers;

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.mobile.includes(customerSearch)
  );

  // ── Status: derived data ──────────────────────────────────────────────────
  const statusDms = dispatchDoc?.deliveries ?? [];

  const statusProductTotals = (() => {
    const map = new Map<string, { product: Product; total: number }>();
    statusDms.forEach((block) => {
      block.allocations.forEach((a) => {
        const existing = map.get(a.product._id);
        if (existing) existing.total += a.quantity;
        else map.set(a.product._id, { product: a.product, total: a.quantity });
      });
    });
    return Array.from(map.values());
  })();

  const statusTotalLitres = statusProductTotals.reduce((s, p) => s + p.total, 0);
  const statusTotalValue  = statusProductTotals.reduce((s, p) => s + p.total * p.product.price, 0);

  const statusDmTotalLitres = (dmId: string) =>
    statusDms.find((d) => d.dm._id === dmId)?.allocations.reduce((s, a) => s + a.quantity, 0) ?? 0;

  const statusDmTotalValue = (dmId: string) =>
    statusDms.find((d) => d.dm._id === dmId)?.allocations.reduce((s, a) => s + a.quantity * a.product.price, 0) ?? 0;

  const entriesForDm = (dmId: string) => deliveryEntries.filter((e) => e.dm._id === dmId);

  const deliveredCount = deliveryEntries.filter((e) => e.status === "delivered").length;
  const skippedCount   = deliveryEntries.filter((e) => e.status === "skipped").length;
  const pendingCount   = deliveryEntries.filter((e) => e.status === "pending").length;
  const totalStops     = deliveryEntries.length;
  const progressPct    = totalStops ? Math.round(((deliveredCount + skippedCount) / totalStops) * 100) : 0;

  const [statusSearch, setStatusSearch] = useState("");
  const filteredEntries = deliveryEntries.filter(
    (e) =>
      e.customer.name.toLowerCase().includes(statusSearch.toLowerCase()) ||
      e.customer.mobile.includes(statusSearch)
  );

  // ── Render: initial load (haven't determined mode yet) ───────────────────
  if (mode === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center gap-3">
        <Loader2 size={22} className="text-blue-600 animate-spin" />
        <span className="text-slate-500 text-sm">Checking today's dispatch…</span>
      </div>
    );
  }

  // ── Render: STATUS MODE (a dispatch already exists for today) ────────────
  if (mode === "status") {
    return (
      <div className="min-h-screen bg-slate-50">
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
            <button
              onClick={fetchStatusData}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} className={statusLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {!dispatchDoc ? (
          <div className="flex items-center justify-center h-64 gap-3">
            <Loader2 size={22} className="text-blue-600 animate-spin" />
            <span className="text-slate-500 text-sm">Loading dispatch status…</span>
          </div>
        ) : (
          <div className="max-w-screen-xl mx-auto px-6 py-5">
            <div className="grid grid-cols-12 gap-5">

              {/* ── LEFT COLUMN ── */}
              <div className="col-span-3 space-y-4">
                <div className="bg-blue-600 rounded-xl p-4 text-white">
                  <p className="text-blue-200 text-xs font-medium mb-1">Dispatched for</p>
                  <p className="text-base font-bold leading-tight">
                    {new Date(dispatchDoc.date).toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                  </p>
                  <p className="text-blue-200 text-xs mt-2">
                    {statusDms.length} DMs · {totalStops} customers
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Delivery Progress
                  </p>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
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

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Dispatched Totals
                  </p>
                  {statusProductTotals.map(({ product, total }) => (
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
                      <span className="text-sm font-bold text-slate-900">{statusTotalLitres.toFixed(1)} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-500">Total value</span>
                      <span className="text-sm font-bold text-blue-600">₹{statusTotalValue.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    This dispatch is locked for the day. Allocations can no longer be edited — only delivery
                    status updates from the DM app will be reflected here.
                  </p>
                </div>
              </div>

              {/* ── CENTRE COLUMN ── */}
              <div className="col-span-6 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users size={15} className="text-slate-400" />
                    Delivery Man Status
                  </h2>
                  <span className="text-xs text-slate-400">{statusDms.length} delivery men</span>
                </div>

                {statusDms.map((block, dmIdx) => {
                  const isExpanded  = expandedDm === block.dm._id;
                  const dmEntries   = entriesForDm(block.dm._id);
                  const dmDelivered = dmEntries.filter((e) => e.status === "delivered").length;

                  return (
                    <div
                      key={block.dm._id}
                      className={`bg-white rounded-xl border transition-all ${
                        isExpanded ? "border-blue-200 shadow-sm" : "border-slate-200"
                      }`}
                    >
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
                            <p className="text-sm font-bold text-slate-900">{statusDmTotalLitres(block.dm._id).toFixed(1)} L</p>
                            <p className="text-[10px] text-slate-400">total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-blue-600">₹{statusDmTotalValue(block.dm._id).toLocaleString("en-IN")}</p>
                            <p className="text-[10px] text-slate-400">value</p>
                          </div>
                        </div>
                        {isExpanded
                          ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                          : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        }
                      </button>

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

              {/* ── RIGHT COLUMN ── */}
              <div className="col-span-3 space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Per DM Overview
                  </p>
                  {statusDms.map((block, i) => {
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
                          <p className="text-xs font-bold text-slate-900">{statusDmTotalLitres(block.dm._id).toFixed(1)}L</p>
                          <DmStatusPill status={block.status} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Package size={12} />
                    Customer Lookup
                  </p>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 mb-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                      value={statusSearch}
                      onChange={(e) => setStatusSearch(e.target.value)}
                      placeholder="Search customer…"
                      className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                    />
                    {statusSearch && (
                      <button onClick={() => setStatusSearch("")}>
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

  // ── Render: BUILDER MODE (no dispatch exists for today yet) ──────────────
  return (
    <div className="min-h-screen bg-slate-50">

      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Truck size={18} className="text-blue-600" />
              <h1 className="text-lg font-bold text-slate-900">Morning Dispatch</h1>
            </div>
            <p className="text-sm text-slate-500">{today}</p>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {[
              { n: 1, label: "Review Allocations" },
              { n: 2, label: "Confirm & Dispatch" },
              { n: 3, label: "Done" },
            ].map(({ n, label }, i) => (
              <div key={n} className="flex items-center gap-2">
                {i > 0 && <div className={`w-10 h-px ${step > i ? "bg-emerald-400" : "bg-slate-200"}`} />}
                <div className="flex items-center gap-1.5">
                  <StepBadge n={n} active={step === n} done={step > n} />
                  <span className={`text-xs font-medium ${step === n ? "text-blue-600" : step > n ? "text-emerald-600" : "text-slate-400"}`}>
                    {label}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={checkTodayDispatch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={isBuilderLoading || totalLitres === 0}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
              >
                Review Dispatch
                <ArrowRight size={15} />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleDispatch}
                disabled={dispatchStatus === "submitting"}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              >
                {dispatchStatus === "submitting" ? (
                  <><Loader2 size={14} className="animate-spin" />Dispatching…</>
                ) : (
                  <><Truck size={14} />Confirm Dispatch</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {isBuilderLoading ? (
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 size={22} className="text-blue-600 animate-spin" />
          <span className="text-slate-500 text-sm">Loading dispatch data…</span>
        </div>
      ) : (

        <div className="max-w-screen-xl mx-auto px-6 py-5">

          {/* ── Step 3: Success ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="bg-emerald-100 rounded-full p-5">
                <CheckCircle2 size={44} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Dispatch sent!</h2>
              <p className="text-slate-500 text-sm">
                {dms.length} delivery men · {totalLitres.toFixed(1)}L · ₹{totalValue.toLocaleString("en-IN")}
              </p>
              <div className="flex gap-3 mt-2">
                <button
                  onClick={checkTodayDispatch}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  View Dispatch Status
                </button>
                <button
                  onClick={() => navigate("/owner")}
                  className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Steps 1 & 2: 3-column layout ── */}
          {step < 3 && (
            <div className="grid grid-cols-12 gap-5">

              {/* ── LEFT COLUMN: Summary cards ── */}
              <div className="col-span-3 space-y-4">

                <div className="bg-blue-600 rounded-xl p-4 text-white">
                  <p className="text-blue-200 text-xs font-medium mb-1">Dispatching for</p>
                  <p className="text-base font-bold leading-tight">
                    {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                  </p>
                  <p className="text-blue-200 text-xs mt-2">
                    {dms.length} DMs · {customers.length} customers
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Today's Totals
                  </p>
                  {totalPerProduct.map((p) => (
                    <div key={p._id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-sm text-slate-700">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-slate-900">{p.total.toFixed(1)} L</span>
                        <span className="text-xs text-slate-400 ml-1">· ₹{(p.total * p.price).toLocaleString("en-IN")}</span>
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

                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                    Products
                  </p>
                  {products.map((p) => (
                    <div key={p._id} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-50 p-1.5 rounded-lg">
                          <Milk size={13} className="text-blue-600" />
                        </div>
                        <span className="text-sm text-slate-700">{p.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">₹{p.price}/{p.unit}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-relaxed">
                    Quantities are pre-filled from customer subscriptions. Adjust if today's load differs.
                  </p>
                </div>
              </div>

              {/* ── CENTRE COLUMN: DM dispatch builder ── */}
              <div className="col-span-6 space-y-3">

                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Users size={15} className="text-slate-400" />
                    Delivery Man Allocations
                  </h2>
                  <span className="text-xs text-slate-400">{dms.length} delivery men</span>
                </div>

                {dms.map((dm, dmIdx) => {
                  const isExpanded  = expandedDm === dm._id;
                  const custCount   = dmCustomerCount(dm._id);
                  const dmTotalLtr  = dmTotal(dm._id);
                  const dmTotalVal  = dmValue(dm._id);
                  const dmCustomers = customers.filter((c) => c.assignedDm._id === dm._id);

                  return (
                    <div
                      key={dm._id}
                      className={`bg-white rounded-xl border transition-all ${
                        isExpanded ? "border-blue-200 shadow-sm" : "border-slate-200"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedDm(isExpanded ? null : dm._id)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                      >
                        <div className={`${avatarColors[dmIdx % avatarColors.length]} rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0`}>
                          {getInitials(dm.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{dm.name}</p>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {dm.mobile} · {custCount} customers
                          </p>
                        </div>

                        <div className="hidden sm:flex items-center gap-3 mr-2">
                          <div className="text-center">
                            <p className="text-sm font-bold text-slate-900">{dmTotalLtr.toFixed(1)} L</p>
                            <p className="text-[10px] text-slate-400">total</p>
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-bold text-blue-600">₹{dmTotalVal.toLocaleString("en-IN")}</p>
                            <p className="text-[10px] text-slate-400">value</p>
                          </div>
                        </div>

                        {isExpanded
                          ? <ChevronUp size={16} className="text-slate-400 shrink-0" />
                          : <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        }
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100">

                          <div className="px-4 py-3 bg-slate-50 space-y-3">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                              Product Quantities for Today
                            </p>
                            {products.map((product) => {
                              const qty     = dispatches[dm._id]?.[product._id] ?? 0;
                              const defQty  = computeDefaultQty(dm._id, product._id, customers);
                              const changed = qty !== defQty;

                              return (
                                <div key={product._id} className="flex items-center gap-3">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="bg-white border border-slate-200 p-1.5 rounded-lg shrink-0">
                                      <Milk size={13} className="text-blue-600" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-800 truncate">
                                        {product.name}
                                      </p>
                                      <p className="text-[10px] text-slate-400">
                                        Default: {defQty}L
                                        {changed && (
                                          <span className="text-amber-500 ml-1 font-semibold">
                                            (modified)
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      onClick={() => adjustQty(dm._id, product._id, -0.5)}
                                      disabled={qty <= 0}
                                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition-colors"
                                    >
                                      <Minus size={12} />
                                    </button>
                                    <input
                                      type="number"
                                      value={qty}
                                      step={0.5}
                                      min={0}
                                      onChange={(e) => setQty(dm._id, product._id, parseFloat(e.target.value) || 0)}
                                      className="w-16 text-center text-sm font-bold text-slate-900 border border-slate-200 rounded-lg py-1 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 bg-white"
                                    />
                                    <button
                                      onClick={() => adjustQty(dm._id, product._id, 0.5)}
                                      className="w-7 h-7 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
                                    >
                                      <Plus size={12} />
                                    </button>
                                    <span className="text-xs text-slate-400 w-4">L</span>
                                    <span className="text-xs text-slate-500 w-20 text-right">
                                      ₹{(qty * product.price).toLocaleString("en-IN")}
                                    </span>
                                    {changed && (
                                      <button
                                        onClick={() => setQty(dm._id, product._id, defQty)}
                                        className="text-[10px] text-amber-600 hover:text-amber-700 underline ml-1"
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <div className="px-4 py-3 border-t border-slate-100">
                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                              Customers ({custCount})
                            </p>
                            <div className="space-y-1.5">
                              {dmCustomers.map((c) => {
                                const productNames = c.products
                                  .map((cp) => {
                                    const p = products.find((p) => p._id === cp._id);
                                    return p ? `${cp.quantity}L ${p.name}` : "";
                                  })
                                  .filter(Boolean)
                                  .join(", ");

                                return (
                                  <div key={c._id} className="flex items-center gap-2 py-1.5 border-b border-slate-50 last:border-0">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[9px] font-bold shrink-0">
                                      {getInitials(c.name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                                    </div>
                                    <span className="text-[10px] text-slate-500 shrink-0">{productNames}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ── RIGHT COLUMN: Review panel ── */}
              <div className="col-span-3 space-y-4">

                {step === 2 ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Dispatch Summary
                    </p>

                    {dms.map((dm, i) => (
                      <div key={dm._id} className="pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`${avatarColors[i % avatarColors.length]} rounded-full w-6 h-6 flex items-center justify-center text-[9px] font-bold`}>
                            {getInitials(dm.name)}
                          </div>
                          <p className="text-xs font-semibold text-slate-800">{dm.name}</p>
                        </div>
                        {products.map((p) => {
                          const qty = dispatches[dm._id]?.[p._id] ?? 0;
                          if (qty === 0) return null;
                          return (
                            <div key={p._id} className="flex justify-between text-xs text-slate-600 pl-8 py-0.5">
                              <span>{p.name}</span>
                              <span className="font-semibold">{qty}L</span>
                            </div>
                          );
                        })}
                        <div className="flex justify-between text-xs pl-8 pt-1 border-t border-slate-50 mt-1">
                          <span className="text-slate-400">Subtotal</span>
                          <span className="font-bold text-slate-800">₹{dmValue(dm._id).toLocaleString("en-IN")}</span>
                        </div>
                      </div>
                    ))}

                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 font-medium">Total</span>
                        <span className="font-bold text-blue-700">₹{totalValue.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-400">Volume</span>
                        <span className="font-semibold text-slate-600">{totalLitres.toFixed(1)} L</span>
                      </div>
                    </div>

                    {dispatchStatus === "error" && (
                      <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="text-rose-500 shrink-0" />
                        <p className="text-xs text-rose-600">Dispatch failed. Try again.</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 py-2.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={handleDispatch}
                        disabled={dispatchStatus === "submitting"}
                        className="flex-[2] py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1.5"
                      >
                        {dispatchStatus === "submitting"
                          ? <><Loader2 size={12} className="animate-spin" />Dispatching…</>
                          : <><Truck size={12} />Confirm</>
                        }
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      Per DM Preview
                    </p>
                    {dms.map((dm, i) => (
                      <button
                        key={dm._id}
                        onClick={() => setExpandedDm(expandedDm === dm._id ? null : dm._id)}
                        className="w-full flex items-center gap-2 py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                      >
                        <div className={`${avatarColors[i % avatarColors.length]} rounded-full w-6 h-6 flex items-center justify-center text-[9px] font-bold shrink-0`}>
                          {getInitials(dm.name)}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-xs font-semibold text-slate-800">{dm.name}</p>
                          <p className="text-[10px] text-slate-400">{dmCustomerCount(dm._id)} customers</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900">{dmTotal(dm._id).toFixed(1)}L</p>
                          <p className="text-[10px] text-slate-400">₹{dmValue(dm._id).toLocaleString("en-IN")}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <Package size={12} />
                    Customer Lookup
                  </p>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-2 mb-2 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <Search size={13} className="text-slate-400 shrink-0" />
                    <input
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer…"
                      className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-400 bg-transparent"
                    />
                    {customerSearch && (
                      <button onClick={() => setCustomerSearch("")}>
                        <X size={12} className="text-slate-400 hover:text-slate-600" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 max-h-52 overflow-y-auto">
                    {filteredCustomers.map((c) => {
                      const dm = dms.find((d) => d._id === c.assignedDm._id);
                      const prodStr  = c.products
                        .map((cp) => {
                          const p = products.find((p) => p._id === cp._id);
                          return p ? `${cp.quantity}L ${p.name}` : "";
                        })
                        .join(", ");

                      return (
                        <div key={c._id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                          <div className="bg-slate-100 text-slate-600 rounded-full w-5 h-5 flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5">
                            {getInitials(c.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">{c.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{prodStr}</p>
                            {dm && (
                              <p className="text-[10px] text-blue-500">→ {dm.name}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {filteredCustomers.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">No customers found</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}