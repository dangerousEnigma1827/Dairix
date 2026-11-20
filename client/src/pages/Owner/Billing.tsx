import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Receipt, Wallet, AlertCircle, HandCoins, Search, Loader2, X, CheckCircle2 } from "lucide-react";
import {
  apiErrorMessage,
  currentPeriod,
  formatINR,
  getOwnerCustomerStatement,
  getOwnerOverview,
  getOwnerPendingCollections,
  recordOwnerPayment,
  settleDmCollections,
  voidPayment,
  type OwnerBillingRow,
  type OwnerOverview,
  type PendingDmGroup,
  type Statement,
} from "../../api/Services/BillingServices";
import { MonthPicker, RecordPaymentModal, StatementView } from "../../components/Billing/BillingParts";

type Tab = "customers" | "handover";

function Billing() {
  const [period, setPeriod] = useState(currentPeriod());
  const [overview, setOverview] = useState<OwnerOverview | null>(null);
  const [pending, setPending] = useState<{ total: number; dms: PendingDmGroup[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("customers");
  const [search, setSearch] = useState("");
  const [onlyDues, setOnlyDues] = useState(false);

  const [payingFor, setPayingFor] = useState<OwnerBillingRow | null>(null);
  const [statementFor, setStatementFor] = useState<OwnerBillingRow | null>(null);
  const [statement, setStatement] = useState<Statement | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);

  const load = useCallback(
    () =>
      Promise.all([getOwnerOverview(period), getOwnerPendingCollections()])
        .then(([o, p]) => {
          setOverview(o);
          setPending(p);
        })
        .catch((err) => toast.error(apiErrorMessage(err, "Could not load billing")))
        .finally(() => setLoading(false)),
    [period]
  );

  useEffect(() => {
    load();
  }, [load]);

  const changePeriod = (p: { month: number; year: number }) => {
    setLoading(true);
    setPeriod(p);
  };

  const loadStatement = async (row: OwnerBillingRow) => {
    setStatementLoading(true);
    try {
      setStatement(await getOwnerCustomerStatement(row._id, period));
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not load statement"));
    } finally {
      setStatementLoading(false);
    }
  };

  const openStatement = (row: OwnerBillingRow) => {
    setStatement(null);
    setStatementFor(row);
    loadStatement(row);
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return (overview?.customers ?? [])
      .filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q))
      .filter((c) => !onlyDues || c.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [overview, search, onlyDues]);

  const handlePayment = async (amount: number, method: "cash" | "upi", note: string) => {
    if (!payingFor) return;
    try {
      await recordOwnerPayment({ customerId: payingFor._id, amount, method, note });
      toast.success(`${formatINR(amount)} recorded for ${payingFor.name}`);
      setPayingFor(null);
      await load();
      if (statementFor?._id === payingFor._id) await loadStatement(statementFor);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not record payment"));
    }
  };

  const handleVoid = async (paymentId: string) => {
    if (!window.confirm("Void this payment? It will be removed from the customer's balance.")) return;
    try {
      await voidPayment(paymentId);
      toast.success("Payment voided");
      await load();
      if (statementFor) await loadStatement(statementFor);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not void payment"));
    }
  };

  const handleSettle = async (group: PendingDmGroup) => {
    if (!group.dm) return;
    if (!window.confirm(`Confirm you received ${formatINR(group.total)} from ${group.dm.name}?`)) return;
    setSettling(group.dm._id);
    try {
      const r = await settleDmCollections(group.dm._id);
      toast.success(`Settled ${r.settledCount} payment(s) · ${formatINR(r.settledAmount)}`);
      await load();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not settle collections"));
    } finally {
      setSettling(null);
    }
  };

  const t = overview?.totals;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
          <p className="text-sm text-slate-500">Monthly bills, payments and delivery partner collections.</p>
        </div>
        <div className="sm:w-56">
          <MonthPicker value={period} onChange={changePeriod} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Receipt size={18} />} label={`Billed · ${overview?.period.label ?? ""}`} value={t?.billed} tone="blue" />
        <StatCard icon={<Wallet size={18} />} label="Collected this month" value={t?.collected} tone="emerald" />
        <StatCard
          icon={<AlertCircle size={18} />}
          label={`Outstanding · ${t?.customersWithDues ?? 0} customers`}
          value={t?.outstanding}
          tone="rose"
        />
        <StatCard icon={<HandCoins size={18} />} label="With delivery staff" value={t?.withDms} tone="amber" />
      </div>

      <div className="flex gap-2">
        {(
          [
            ["customers", "Customers"],
            ["handover", `Pending handover${pending?.dms.length ? ` (${pending.dms.length})` : ""}`],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              tab === k ? "bg-blue-600 text-white shadow" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : tab === "customers" ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm">
          <div className="p-4 flex flex-col sm:flex-row gap-3 sm:items-center border-b border-slate-100">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or mobile"
                className="w-full pl-9 pr-3 py-2 rounded-xl ring-1 ring-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={onlyDues} onChange={(e) => setOnlyDues(e.target.checked)} />
              Only with dues
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">Delivery staff</th>
                  <th className="px-4 py-3 font-medium text-right">Deliveries</th>
                  <th className="px-4 py-3 font-medium text-right">Billed</th>
                  <th className="px-4 py-3 font-medium text-right">Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Outstanding</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      No customers match.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.mobile}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600 hidden md:table-cell">{r.assignedDm?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.deliveries}</td>
                      <td className="px-4 py-3 text-right">{formatINR(r.charges)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{formatINR(r.paid)}</td>
                      <td
                        className={`px-4 py-3 text-right font-semibold ${
                          r.outstanding > 0 ? "text-rose-600" : "text-slate-500"
                        }`}
                      >
                        {r.outstanding < 0 ? `${formatINR(-r.outstanding)} cr` : formatINR(r.outstanding)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2 whitespace-nowrap">
                          <button
                            onClick={() => openStatement(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium ring-1 ring-slate-200 text-slate-700 hover:bg-slate-100"
                          >
                            Statement
                          </button>
                          <button
                            onClick={() => setPayingFor(r)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Record payment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : pending && pending.dms.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-4">
          {pending.dms.map((g) => (
            <div key={g.dm?._id ?? "unknown"} className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{g.dm?.name ?? "Unknown"}</p>
                  <p className="text-xs text-slate-500">{g.dm?.mobile}</p>
                </div>
                <p className="text-xl font-bold text-amber-600">{formatINR(g.total)}</p>
              </div>
              <p className="text-xs text-slate-500">
                {formatINR(g.cash)} cash · {formatINR(g.upi)} UPI · {g.payments.length} payment(s)
              </p>
              <ul className="text-sm divide-y divide-slate-100 max-h-48 overflow-y-auto">
                {g.payments.map((p) => (
                  <li key={p._id} className="py-2 flex justify-between gap-2">
                    <span className="text-slate-700 truncate">
                      {typeof p.customer === "object" ? p.customer.name : "Customer"}
                      <span className="text-xs text-slate-400">
                        {" "}
                        · {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                        {p.method.toUpperCase()}
                      </span>
                    </span>
                    <span className="font-medium">{formatINR(p.amount)}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleSettle(g)}
                disabled={!g.dm || settling === g.dm._id}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl"
              >
                {settling === g.dm?._id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Mark as received
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center text-slate-500 text-sm">
          All delivery staff collections have been handed over.
        </div>
      )}

      {statementFor && (
        <div className="fixed inset-0 z-40 bg-black/40 flex justify-end" onClick={() => setStatementFor(null)}>
          <div className="w-full max-w-md h-full bg-slate-50 overflow-y-auto p-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">{statementFor.name}</h2>
                <p className="text-xs text-slate-500">Statement · {overview?.period.label}</p>
              </div>
              <button onClick={() => setStatementFor(null)} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500">
                <X size={18} />
              </button>
            </div>
            {statementLoading || !statement ? (
              <div className="flex justify-center py-16">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <StatementView statement={statement} onVoidPayment={handleVoid} />
                <button
                  onClick={() => setPayingFor(statementFor)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl"
                >
                  Record payment
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {payingFor && (
        <RecordPaymentModal
          customerName={payingFor.name}
          suggestedAmount={Math.max(payingFor.outstanding, 0)}
          onClose={() => setPayingFor(null)}
          onSubmit={handlePayment}
        />
      )}
    </div>
  );
}

const TONES = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  rose: "bg-rose-50 text-rose-600",
  amber: "bg-amber-50 text-amber-600",
};

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone]}`}>{icon}</div>
      <p className="text-xs text-slate-500 mt-3 truncate">{label}</p>
      <p className="text-xl font-bold text-slate-900">{formatINR(value ?? 0)}</p>
    </div>
  );
}

export default Billing;
