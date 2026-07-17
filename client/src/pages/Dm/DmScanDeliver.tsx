import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { IScannerControls } from "@zxing/browser";
import { BrowserQRCodeReader } from "@zxing/browser";
import {
  QrCode,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  MapPin,
  Phone,
  Milk,
  Banknote,
  Smartphone,
  Wallet,
} from "lucide-react";

// utils
import { avatarPalette, getInitials } from "../../utils/AvatarPalletesAndGetInitials";
import {
  // getCustomerDeliveryByIdService,
  // updateDeliveryStatusService,
} from "../../api/Services/Owner/DeliveryEntryServices";
import { getCustomerDeliveryByIdService } from "../../api/Services/AuthServices";
import { updateDeliveryEntryService } from "../../api/Services/Dm/DeliveryEntryServices";


// ── Types — same DeliveryEntry shape used on the Dashboard ─────────────────

type DeliveryEntry = {
  _id: string;
  name: string;
  mobile: string;
  role: "customer" | "dm" | "owner";

  address?: {
    houseNo?: string;
    street?: string;
    landmark?: string;
    city?: string;
    pincode?: string;
  };

  assignedDm?: {
    _id:string;
    name:string;
    mobile:string;
  };

  products:{
    _id:string;
    name:string;
    price:number;
    unit:string;
    image?:string;
    quantity:number;
  }[];

  qrCode:string;
};

type PageState =
  | "scanning"
  | "loading_customer"
  | "found"
  | "submitting"
  | "success"
  | "error"
  | "not_found";

// type PaymentMethod = "cash" | "upi" | "account";

