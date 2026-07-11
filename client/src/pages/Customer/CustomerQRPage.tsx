/**
 * Installation (run once in your project):
 *   npm install qrcode
 *   npm install -D @types/qrcode
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Download,
  Share2,
  RefreshCw,
  CheckCircle2,
  Info,
  User,
  Phone,
  MapPin,
  Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type Customer = {
  name: string;
  mobile: string;
  customerId: string;
  address: { houseNo: string; street: string; city: string };
};

// ── Mock — replace with your auth context / API call ─────────────────────────

const CUSTOMER: Customer = {
  name: "Venkata Rao",
  mobile: "9876123456",
  customerId: "C001",
  address: { houseNo: "H-7", street: "Laxmi Colony", city: "Kamareddy" },
};

// ── The QR value encodes mobile + customerId so the DM app can resolve it ────
// Format: "DAIRIX:<customerId>:<mobile>"
// DM app scans → looks up customer by customerId, verifies mobile.
function buildQRValue(customer: Customer): string {
  return `DAIRIX:${customer.customerId}:${customer.mobile}`;
}

// ── Page ──────────────────────────────────────────────────────────────────────

type GenState = "idle" | "generating" | "ready" | "error";

export default function CustomerQRPage() {
  const navigate = useNavigate();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<GenState>("idle");
  const [dataUrl, setDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const qrValue = buildQRValue(CUSTOMER);

  // Auto-generate on mount
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate() {
    setState("generating");
    setDataUrl("");

    try {
      // Draw onto the hidden canvas
      if (canvasRef.current) {
        await QRCode.toCanvas(canvasRef.current, qrValue, {
          width: 240,
          margin: 2,
          color: { dark: "#1e293b", light: "#ffffff" },
          errorCorrectionLevel: "H", // high — survives dirt/damage on door sticker
        });
      }

      // Also produce a PNG data URL for download / share
      const url = await QRCode.toDataURL(qrValue, {
        width: 600,
        margin: 3,
        color: { dark: "#1e293b", light: "#ffffff" },
        errorCorrectionLevel: "H",
      });
      setDataUrl(url);
      setState("ready");
    } catch (err) {
      console.error("QR generation failed:", err);
      setState("error");
    }
  }

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `dairix-qr-${CUSTOMER.customerId}.png`;
    a.click();
  }

  async function handleShare() {
    if (!dataUrl) return;

    // Convert base64 to Blob for Web Share API
    const res  = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `dairix-qr-${CUSTOMER.customerId}.png`, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: "My DairyDesk QR Code",
        text: `Scan to deliver to ${CUSTOMER.name} — ${CUSTOMER.address.houseNo}, ${CUSTOMER.address.street}`,
        files: [file],
      }).catch(() => {});
    } else {
      // Fallback: copy the QR value to clipboard
      await navigator.clipboard.writeText(qrValue).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

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
            <h1 className="font-bold text-slate-900 text-sm">My QR Code</h1>
            <p className="text-xs text-slate-400">For doorstep delivery scanning</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-10 space-y-4">

          {/* ── QR card ── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6 flex flex-col items-center">

            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Your unique QR code
            </p>
            <p className="text-sm text-slate-500 text-center mb-6">
              Show or stick this at your door entry
            </p>

            {/* QR display area */}
            <div className="relative">
              {/* Always-mounted canvas (hidden until ready) */}
              <canvas
                ref={canvasRef}
                className={`rounded-xl transition-opacity duration-300 ${
                  state === "ready" ? "opacity-100" : "opacity-0 absolute"
                }`}
              />

              {/* Placeholder while generating */}
              {state !== "ready" && (
                <div className="w-[240px] h-[240px] bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-3">
                  {state === "generating" && (
                    <>
                      <Loader2 size={28} className="text-blue-500 animate-spin" />
                      <p className="text-xs text-slate-400">Generating…</p>
                    </>
                  )}
                  {state === "idle" && (
                    <p className="text-xs text-slate-400 text-center px-4">
                      Tap "Generate QR" below
                    </p>
                  )}
                  {state === "error" && (
                    <>
                      <p className="text-xs text-rose-500 text-center px-4">
                        Failed to generate. Try again.
                      </p>
                      <button
                        onClick={generate}
                        className="text-xs font-semibold text-blue-600 underline"
                      >
                        Retry
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Customer label below QR */}
            {state === "ready" && (
              <div className="mt-4 text-center">
                <p className="text-base font-bold text-slate-900 tracking-widest">
                  {CUSTOMER.customerId}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{CUSTOMER.name}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 mt-6 w-full">
              {state === "ready" ? (
                <>
                  <button
                    onClick={handleDownload}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                  >
                    <Download size={16} />
                    Save PNG
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 size={16} />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Share2 size={16} />
                        Share
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={generate}
                  disabled={state === "generating"}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 active:scale-95 transition-all"
                >
                  {state === "generating" ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <RefreshCw size={16} />
                      Generate QR
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Regenerate link when already ready */}
            {state === "ready" && (
              <button
                onClick={generate}
                className="mt-3 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                <RefreshCw size={12} />
                Regenerate
              </button>
            )}
          </div>

          {/* ── Linked account info ── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Linked to your account
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <User size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{CUSTOMER.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Mobile (encoded in QR)</p>
                  <p className="text-sm font-semibold text-slate-800">{CUSTOMER.mobile}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Address</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {CUSTOMER.address.houseNo}, {CUSTOMER.address.street},{" "}
                    {CUSTOMER.address.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── How it works ── */}
          <div className="bg-blue-50 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={15} className="text-blue-600 shrink-0" />
              <p className="text-sm font-semibold text-blue-700">How it works</p>
            </div>
            <ol className="space-y-3">
              {[
                { step: "Print or show this QR at your door.", icon: "🖨️" },
                { step: "Your delivery person scans it on arrival.", icon: "📱" },
                { step: "Delivery is logged instantly — no manual entry.", icon: "✅" },
                { step: "You can track each delivery in the Deliveries tab.", icon: "📅" },
              ].map(({ step, icon }, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-base shrink-0 mt-0.5">{icon}</span>
                  <p className="text-xs text-blue-800 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

        </div>
      </main>
    </div>
  );
}