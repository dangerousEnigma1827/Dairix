import { useState } from "react";
import { Eye, EyeOff, Lock, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../api/api";

function Signup() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData]=useState({
        name: "",
        mobile: "",
        password: "",
        confirmPassword: "",
    })

    const navigate=useNavigate()

    const sendData = async () => {
        if(formData.password != formData.confirmPassword){
            alert("incorrect confirm password");return;
        }

        let req = await api.post('/auth/signup', {
            name:formData.name,
            mobile:formData.mobile,
            password:formData.password
        });
        
        console.log("sent")
    }

    return (
        <div className="h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl h-[620px] rounded-3xl overflow-hidden bg-white shadow-2xl flex">
            <div className="hidden md:flex w-2/5 bg-blue-600 text-white items-center justify-center p-12">
            <div>
                <h1 className="text-5xl font-bold">Dairix</h1>

                <p className="mt-5 text-blue-100 leading-7">
                Modern dairy management platform for customers, delivery partners,
                and owners.
                </p>
            </div>
            </div>

            <div className="flex-1 flex items-center justify-center px-10">
            <div className="w-full max-w-md">
                <h2 className="text-3xl font-bold text-slate-900">
                Create Account
                </h2>

                <p className="mt-2 mb-8 text-slate-500">
                reg your account
                </p>

                <div className="space-y-5">
                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                    Full Name
                    </label>

                    <div className="relative">
                    <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                    />

                    <input
                        type="text"
                        placeholder="John Doe"
                        className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        value={formData.name}
                        onChange={(e)=>{
                            setFormData((prev) => ({
                                ...prev,
                                name: e.target.value,
                            }));
                        }}
                    />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone Number
                    </label>

                    <div className="relative">
                    <Phone
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                    />

                    <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        value={formData.mobile}
                        onChange={(e)=>{
                            setFormData((prev) => ({
                                ...prev,
                                mobile: e.target.value,
                            }));
                        }}
                    />
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                    </label>

                    <div className="relative">
                    <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                    />

                    <input
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        placeholder="Create a password"
                        className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        onChange={(e)=>{
                            setFormData((prev) => ({
                                ...prev,
                                password: e.target.value,
                            }));
                        }}
                    />

                    <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    </div>
                </div>

                <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                    Confirm Password
                    </label>

                    <div className="relative">
                    <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"
                    />

                    <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        placeholder="Confirm your password"
                        className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                        onChange={(e)=>{
                            setFormData((prev) => ({
                                ...prev,
                                confirmPassword: e.target.value,
                            }));
                        }}
                    />

                    <button
                        type="button"
                        onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                    >
                        {showConfirmPassword ? (
                        <EyeOff size={18} />
                        ) : (
                        <Eye size={18} />
                        )}
                    </button>
                    </div>
                </div>

                <button className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700" onClick={(e)=>{sendData()}}>
                    Continue
                </button>

                <p className="text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <button className="font-semibold text-blue-600 hover:text-blue-700" onClick={(e)=>{
                        navigate('/login')
                    }}>
                    Sign In
                    </button>
                </p>
                </div>
            </div>
            </div>
        </div>
        </div>
    );
}

export default Signup;