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

//pages
import LoadingPageNoReturn from "../LoadingPageNoReturn";

//types import
import type { AddressType } from "../../Types/Customer";
//services
import { currUserService } from "../../api/Services/AuthServices";

//misc
import { QRCodeCanvas } from "qrcode.react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Address = AddressType

type ProductType = {
  name:string,
  price:number,
  unit:string,
  image:string,
  quantity:number
}

type CustomerType = {
  _id:string;
  name: string;
  mobile: string;
  address: Address
  assignedDm: { name: string; mobile: string } | null;
  products?: ProductType[];
};


export default function CustomerQRPage() {
    const navigate = useNavigate();
    //states
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState({
        customerLoading:false
    })
    const [customer, setCustomer]=useState<CustomerType | null>(null)

    const handleDownload= async ()=>{
        const canvas = document.getElementById('canvasId') as HTMLCanvasElement

        const imageUrl = canvas.toDataURL()
        const a = document.createElement('a')
        a.href=imageUrl
        a.download="qr-code.png"
        a.click()
    }

    const handleGetCurrentUser = async () =>{
      setLoading((prev)=>{
        return {...prev, customerLoading:true}
      })
  
      try{
        let req = await currUserService()
        console.log(req)
        setCustomer(req)
      }catch(err:any){
        console.log("error getting customer details",err)
      }finally{
        setLoading((prev)=>{
          return {...prev, customerLoading:false}
        })
      }
    }
  
    useEffect(()=>{
      handleGetCurrentUser()
    },[])

    if(loading.customerLoading || !customer){
        return <LoadingPageNoReturn/>
    }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

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

          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-6 flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Your unique QR code
            </p>
            <p className="text-sm text-slate-500 text-center mb-6">
              Show or stick this at your door entry
            </p>

            <div className="relative">
              <QRCodeCanvas
                id="canvasId"
                value={customer?._id}
                size={200}/>
            </div>
           

            {/* Action buttons */}
            <div className="flex gap-3 mt-6 w-full">
                <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                onClick={handleDownload}>
                <Download size={16} />
                Save PNG
                </button>

                <button
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition-all">
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
                
            </div>
          </div>

          {/* ── Linked account info ── */}
          {
            customer ? 
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
                  <p className="text-sm font-semibold text-slate-800">{customer?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Mobile (encoded in QR)</p>
                  <p className="text-sm font-semibold text-slate-800">{customer?.mobile}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                  <MapPin size={15} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-400">Address</p>
                  <p className="text-sm font-semibold text-slate-800">
                    {customer?.address.houseNo}, {customer?.address.street},{" "}
                    {customer?.address.city}
                  </p>
                </div>
              </div>
            </div>
          </div>

          :

          <div className="bg-white rounded-2xl ring-1 flex flex-col gap-5 ring-slate-100 shadow-sm p-4 flex justify-center items-center">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Loading User Info
            </p>
            <Loader2 className="animate-spin text-blue-600 " size={30}/>
          </div>
          }


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