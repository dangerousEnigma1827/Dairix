import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Loader2, Banknote, QrCode } from "lucide-react";
import {
  formatINR,
  shiftPeriod,
  currentPeriod,
  type PaymentMethod,
  type Statement,
} from "../../api/Services/BillingServices";

type Period = { month: number; year: number };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthPicker({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  const now = currentPeriod();
  const isCurrent = value.month === now.month && value.year === now.year;
  return (
    <div className="flex items-center justify-between bg-white rounded-xl ring-1 ring-slate-100 shadow-sm px-2 py-1.5">
      <button
        onClick={() => onChange(shiftPeriod(value, -1))}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <span className="text-sm font-semibold text-slate-800">
        {MONTHS[value.month - 1]} {value.year}
      </span>
      <button
        onClick={() => onChange(shiftPeriod(value, 1))}
        disabled={isCurrent}
        className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

export function StatementView({
  statement,
  onVoidPayment,
}: {
  statement: Statement;
  onVoidPayment?: (paymentId: string) => void;
}) {
  const { summary, items, payments } = statement;
  const billable = items.filter((i) => i.status === "delivered");

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 space-y-2 text-sm">
        <Row label="Opening balance" value={formatINR(summary.openingBalance)} />
        <Row label={`Deliveries (${summary.delivered})`} value={`+ ${formatINR(summary.charges)}`} />
        <Row label={`Payments (${payments.length})`} value={`− ${formatINR(summary.payments)}`} valueClass="text-emerald-600" />
        <div className="border-t border-slate-100 pt-2">
          <Row
            label="Closing balance"
            value={formatINR(summary.closingBalance)}
            labelClass="font-semibold text-slate-900"
            valueClass={`font-bold ${summary.closingBalance > 0 ? "text-rose-600" : "text-emerald-600"}`}
          />
        </div>
        {summary.skipped > 0 && (
          <p className="text-xs text-slate-400">{summary.skipped} skipped day(s) not charged.</p>
        )}
      </div>

      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">Delivered items</h3>
        {billable.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white rounded-xl ring-1 ring-slate-100 p-4 text-center">
            No delivered items this month.
          </p>
        ) : (
          <ul className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm divide-y divide-slate-100">
            {billable.map((it) => (
              <li key={it.entryId} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(`${it.date}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" })}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {it.products.map((p) => `${p.quantity} ${p.unit} ${p.name} @ ${formatINR(p.price)}`).join(", ")}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-800 shrink-0">{formatINR(it.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {payments.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2 px-1">Payments</h3>
          <ul className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p._id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(p.paidAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
                    <span className="uppercase text-xs">{p.method}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    {typeof p.collectedBy === "object" ? `Received by ${p.collectedBy.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-emerald-600">{formatINR(p.amount)}</span>
                  {onVoidPayment && (
                    <button
                      onClick={() => onVoidPayment(p._id)}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Void
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  labelClass = "text-slate-500",
  valueClass = "text-slate-800 font-medium",
}: {
  label: string;
  value: string;
  labelClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={labelClass}>{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

export function RecordPaymentModal({
  customerName,
  suggestedAmount,
  onClose,
  onSubmit,
}: {
  customerName: string;
  suggestedAmount: number;
  onClose: () => void;
  onSubmit: (amount: number, method: PaymentMethod, note: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    try {
      await onSubmit(Math.round(value * 100) / 100, method, note.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Record payment</h2>
            <p className="text-xs text-slate-500">{customerName}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <X size={18} />
          </button>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">Amount (₹)</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {suggestedAmount > 0 && (
            <span className="text-xs text-slate-400">Outstanding: {formatINR(suggestedAmount)}</span>
          )}
        </label>

        <div className="grid grid-cols-2 gap-2">
          {(["cash", "upi"] as PaymentMethod[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium ring-1 transition ${
                method === m ? "bg-blue-600 text-white ring-blue-600" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {m === "cash" ? <Banknote size={16} /> : <QrCode size={16} />}
              {m === "cash" ? "Cash" : "UPI"}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Note (optional)"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          onClick={submit}
          disabled={!valid || saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          Save {valid ? formatINR(value) : ""}
        </button>
      </div>
    </div>
  );
}
