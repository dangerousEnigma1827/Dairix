import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Search, Banknote, QrCode, HandCoins } from "lucide-react";
import {
  apiErrorMessage,
  formatINR,
  getDmBillingCustomers,
  getDmCollections,
  recordDmPayment,
  type DmBillingCustomer,
  type DmCollections as DmCollectionsData,
} from "../../api/Services/BillingServices";
import { RecordPaymentModal } from "../../components/Billing/BillingParts";

export default function DmCollections() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<DmBillingCustomer[]>([]);
  const [collections, setCollections] = useState<DmCollectionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"dues" | "today">("dues");
  const [collecting, setCollecting] = useState<DmBillingCustomer | null>(null);

  const load = useCallback(
    () =>
      Promise.all([getDmBillingCustomers(), getDmCollections()])
        .then(([c, col]) => {
          setCustomers(c.customers);
          setCollections(col);
        })
        .catch((err) => toast.error(apiErrorMessage(err, "Could not load collections")))
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [customers, search]);

  const handleSubmit = async (amount: number, method: "cash" | "upi", note: string) => {
    if (!collecting) return;
    try {
      await recordDmPayment({ customerId: collecting._id, amount, method, note });
      toast.success(`${formatINR(amount)} recorded from ${collecting.name}`);
      setCollecting(null);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not record payment"));
    }
  };

  const totals = collections?.totals;
  const handover = collections?.pendingHandover;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/dm")}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-900 text-base">Collections</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Banknote size={14} /> Cash today
                </p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{formatINR(totals?.cash ?? 0)}</p>
              </div>
              <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-sm">
                <p className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <QrCode size={14} /> UPI today
                </p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{formatINR(totals?.upi ?? 0)}</p>
              </div>
            </div>

            {handover && handover.total > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <HandCoins size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-900">
                  <p className="font-semibold">To hand over: {formatINR(handover.total)}</p>
                  <p className="text-xs text-amber-800">
                    {formatINR(handover.cash)} cash · {formatINR(handover.upi)} UPI across {handover.count} payment(s), not yet
                    settled with the owner.
                  </p>
                </div>
              </div>
            )}

            <div className="flex bg-white rounded-xl ring-1 ring-slate-100 p-1">
              {(["dues", "today"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg ${
                    tab === t ? "bg-blue-600 text-white" : "text-slate-600"
                  }`}
                >
                  {t === "dues" ? "Customer dues" : `Today (${totals?.count ?? 0})`}
                </button>
              ))}
            </div>

            {tab === "dues" ? (
              <>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customer"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white ring-1 ring-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {filtered.length === 0 ? (
                  <p className="text-center text-sm text-slate-500 py-8">No customers found.</p>
                ) : (
                  <ul className="space-y-2">
                    {filtered.map((c) => (
                      <li key={c._id} className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">{c.name}</p>
                          <p className="text-xs text-slate-500">{c.mobile}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${c.outstanding > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {c.outstanding < 0 ? `${formatINR(-c.outstanding)} cr` : formatINR(c.outstanding)}
                          </p>
                          <p className="text-[11px] text-slate-400">{c.outstanding > 0 ? "due" : "settled"}</p>
                        </div>
                        <button
                          onClick={() => setCollecting(c)}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                        >
                          Collect
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : collections && collections.payments.length > 0 ? (
              <ul className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm divide-y divide-slate-100">
                {collections.payments.map((p) => (
                  <li key={p._id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {typeof p.customer === "object" ? p.customer.name : "Customer"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(p.paidAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })} ·{" "}
                        <span className="uppercase">{p.method}</span>
                        {p.status === "settled" && " · handed over"}
                      </p>
                    </div>
                    <span className="font-semibold text-emerald-600">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-center text-sm text-slate-500 py-8">No payments collected today.</p>
            )}
          </>
        )}
      </main>

      {collecting && (
        <RecordPaymentModal
          customerName={collecting.name}
          suggestedAmount={Math.max(collecting.outstanding, 0)}
          onClose={() => setCollecting(null)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
