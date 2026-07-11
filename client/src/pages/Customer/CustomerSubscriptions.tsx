import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Droplets,
  Plus,
  Minus,
  Trash2,
  Check,
  Info,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id: string;
  name: string;
  pricePerUnit: number;
  unit: "L";
  icon: string;
  description: string;
};

type Subscription = {
  id: string;
  productId: string;
  quantity: number; // litres per day
};

// ── Mock data — replace with API ─────────────────────────────────────────────

const ALL_PRODUCTS: Product[] = [
  {
    id: "prod_001",
    name: "Cow Milk",
    pricePerUnit: 60,
    unit: "L",
    icon: "🐄",
    description: "Fresh cow milk, delivered daily",
  },
  {
    id: "prod_002",
    name: "Buffalo Milk",
    pricePerUnit: 75,
    unit: "L",
    icon: "🐃",
    description: "Rich & creamy buffalo milk",
  },
  {
    id: "prod_003",
    name: "Organic Milk",
    pricePerUnit: 90,
    unit: "L",
    icon: "🌿",
    description: "Certified organic, no additives",
  },
];

const INITIAL_SUBS: Subscription[] = [
  { id: "sub_001", productId: "prod_001", quantity: 2 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const QTY_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

function monthlyEst(qty: number, price: number) {
  return qty * price * 30;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function QtyControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const idx = QTY_STEPS.indexOf(value);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => idx > 0 && onChange(QTY_STEPS[idx - 1])}
        disabled={idx <= 0}
        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus size={14} />
      </button>
      <div className="min-w-[56px] text-center">
        <span className="text-base font-bold text-slate-900">{value}</span>
        <span className="text-xs text-slate-500 ml-1">L/day</span>
      </div>
      <button
        onClick={() => idx < QTY_STEPS.length - 1 && onChange(QTY_STEPS[idx + 1])}
        disabled={idx >= QTY_STEPS.length - 1}
        className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomerSubscriptions() {
  const navigate = useNavigate();

  const [subs, setSubs] = useState<Subscription[]>(INITIAL_SUBS);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [newQty, setNewQty] = useState(1);
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const subscribedIds = subs.map((s) => s.productId);
  const availableToAdd = ALL_PRODUCTS.filter((p) => !subscribedIds.includes(p.id));
  const totalDaily = subs.reduce((a, s) => a + s.quantity, 0);
  const totalMonthly = subs.reduce((a, s) => {
    const p = ALL_PRODUCTS.find((p) => p.id === s.productId)!;
    return a + monthlyEst(s.quantity, p.pricePerUnit);
  }, 0);

  const hasChanges =
    JSON.stringify(subs) !== JSON.stringify(INITIAL_SUBS);

  const updateQty = (subId: string, qty: number) => {
    setSubs((prev) => prev.map((s) => (s.id === subId ? { ...s, quantity: qty } : s)));
    setSaved(false);
  };

  const removeSub = (subId: string) => {
    setSubs((prev) => prev.filter((s) => s.id !== subId));
    setDeleteConfirm(null);
    setSaved(false);
  };

  const confirmAdd = () => {
    if (!addingId) return;
    setSubs((prev) => [
      ...prev,
      { id: `sub_${Date.now()}`, productId: addingId, quantity: newQty },
    ]);
    setAddingId(null);
    setNewQty(1);
    setSaved(false);
  };

  const handleSave = () => {
    // TODO: call your API here
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

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
            <h1 className="font-bold text-slate-900 text-sm leading-tight">
              My Products
            </h1>
            <p className="text-xs text-slate-400">Manage daily subscriptions</p>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {saved ? <Check size={15} /> : null}
              {saved ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-5">

          {/* ── Summary banner ── */}
          <div className="bg-blue-600 rounded-2xl p-4 text-white flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-xs font-medium">Monthly estimate</p>
              <p className="text-3xl font-bold mt-0.5">
                ₹{totalMonthly.toLocaleString("en-IN")}
              </p>
              <p className="text-blue-200 text-xs mt-1">
                {subs.length} product{subs.length !== 1 ? "s" : ""} · {totalDaily} L/day
              </p>
            </div>
            <div className="bg-white/15 rounded-full p-3">
              <Droplets size={28} className="text-white" />
            </div>
          </div>

          {/* ── Effective-from notice ── */}
          {hasChanges && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
              <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">
                Changes take effect from tomorrow's delivery. Save before leaving this page.
              </p>
            </div>
          )}

          {/* ── Active subscriptions ── */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
              Active Subscriptions
            </p>

            {subs.length === 0 ? (
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-8 text-center">
                <Droplets size={32} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No active subscriptions</p>
                <p className="text-xs text-slate-400 mt-1">Add a product below</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subs.map((sub) => {
                  const product = ALL_PRODUCTS.find((p) => p.id === sub.productId)!;
                  const monthly = monthlyEst(sub.quantity, product.pricePerUnit);
                  const isConfirmingDelete = deleteConfirm === sub.id;

                  return (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl ring-1 ring-slate-100 overflow-hidden"
                    >
                      {/* Product info row */}
                      <div className="flex items-center gap-3 p-4 pb-3">
                        <div className="bg-blue-50 rounded-xl w-11 h-11 flex items-center justify-center text-2xl shrink-0">
                          {product.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            ₹{product.pricePerUnit}/L · {product.description}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setDeleteConfirm(isConfirmingDelete ? null : sub.id)
                          }
                          className="p-2 rounded-xl hover:bg-rose-50 text-slate-300 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Qty + price row */}
                      <div className="flex items-center justify-between px-4 pb-4">
                        <QtyControl
                          value={sub.quantity}
                          onChange={(v) => updateQty(sub.id, v)}
                        />
                        <div className="text-right">
                          <p className="text-base font-bold text-slate-900">
                            ₹{monthly.toLocaleString("en-IN")}
                          </p>
                          <p className="text-[10px] text-slate-400">/month est.</p>
                        </div>
                      </div>

                      {/* Delete confirm strip */}
                      {isConfirmingDelete && (
                        <div className="flex items-center gap-2 bg-rose-50 border-t border-rose-100 px-4 py-3">
                          <AlertCircle size={14} className="text-rose-500 shrink-0" />
                          <p className="text-xs text-rose-600 flex-1">
                            Remove {product.name}?
                          </p>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs font-semibold text-slate-500 px-3 py-1.5 rounded-lg hover:bg-slate-100"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => removeSub(sub.id)}
                            className="text-xs font-semibold text-white bg-rose-500 px-3 py-1.5 rounded-lg hover:bg-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Add a product ── */}
          {availableToAdd.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
                Add Product
              </p>

              {/* Product picker cards */}
              <div className="space-y-2">
                {availableToAdd.map((product) => {
                  const isSelected = addingId === product.id;

                  return (
                    <div
                      key={product.id}
                      className={`bg-white rounded-2xl ring-1 overflow-hidden transition-all ${
                        isSelected ? "ring-blue-400 shadow-sm" : "ring-slate-100"
                      }`}
                    >
                      {/* Row */}
                      <button
                        onClick={() => {
                          setAddingId(isSelected ? null : product.id);
                          setNewQty(1);
                        }}
                        className="w-full flex items-center gap-3 p-4 text-left"
                      >
                        <div className="bg-slate-50 rounded-xl w-11 h-11 flex items-center justify-center text-2xl shrink-0">
                          {product.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            ₹{product.pricePerUnit}/L · {product.description}
                          </p>
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <Check size={11} className="text-white" />}
                        </div>
                      </button>

                      {/* Expanded qty picker */}
                      {isSelected && (
                        <div className="border-t border-slate-100 px-4 py-4 bg-slate-50 space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-700">
                                Daily quantity
                              </p>
                              <p className="text-xs text-slate-400 mt-0.5">
                                How many litres per day?
                              </p>
                            </div>
                            <QtyControl value={newQty} onChange={setNewQty} />
                          </div>

                          {/* Estimate */}
                          <div className="bg-white rounded-xl p-3 flex justify-between items-center">
                            <span className="text-xs text-slate-500">
                              {newQty}L × 30 days × ₹{product.pricePerUnit}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              ₹{monthlyEst(newQty, product.pricePerUnit).toLocaleString("en-IN")}/mo
                            </span>
                          </div>

                          <button
                            onClick={confirmAdd}
                            className="w-full py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 active:scale-95 transition-all"
                          >
                            Add {product.name}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── All subscribed, no more to add ── */}
          {availableToAdd.length === 0 && subs.length > 0 && (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <Check size={16} className="text-emerald-500 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                You're subscribed to all available products.
              </p>
            </div>
          )}

          {/* ── Back to home ── */}
          <button
            onClick={() => navigate("/customer")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white hover:border-slate-300 transition-colors"
          >
            Back to home
            <ChevronRight size={15} />
          </button>

        </div>
      </main>
    </div>
  );
}