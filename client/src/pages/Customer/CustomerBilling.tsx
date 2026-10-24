import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, AlertCircle } from "lucide-react";

export default function CustomerBilling() {
  const navigate = useNavigate();

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
        <div className="bg-white rounded-2xl p-6 ring-1 ring-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <CreditCard size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Doorstep Collection Active</h2>
          <p className="text-sm text-slate-500 mt-2">
            Monthly milk delivery statements are generated at the end of each billing cycle. Your assigned delivery partner collects payments directly at your doorstep via Cash or UPI QR.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold text-sm">Need a billing invoice?</p>
            <p>Contact your dairy distributor directly or request a printed receipt from your delivery staff during morning drop-off.</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/customer")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm"
        >
          Return to Dashboard
        </button>
      </main>
    </div>
  );
}
