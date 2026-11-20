import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Wallet } from "lucide-react";
import {
  currentPeriod,
  formatINR,
  getMyStatement,
  type Statement,
} from "../../api/Services/BillingServices";
import { MonthPicker, StatementView } from "../../components/Billing/BillingParts";

export default function CustomerBilling() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState(currentPeriod());
  const [statement, setStatement] = useState<Statement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const changePeriod = (p: { month: number; year: number }) => {
    setLoading(true);
    setError("");
    setPeriod(p);
  };

  useEffect(() => {
    let active = true;
    getMyStatement(period)
      .then((s) => active && setStatement(s))
      .catch(() => active && setError("Could not load your bill. Please try again."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [period]);

  const outstanding = statement?.summary.outstanding ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/customer")}
            className="p-2 -ml-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-slate-900 text-base">Bills & Payments</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
        <div
          className={`rounded-2xl p-5 text-white shadow-md ${
            outstanding > 0 ? "bg-gradient-to-br from-rose-500 to-rose-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"
          }`}
        >
          <div className="flex items-center gap-2 text-white/80 text-xs font-medium">
            <Wallet size={14} /> Total amount due
          </div>
          <p className="text-3xl font-bold mt-1">{formatINR(Math.max(outstanding, 0))}</p>
          <p className="text-xs text-white/80 mt-1">
            {outstanding > 0
              ? "Pay your delivery partner by cash or UPI at your doorstep."
              : outstanding < 0
              ? `You have ${formatINR(-outstanding)} in advance credit.`
              : "You're all settled up. Thank you!"}
          </p>
        </div>

        <MonthPicker value={period} onChange={changePeriod} />

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-2 text-sm text-rose-700">
            <AlertCircle size={18} /> {error}
          </div>
        ) : statement ? (
          <StatementView statement={statement} />
        ) : null}
      </main>
    </div>
  );
}
