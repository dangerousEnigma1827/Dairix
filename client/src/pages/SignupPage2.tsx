import { MapPin, Home, Building2, Navigation, ArrowLeft, Check, Loader2, Crosshair, AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";
import { registerService } from "../api/Services/AuthServices";
import { useState } from "react";
import { useUser } from "../hooks/useUser";

type formDataType = {
    name: string;
    mobile: string;
    password: string;
    confirmPassword: string;

    address: {
        houseNo: string;
        street: string;
        landmark: string;
        city: string;
        pincode: string;
        latitude?: number | null;
        longitude?: number | null;
    };

    deliveryNotes: string;
};

interface SignupPage2Props {
    step:number,
    setStep: React.Dispatch<React.SetStateAction<number>>;
    formData: formDataType;
    setFormData: React.Dispatch<React.SetStateAction<formDataType>>;
}


function SignupPage2({
    step,
    setStep,
    formData,
    setFormData
}: SignupPage2Props) {

    const navigate = useNavigate();
    const [loading, setLoading]=useState(false);
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            const msg = "Geolocation is not supported by your browser.";
            setGpsError(msg);
            toast(msg, { style: { background: "#DC2626", color: "#fff" } });
            return;
        }

        setGpsLoading(true);
        setGpsError(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = Number(pos.coords.latitude.toFixed(6));
                const lng = Number(pos.coords.longitude.toFixed(6));
                const acc = Math.round(pos.coords.accuracy);

                setFormData((prev) => ({
                    ...prev,
                    address: {
                        ...prev.address,
                        latitude: lat,
                        longitude: lng,
                    },
                }));
                setGpsAccuracy(acc);
                setGpsLoading(false);
                toast(`GPS Location captured (accuracy ±${acc}m)`, {
                    style: { background: "#10B981", color: "#fff" },
                });
            },
            (err) => {
                setGpsLoading(false);
                let message = "Unable to retrieve your location.";
                if (err.code === 1) {
                    message = "Location permission denied. Please enable location access in browser.";
                } else if (err.code === 2) {
                    message = "Location unavailable. Please verify GPS or enter address manually.";
                } else if (err.code === 3) {
                    message = "Location request timed out. Please try again.";
                }
                setGpsError(message);
                toast(message, { style: { background: "#DC2626", color: "#fff" } });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    const handleClearLocation = () => {
        setFormData((prev) => ({
            ...prev,
            address: {
                ...prev.address,
                latitude: null,
                longitude: null,
            },
        }));
        setGpsAccuracy(null);
        setGpsError(null);
    };

    const updateAddress = (
        field: keyof formDataType["address"],
        value: string
    ) => {
        setFormData((prev) => ({
            ...prev,
            address: {
                ...prev.address,
                [field]: value
            }
        }));
    };


    const validate = () => {
        const pincodeRegex = /^[1-9][0-9]{5}$/;
        if(
            !formData.address.houseNo ||
            !formData.address.street ||
            !formData.address.city ||
            !formData.address.pincode
        ){
            toast(`Kindly Fill All Required Address Fields!`, {
                style: { background: "#2563EB", color: "#fff" },
            });

            return false;
        }

        else if(!pincodeRegex.test(formData.address.pincode)){
            toast(`Enter A Valid Pincode!`, {
                style: { background: "#2563EB", color: "#fff" },
            });
            return false;
        }
        return true;
    };



    const { setUser } = useUser();

    const handleSubmit = async () => {
        if(!validate()){
            return;
        }

        setLoading(true);

        try{
            const req = await registerService(formData);
            const newUser = req?.user || req;
            if (newUser) {
                setUser(newUser);
            }

            toast(`Created Account Successfully`, {
                style: { background: "#2563EB", color: "#fff" },
            });

            navigate("/customer", { replace: true });

        }catch(err:any){
            console.log("error occured while submitting ",err);
            const msg = err?.response?.data?.message || "Error creating account";
            toast(msg, {
                style: { background: "#2563EB", color: "#fff" },
            });
        }finally{
            setLoading(false);
        }
    };



    return (
        <div className="h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-6">

            <div className="w-full max-w-5xl min-h-[620px] max-h-[95vh] rounded-3xl overflow-hidden bg-white shadow-2xl flex">

                {/* Left Panel */}
                <div className="hidden md:flex w-2/5 bg-blue-600 text-white items-center justify-center p-12">

                    <div>
                        <h1 className="text-5xl font-bold">
                            Dairix
                        </h1>

                        <p className="mt-5 text-blue-100 leading-7">
                            Modern dairy management platform for customers,
                            delivery partners, and owners.
                        </p>
                    </div>

                </div>



                {/* Right Section */}
                <div className="flex-1 flex items-center justify-center px-10 py-6 overflow-y-auto">

                    <div className="w-full max-w-md my-auto">

                        <h2 className="text-3xl font-bold text-slate-900">
                            Customer Details
                        </h2>

                        <p className="mt-2 mb-5 text-slate-500">
                            Complete delivery information
                        </p>


                        <div className="space-y-3.5">


                            <InputField
                                icon={<Home size={18}/>}
                                placeholder="House / Flat No"
                                value={formData.address.houseNo}
                                onChange={(value)=>
                                    updateAddress("houseNo", value)
                                }
                            />


                            <InputField
                                icon={<MapPin size={18}/>}
                                placeholder="Street / Area"
                                value={formData.address.street}
                                onChange={(value)=>
                                    updateAddress("street", value)
                                }
                            />


                            <InputField
                                icon={<Navigation size={18}/>}
                                placeholder="Landmark (optional)"
                                value={formData.address.landmark}
                                onChange={(value)=>
                                    updateAddress("landmark", value)
                                }
                            />



                            <div className="grid grid-cols-2 gap-4">

                                <InputField
                                    icon={<Building2 size={18}/>}
                                    placeholder="City"
                                    value={formData.address.city}
                                    onChange={(value)=>
                                        updateAddress("city", value)
                                    }
                                />


                                <InputField
                                    icon={<MapPin size={18}/>}
                                    placeholder="Pincode"
                                    value={formData.address.pincode}
                                    onChange={(value)=>
                                        updateAddress("pincode", value)
                                    }
                                />

                            </div>

                            {/* GPS Location Section */}
                            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/50 p-3.5 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                                            <Crosshair size={15} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800">Delivery GPS Pin</p>
                                            <p className="text-[11px] text-slate-500">Helps delivery partner navigate accurately</p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={handleDetectLocation}
                                        disabled={gpsLoading}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
                                    >
                                        {gpsLoading ? (
                                            <>
                                                <Loader2 size={13} className="animate-spin" />
                                                Detecting...
                                            </>
                                        ) : (
                                            <>
                                                <Crosshair size={13} />
                                                Detect GPS
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Detected Coordinates Badge */}
                                {formData.address.latitude && formData.address.longitude ? (
                                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs">
                                        <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                                            <Check size={14} className="text-emerald-600 shrink-0" />
                                            <span>
                                                GPS: {formData.address.latitude.toFixed(4)}°, {formData.address.longitude.toFixed(4)}°
                                                {gpsAccuracy ? ` (±${gpsAccuracy}m)` : ""}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleClearLocation}
                                            className="text-slate-400 hover:text-slate-600 p-0.5"
                                            title="Remove GPS coordinates"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : gpsError ? (
                                    <div className="flex items-start gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-700">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-500" />
                                        <span className="flex-1 text-[11px] leading-tight">{gpsError}</span>
                                    </div>
                                ) : null}
                            </div>

                            <textarea
                                placeholder="Delivery Notes (optional)"
                                value={formData.deliveryNotes}
                                onChange={(e)=>
                                    setFormData((prev)=>({
                                        ...prev,
                                        deliveryNotes:e.target.value
                                    }))
                                }
                                className="
                                w-full rounded-lg border border-slate-300
                                px-4 py-2.5 text-sm outline-none resize-none
                                transition focus:border-blue-600
                                focus:ring-2 focus:ring-blue-200
                                "
                                rows={2}
                            />



                            <div className="flex gap-3 pt-1">


                                <button
                                    onClick={()=>setStep(1)}
                                    className="
                                    flex-1 flex items-center justify-center gap-2
                                    rounded-lg border border-slate-300
                                    py-2.5 font-semibold text-slate-700
                                    hover:bg-slate-100 transition
                                    "
                                >
                                    <ArrowLeft size={18}/>
                                    Back
                                </button>



                                <button
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="
                                    flex-1 flex items-center justify-center gap-2
                                    rounded-lg bg-blue-600 py-2.5
                                    font-semibold text-white
                                    hover:bg-blue-700 transition disabled:opacity-50
                                    "
                                >
                                    {loading ? (
                                        <Loader2 size={18} className="animate-spin" />
                                    ) : (
                                        <>
                                            Create <Check size={18} />
                                        </>
                                    )}
                                </button>


                            </div>


                        </div>

                    </div>

                </div>

            </div>

        </div>
    );
}



function InputField({
    icon,
    placeholder,
    value,
    onChange
}:{
    icon: React.ReactNode;
    placeholder:string;
    value:string;
    onChange:(value:string)=>void;
}){

    return (

        <div className="relative">

            <div className="
            absolute left-4 top-1/2 
            -translate-y-1/2 text-blue-600
            ">
                {icon}
            </div>


            <input
                value={value}
                onChange={(e)=>onChange(e.target.value)}
                placeholder={placeholder}
                className="
                w-full rounded-lg border border-slate-300
                py-3 pl-12 pr-4 text-sm
                outline-none transition
                focus:border-blue-600
                focus:ring-2 focus:ring-blue-200
                "
            />

        </div>

    );
}


export default SignupPage2;