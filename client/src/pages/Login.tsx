import { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import toast from "react-hot-toast";

function Login() {
  const [showPin, setShowPin] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    mobile: "",
    password: "",
  });

  const [loading, setLoading]=useState(false);

  const handleLogin = async () => {
    setLoading(true)
    try {
      const res = await api.post("/auth/login", {
        mobile: formData.mobile,
        password: formData.password,
      });

      const user = res.data.data.user;

      console.log(user.role)
      if (user.role === "owner"){
        console.log("navigating1")
        navigate("/owner");
        toast("Logged In Successfully", {
          style: { background: "#2563EB", color: "#fff" },
        });
      }
      else if(user.role === "dm"){
        navigate("/dm");
        toast("Logged In Successfully", {
          style: { background: "#2563EB", color: "#fff" },
        });
      }
      else{
        navigate("/customer");
        toast("Logged In Successfully", {
          style: { background: "#2563EB", color: "#fff" },
        });
      }
      
    } catch (err:any) {
      console.log("LOGIN ERROR:", err.response?.data);
      toast(err.response?.data, {
          style: { background: "#2563EB", color: "#fff" },
      });
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl h-[620px] overflow-hidden rounded-3xl bg-white shadow-2xl flex">

        <div className="hidden md:flex w-2/5 bg-blue-600 text-white items-center justify-center p-12">
          <div>
            <h1 className="text-5xl font-bold">Dairix</h1>
            <p className="mt-5 text-blue-100 leading-7">
              Modern dairy management platform for customers, delivery partners, and owners.
            </p>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-10">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-slate-900">Welcome Back</h2>
            <p className="mt-2 mb-8 text-slate-500">Sign in to continue</p>

            <div className="space-y-5">

              {/* MOBILE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone Number
                </label>

                <div className="relative">
                  <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />

                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        mobile: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Password
                </label>

                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" />

                  <input
                    type={showPin ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-12 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-200"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
                  >
                    {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* BUTTON */}
              <button
                onClick={handleLogin}
                className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition flex justify-center items-center hover:bg-blue-700"
              >
                {!loading ? "Sign In" : <Loader2/>}
              </button>

              {/* NAV */}
              <p className="text-center text-sm text-slate-500">
                Don't have an account?{" "}
                <button
                  className="font-semibold text-blue-600 hover:text-blue-700"
                  onClick={() => navigate("/register")}
                >
                  Register
                </button>
              </p>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;