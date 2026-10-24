import { useNavigate } from "react-router-dom";
import { ArrowLeft, Banknote } from "lucide-react";

export default function DmCollections() {
  const navigate = useNavigate();

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
          <h1 className="font-bold text-slate-900 text-base">Collections Summary</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
        <div className="bg-white rounded-2xl p-6 ring-1 ring-slate-100 shadow-sm text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
            <Banknote size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Today's Collections</h2>
          <p className="text-sm text-slate-500 mt-2">
            Record and deposit your daily cash & UPI collections with the distributor office at the end of your delivery run.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400">Cash Collected</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">₹0</p>
          </div>
          <div className="bg-white rounded-2xl p-4 ring-1 ring-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400">UPI Collected</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">₹0</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/dm")}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm"
        >
          Back to Delivery Dashboard
        </button>
      </main>
    </div>
  );
}
