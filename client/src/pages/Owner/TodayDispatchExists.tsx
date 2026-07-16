import {
  CheckCircle2,
  Truck,
  Users,
  Milk,
  ArrowRight
} from "lucide-react";


export default function TodayDispatchExists(){

return (
<div className="min-h-screen bg-slate-50 flex items-center justify-center">

    <div className="bg-white border rounded-2xl p-8 w-[420px] text-center">

    <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
    <CheckCircle2 
    size={35}
    className="text-emerald-600"
    />
    </div>


    <h1 className="text-xl font-bold mt-5 text-slate-900">
    Today's Dispatch Created
    </h1>


    <p className="text-sm text-slate-500 mt-2">
    Morning milk allocation has already been sent to delivery men.
    </p>


    <div className="grid grid-cols-2 gap-3 mt-6">

    <div className="bg-slate-50 rounded-xl p-4">
    <Users className="mx-auto text-blue-600"/>
    <p className="font-bold mt-2">
    5
    </p>
    <p className="text-xs text-slate-500">
    Delivery Men
    </p>
    </div>


    <div className="bg-slate-50 rounded-xl p-4">
    <Milk className="mx-auto text-blue-600"/>
    <p className="font-bold mt-2">
    120 L
    </p>
    <p className="text-xs text-slate-500">
    Total Milk
    </p>
    </div>

    </div>


    <button
    className="
    mt-6 w-full
    bg-blue-600
    text-white
    py-3
    rounded-xl
    font-semibold
    flex items-center justify-center gap-2
    "
    >
    View Dispatch
    <ArrowRight size={16}/>
    </button>


    <button
    className="
    mt-3 w-full
    border
    py-3
    rounded-xl
    font-semibold
    text-slate-600
    "
    >
    View Delivery Status
    </button>


    </div>

</div>
)

}