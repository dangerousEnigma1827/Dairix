import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Flashlight,
  Search,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Loader2,
  Milk,
  Phone,
  MapPin,
  Banknote,
  CreditCard,
  BookOpen,
  RotateCcw,
  AlertCircle,
  ScanLine,
} from "lucide-react";

// ── Replace with your actual imports ─────────────────────────────────────────
// import { getCustomerByIdService } from "../../api/Services/DM/DeliveryServices";
// import { submitDeliveryService } from "../../api/Services/DM/DeliveryServices";

// ── Types ─────────────────────────────────────────────────────────────────────

type PaymentMode = "cash" | "upi" | "on_account";

type ScannedCustomer = {
  _id: string;
  name: string;
  mobile: string;
  address: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  outstandingBalance: number;
};

type ScanState = "idle" | "scanning" | "found" | "submitting" | "success" | "error" | "not_found";

// ── Mock customer lookup — replace with real API ──────────────────────────────
async function mockLookupCustomer(query: string): Promise<ScannedCustomer | null> {
  await new Promise((r) => setTimeout(r, 900));
  if (query.toLowerCase().includes("not")) return null;
  return {
    _id: "cust_001",
    name: "Venkata Rao",
    mobile: "98761 23456",
    address: "H-7, Laxmi Colony, Kamareddy",
    productName: "Cow Milk",
    quantity: 2,
    unit: "L",
    pricePerUnit: 60,
    outstandingBalance: 4800,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const paymentConfig: Record<PaymentMode, { label: string; icon: typeof Banknote; color: string; bg: string }> = {
  cash:       { label: "Cash",       icon: Banknote,    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-300" },
  upi:        { label: "UPI",        icon: CreditCard,  color: "text-blue-700",    bg: "bg-blue-50 border-blue-300" },
  on_account: { label: "On Account", icon: BookOpen,    color: "text-amber-700",   bg: "bg-amber-50 border-amber-300" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DMScanDeliver() {
  const navigate = useNavigate();

  const [scanState, setScanState]       = useState<ScanState>("scanning");
  const [customer, setCustomer]         = useState<ScannedCustomer | null>(null);
  const [searchQuery, setSearchQuery]   = useState("");
  const [searching, setSearching]       = useState(false);
  const [paymentMode, setPaymentMode]   = useState<PaymentMode>("on_account");
  const [cashAmount, setCashAmount]     = useState("");
  const [submitError, setSubmitError]   = useState("");
  const [torchOn, setTorchOn]           = useState(false);

  const videoRef    = useRef<HTMLVideoElement>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const scanLineRef = useRef<NodeJS.Timeout | null>(null);

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Simulate a QR scan after 3s for demo — remove in production
      // In production: use a library like @zxing/browser or jsQR
      scanLineRef.current = setTimeout(() => {
        handleQRDetected("DAIRIX:cust_001:9876123456");
      }, 3000);
    } catch {
      setScanState("error");
    }
  };

  const stopCamera = () => {
    if (scanLineRef.current) clearTimeout(scanLineRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((v) => !v);
    } catch {
      // torch not supported
    }
  };

  // ── QR detected callback ──────────────────────────────────────────────────
  // In production wire this to your QR library's onScan callback
  const handleQRDetected = async (raw: string) => {
    stopCamera();
    setScanState("scanning");

    // Parse "DAIRIX:<customerId>:<mobile>"
    const parts = raw.split(":");
    const customerId = parts[1] ?? raw;

    try {
      // const req = await getCustomerByIdService(customerId);
      const req = await mockLookupCustomer(customerId);
      if (req) {
        setCustomer(req);
        setScanState("found");
      } else {
        setScanState("not_found");
      }
    } catch {
      setScanState("error");
    }
  };

  // ── Manual search ─────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setScanState("scanning");
    try {
      // const req = await getCustomerBySearchService(searchQuery);
      const req = await mockLookupCustomer(searchQuery);
      if (req) {
        setCustomer(req);
        setScanState("found");
      } else {
        setScanState("not_found");
      }
    } catch {
      setScanState("error");
    } finally {
      setSearching(false);
    }
  };

  // ── Submit delivery ───────────────────────────────────────────────────────
  const handleSubmit = async (status: "delivered" | "skipped") => {
    if (!customer) return;
    if (status === "delivered" && paymentMode === "cash" && !cashAmount) {
      setSubmitError("Enter cash amount collected.");
      return;
    }
    setSubmitError("");
    setScanState("submitting");

    try {
      // await submitDeliveryService({
      //   customerId: customer._id,
      //   status,
      //   paymentMode: status === "delivered" ? paymentMode : undefined,
      //   paymentAmount: paymentMode === "cash" ? Number(cashAmount) : undefined,
      // });
      await new Promise((r) => setTimeout(r, 800)); // remove — simulates API
      setScanState("success");
    } catch {
      setScanState("error");
    }
  };

  const handleReset = () => {
    setCustomer(null);
    setSearchQuery("");
    setPaymentMode("on_account");
    setCashAmount("");
    setSubmitError("");
    setScanState("scanning");
    startCamera();
  };

  const totalDue = customer
    ? customer.quantity * customer.pricePerUnit
    : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-white text-sm">Scan & Deliver</h1>
            <p className="text-xs text-slate-500">Point camera at customer QR</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto">

          {/* ── Camera / Scanner area ── */}
          {(scanState === "scanning" || scanState === "idle") && (
            <div className="relative bg-black" style={{ minHeight: 300 }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full object-cover"
                style={{ maxHeight: 320 }}
              />

              {/* Overlay frame */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative w-52 h-52">
                  {/* Corner marks */}
                  {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                    <span
                      key={i}
                      className={`absolute w-8 h-8 ${pos} border-blue-400`}
                      style={{
                        borderTopWidth:    i < 2 ? 3 : 0,
                        borderBottomWidth: i >= 2 ? 3 : 0,
                        borderLeftWidth:   i % 2 === 0 ? 3 : 0,
                        borderRightWidth:  i % 2 === 1 ? 3 : 0,
                        borderRadius:      i === 0 ? "8px 0 0 0" : i === 1 ? "0 8px 0 0" : i === 2 ? "0 0 0 8px" : "0 0 8px 0",
                      }}
                    />
                  ))}
                  {/* Scan line */}
                  <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-blue-400/70 animate-pulse rounded-full" />
                </div>
              </div>

              {/* Scanning indicator */}
              <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-full">
                  <Loader2 size={14} className="text-blue-400 animate-spin" />
                  <span className="text-white text-xs">Scanning…</span>
                </div>
              </div>

              {/* Torch */}
              <button
                onClick={toggleTorch}
                className={`absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  torchOn ? "bg-yellow-400 text-slate-900" : "bg-black/50 text-white"
                }`}
              >
                <Flashlight size={16} />
              </button>
            </div>
          )}

          {/* Resolving state */}
          {scanState === "scanning" && customer === null && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 bg-slate-900">
              <Loader2 size={28} className="text-blue-400 animate-spin" />
              <p className="text-slate-400 text-sm">Looking up customer…</p>
            </div>
          )}

          {/* ── Manual search (always visible below camera) ── */}
          {(scanState === "scanning" || scanState === "idle" || scanState === "not_found") && (
            <div className="bg-slate-900 px-4 pt-4 pb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Or search manually
              </p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3">
                  <Search size={15} className="text-slate-500 shrink-0" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Name or mobile number…"
                    className="flex-1 bg-transparent text-white text-sm py-3 outline-none placeholder:text-slate-600"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-blue-600 text-white px-4 rounded-xl text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  {searching ? <Loader2 size={16} className="animate-spin" /> : "Search"}
                </button>
              </div>
              {scanState === "not_found" && (
                <div className="flex items-center gap-2 mt-3 bg-rose-950 border border-rose-800 rounded-xl px-3 py-2.5">
                  <AlertCircle size={14} className="text-rose-400 shrink-0" />
                  <p className="text-rose-300 text-xs">No customer found. Try a different name or number.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Customer found — delivery form ── */}
          {(scanState === "found" || scanState === "submitting") && customer && (
            <div className="bg-slate-50 min-h-screen px-4 pt-4 pb-10 space-y-4">

              {/* Customer card */}
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-blue-100 text-blue-700 rounded-full w-11 h-11 flex items-center justify-center font-bold text-sm shrink-0">
                    {customer.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900">{customer.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone size={11} /> {customer.mobile}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={11} /> {customer.address}
                    </p>
                  </div>
                </div>

                {/* Product info */}
                <div className="bg-blue-50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-blue-600 p-1.5 rounded-lg">
                      <Milk size={14} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{customer.productName}</p>
                      <p className="text-xs text-slate-500">
                        {customer.quantity} {customer.unit} · ₹{customer.pricePerUnit}/{customer.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-slate-900">
                      ₹{totalDue.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-slate-400">today</p>
                  </div>
                </div>

                {/* Outstanding */}
                {customer.outstandingBalance > 0 && (
                  <div className="flex items-center gap-2 mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <p className="text-xs text-amber-700">
                      Outstanding balance:{" "}
                      <span className="font-bold">
                        ₹{customer.outstandingBalance.toLocaleString("en-IN")}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Payment mode */}
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                  Payment Mode
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(paymentConfig) as [PaymentMode, typeof paymentConfig[PaymentMode]][]).map(
                    ([mode, cfg]) => {
                      const Icon      = cfg.icon;
                      const isSelected = paymentMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => { setPaymentMode(mode); setCashAmount(""); setSubmitError(""); }}
                          className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                            isSelected ? cfg.bg + " border-current " + cfg.color : "border-slate-100 text-slate-400 hover:border-slate-200"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-[11px] font-semibold">{cfg.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Cash amount input */}
                {paymentMode === "cash" && (
                  <div className="mt-3">
                    <label className="text-xs text-slate-500 mb-1.5 block">Amount collected (₹)</label>
                    <input
                      type="number"
                      value={cashAmount}
                      onChange={(e) => { setCashAmount(e.target.value); setSubmitError(""); }}
                      placeholder={`₹${totalDue} (today's amount)`}
                      className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                )}

                {/* UPI note */}
                {paymentMode === "upi" && (
                  <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2.5 text-xs text-blue-700">
                    Customer will show UPI confirmation. Amount: ₹{totalDue}
                  </div>
                )}

                {submitError && (
                  <p className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                    <AlertCircle size={12} /> {submitError}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSubmit("skipped")}
                  disabled={scanState === "submitting"}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50 text-rose-600 text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
                >
                  <XCircle size={17} />
                  Skip
                </button>
                <button
                  onClick={() => handleSubmit("delivered")}
                  disabled={scanState === "submitting"}
                  className="flex-[2] flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-60 active:scale-95 transition-all shadow-sm shadow-blue-200"
                >
                  {scanState === "submitting" ? (
                    <Loader2 size={17} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={17} />
                  )}
                  {scanState === "submitting" ? "Saving…" : "Confirm Delivery"}
                </button>
              </div>

              {/* Scan another */}
              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-white transition-colors"
              >
                <ScanLine size={15} />
                Scan another customer
              </button>
            </div>
          )}

          {/* ── Success state ── */}
          {scanState === "success" && customer && (
            <div className="bg-slate-50 min-h-screen px-4 pt-12 pb-10 flex flex-col items-center">
              <div className="bg-emerald-100 rounded-full p-5 mb-4">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Delivery Recorded!</h2>
              <p className="text-slate-500 text-sm mt-1 text-center">
                {customer.quantity}{customer.unit} delivered to {customer.name}
              </p>

              <div className="w-full bg-white rounded-2xl ring-1 ring-slate-100 p-4 mt-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Customer</span>
                  <span className="font-semibold text-slate-800">{customer.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Product</span>
                  <span className="font-semibold text-slate-800">
                    {customer.quantity}{customer.unit} {customer.productName}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Payment</span>
                  <span className="font-semibold text-slate-800 capitalize">
                    {paymentMode === "on_account" ? "On Account" : `${paymentMode.toUpperCase()}${cashAmount ? ` · ₹${cashAmount}` : ""}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Time</span>
                  <span className="font-semibold text-slate-800">
                    {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 mt-6 w-full">
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-white transition-colors"
                >
                  <RotateCcw size={15} />
                  Next Customer
                </button>
                <button
                  onClick={() => navigate("/dm")}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-blue-600 text-white text-sm font-semibold active:scale-95 transition-all"
                >
                  Dashboard
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ── Camera error ── */}
          {scanState === "error" && !customer && (
            <div className="bg-slate-50 px-4 pt-12 pb-10 flex flex-col items-center">
              <div className="bg-rose-100 rounded-full p-4 mb-4">
                <AlertCircle size={32} className="text-rose-500" />
              </div>
              <p className="font-semibold text-slate-900">Camera unavailable</p>
              <p className="text-sm text-slate-500 text-center mt-1">
                Allow camera access or use manual search below.
              </p>
              <button
                onClick={handleReset}
                className="mt-5 flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-semibold"
              >
                <RotateCcw size={15} /> Try again
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}