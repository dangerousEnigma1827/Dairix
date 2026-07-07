import { MapPin, Home, Building2, Navigation, User, Phone, ArrowLeft, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function SignupPage2() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        houseNo: "",
        street: "",
        landmark: "",
        city: "",
        pincode: "",
        deliveryNotes: "",
        assignedDM: "",
    });


    const handleSubmit = () => {
        console.log(formData);

        // API call later
        navigate("/dashboard");
    };


    return (
        <div className="h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-6">

            <div className="w-full max-w-5xl h-[620px] rounded-3xl overflow-hidden bg-white shadow-2xl flex">

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
                <div className="flex-1 flex items-center justify-center px-10">

                    <div className="w-full max-w-md">

                        <h2 className="text-3xl font-bold text-slate-900">
                            Customer Details
                        </h2>

                        <p className="mt-2 mb-7 text-slate-500">
                            Complete delivery information
                        </p>


                        <div className="space-y-4">


                            {/* House No */}
                            <InputField
                                icon={<Home size={18}/>}
                                placeholder="House / Flat No"
                                value={formData.houseNo}
                                onChange={(value)=>setFormData({...formData,houseNo:value})}
                            />


                            {/* Street */}
                            <InputField
                                icon={<MapPin size={18}/>}
                                placeholder="Street / Area"
                                value={formData.street}
                                onChange={(value)=>setFormData({...formData,street:value})}
                            />


                            {/* Landmark */}
                            <InputField
                                icon={<Navigation size={18}/>}
                                placeholder="Landmark (optional)"
                                value={formData.landmark}
                                onChange={(value)=>setFormData({...formData,landmark:value})}/>


                            <div className="grid grid-cols-2 gap-4">
                                <InputField
                                    icon={<Building2 size={18}/>}
                                    placeholder="City"
                                    value={formData.city}
                                    onChange={(value)=>setFormData({...formData,city:value})}/>
                                <InputField
                                    icon={<MapPin size={18}/>}
                                    placeholder="Pincode"
                                    value={formData.pincode}
                                    onChange={(value)=>setFormData({...formData,pincode:value})}/>
                            </div>



                            {/* Delivery Notes */}
                            <textarea
                                placeholder="Delivery Notes (optional)"
                                value={formData.deliveryNotes}
                                onChange={(e)=>setFormData({
                                    ...formData,
                                    deliveryNotes:e.target.value
                                })}
                                className="
                                w-full rounded-lg border border-slate-300 
                                px-4 py-3 text-sm outline-none resize-none
                                transition focus:border-blue-600
                                focus:ring-2 focus:ring-blue-200
                                "
                                rows={3}
                            />

                            {/* Buttons */}
                            <div className="flex gap-3 pt-2">


                                <button
                                    onClick={()=>navigate(-1)}
                                    className="
                                    flex-1 flex items-center justify-center gap-2
                                    rounded-lg border border-slate-300
                                    py-3 font-semibold text-slate-700
                                    hover:bg-slate-100 transition
                                    "
                                >
                                    <ArrowLeft size={18}/>
                                    Back
                                </button>

                                <button
                                    onClick={handleSubmit}
                                    className="
                                    flex-1 flex items-center justify-center gap-2
                                    rounded-lg bg-blue-600 py-3
                                    font-semibold text-white
                                    hover:bg-blue-700 transition
                                    "
                                >
                                    Create
                                    <Check size={18}/>
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
    icon:React.ReactNode;
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

    )
}


export default SignupPage2;