function formatAddressLines(address?: DeliveryEntry["address"]): string[] {
  if (!address) return [];

  const line1 = [address.houseNo, address.street]
    .filter(Boolean)
    .join(", ");

  const line2 = address.landmark ?? "";

  const line3 = [address.city, address.pincode]
    .filter(Boolean)
    .join(" - ");

  return [line1, line2, line3].filter(Boolean);
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function DMScanDeliver() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const [pageState, setPageState]       = useState<PageState>("scanning");
  const [errorMessage, setErrorMessage] = useState("");
  const [entry, setEntry]               = useState<DeliveryEntry | null>(null);

  // ── Camera lifecycle: only runs the scanner while pageState === "scanning" ──
  useEffect(() => {
  // console.log("Scanner effect triggered. State:", pageState);

  if (pageState !== "scanning") {
    console.log("Not scanning state, returning");
    return;
  }

  if (!videoRef.current) {
    console.log("Video ref missing");
    return;
  }

  let cancelled = false;
  const codeReader = new BrowserQRCodeReader();

  codeReader
    .decodeFromVideoDevice(
      undefined,
      videoRef.current,
      (result, error, controls) => {
        if(result && !cancelled){
          console.log("QR FOUND:", result.getText());
          cancelled = true;
          controls.stop();
          handleScan(result.getText());
        }
      }
    )
    .then((controls) => {
      console.log("Camera started successfully");
      controlsRef.current = controls;
    })
    .catch((err:any)=>{
      console.log("Camera start failed:",err);
      setErrorMessage(
        err.message || "Camera error"
      );
      setPageState("error");
    });


    return ()=>{
      console.log("Cleaning scanner");

      cancelled=true;

      controlsRef.current?.stop();
    };

  },[pageState]);

  // ── QR scanned → resolve to today's DeliveryEntry for this customer + DM ───
  const handleScan = async(customerId:string)=>{
    console.log("HANDLE SCAN:",customerId);
    setPageState("loading_customer");
    try{
        const res = await getCustomerDeliveryByIdService(customerId);
        console.log("DELIVERY RESPONSE:",res);
        if(!res){
            setPageState("not_found");
            return;
        }
        setEntry(res);
        setPageState("found");
    }catch(err){
        console.log(
          "FETCH DELIVERY ERROR:",
          err
        );
        setErrorMessage(
          "Couldn't fetch customer delivery"
        );
        setPageState("error");
    }
  }

  // ── Confirm / Skip ──────────────────────────────────────────────────────────
  const handleAction = async (status: "delivered" | "skipped") => {
    if (!entry) return;
    setPageState("submitting");
    try {
      console.log(entry._id)
      await updateDeliveryEntryService(entry._id)
      setPageState("success");
    } catch (err) {
      console.error("Error updating delivery status:", err);
      setErrorMessage("Couldn't update this delivery. Please try again.");
      setPageState("error");
    }
  };

  const resetToScan = () => {
    setEntry(null);
    setErrorMessage("");
    setPageState("scanning");
  };

  // ── Derived values for the found/submitting/success screens ────────────────
  const totalAmount = entry?.products.reduce((s, p) => s + p.quantity * p.price, 0) ?? 0;
  const addressLines = formatAddressLines(entry?.address);
  const productSummary = entry?.products
    .map((p) => `${p.quantity}${p.unit} ${p.name}`)
    .join(", ");

  const isFoundScreen = pageState === "found" || pageState === "submitting";
  const isSubmitting  = pageState === "submitting";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/dm")}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <QrCode size={16} className="text-white" />
            </div>
            <span className="font-bold text-slate-900 text-sm">Scan &amp; Deliver</span>
          </div>
          <div className="w-9" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-8">

          {/* ── Scanning ── */}
          {pageState === "scanning" && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-3xl overflow-hidden aspect-square ring-1 ring-slate-200">
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                <div className="absolute inset-8 pointer-events-none">
                  <div className="absolute -top-0.5 -left-0.5 w-9 h-9 border-t-4 border-l-4 border-blue-400 rounded-tl-2xl" />
                  <div className="absolute -top-0.5 -right-0.5 w-9 h-9 border-t-4 border-r-4 border-blue-400 rounded-tr-2xl" />
                  <div className="absolute -bottom-0.5 -left-0.5 w-9 h-9 border-b-4 border-l-4 border-blue-400 rounded-bl-2xl" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-9 h-9 border-b-4 border-r-4 border-blue-400 rounded-br-2xl" />
                  <div className="absolute inset-x-2 top-1/2 h-0.5 bg-blue-400/70 animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-slate-800">Point the camera at the customer's QR code</p>
                <p className="text-xs text-slate-500">Hold steady — it scans automatically</p>
              </div>
            </div>
          )}

          {/* ── Loading customer ── */}
          {pageState === "loading_customer" && (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 size={26} className="text-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">Looking up today's delivery…</p>
            </div>
          )}

          {/* ── Not found ── */}
          {pageState === "not_found" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="bg-amber-50 p-4 rounded-full">
                <AlertCircle size={30} className="text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">No delivery found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  This customer doesn't have a delivery assigned to you for today.
                </p>
              </div>
              <button
                onClick={resetToScan}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Scan Again
              </button>
            </div>
          )}

          {/* ── Error ── */}
          {pageState === "error" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="bg-rose-50 p-4 rounded-full">
                <XCircle size={30} className="text-rose-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Something went wrong</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">{errorMessage}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={resetToScan}
                  className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate("/dm")}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
                >
                  Dashboard
                </button>
              </div>
            </div>
          )}

          {/* ── Found / Submitting ── */}
          {isFoundScreen && entry && (
            <div className="space-y-4">

              {/* Customer card */}
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`${avatarPalette[0]} rounded-full w-11 h-11 flex items-center justify-center text-sm font-bold shrink-0`}>
                    {getInitials(entry.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {entry.name}
                    </p>

                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone size={11} />
                      {entry.mobile}
                    </p>
                  </div>
                </div>

                {addressLines.length > 0 && (
                  <div className="flex items-start gap-1.5 text-xs text-slate-500 mt-3 pt-3 border-t border-slate-50">
                    <MapPin size={13} className="shrink-0 mt-0.5 text-slate-400" />

                    <div className="leading-relaxed">
                      {addressLines.map((line, i) => (
                        <p key={i}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* Products */}
              <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 space-y-3">

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Products
                </p>

                {entry.products.map((p) => (
                  <div key={p._id} className="flex items-center justify-between">

                    <div className="flex items-center gap-2.5 min-w-0">

                      <div className="bg-blue-50 p-2 rounded-lg shrink-0">
                        <Milk size={15} className="text-blue-600" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {p.name}
                        </p>

                        <p className="text-[11px] text-slate-400">
                          ₹{p.price}/{p.unit}
                        </p>
                      </div>

                    </div>


                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">
                        {p.quantity} {p.unit}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        ₹{(p.quantity * p.price).toLocaleString("en-IN")}
                      </p>
                    </div>

                  </div>
                ))}


                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <p className="text-sm font-semibold text-slate-600">
                    Today's Delivery
                  </p>

                  <p className="text-lg font-bold text-blue-600">
                    ₹{totalAmount.toLocaleString("en-IN")}
                  </p>
                </div>

              </div>

              {/* Actions */}
              <div className="flex gap-3 pb-2">

                <button
                  onClick={() => handleAction("skipped")}
                  disabled={isSubmitting}
                  className="flex-1 py-3 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 flex items-center justify-center gap-2"
                >

                  {isSubmitting
                    ? <Loader2 size={15} className="animate-spin"/>
                    : <XCircle size={15}/>
                  }

                  Skip

                </button>


                <button
                  onClick={() => handleAction("delivered")}
                  disabled={isSubmitting}
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >

                  {isSubmitting
                    ? <Loader2 size={15} className="animate-spin"/>
                    : <CheckCircle2 size={15}/>
                  }

                  Confirm Delivery

                </button>

              </div>


            </div>
          )}



        {/* ── Success ── */}
        {pageState === "success" && entry && (

          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">

            <div className="bg-emerald-50 p-4 rounded-full">
              <CheckCircle2 size={36} className="text-emerald-500"/>
            </div>


            <div>

              <p className="text-lg font-bold text-slate-900">
                Delivery Recorded
              </p>

              <p className="text-sm text-slate-500 mt-1 max-w-xs">
                {productSummary} delivered to {entry.name}.
              </p>

            </div>


            <div className="flex gap-3 mt-2">

              <button
                onClick={resetToScan}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5"
              >

                <QrCode size={15}/>
                Scan Next Customer

              </button>


              <button
                onClick={() => navigate("/dm")}
                className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600"
              >
                Dashboard
              </button>

            </div>


          </div>

        )}
        
          

        </div>
      </main>
    </div>
  );
}