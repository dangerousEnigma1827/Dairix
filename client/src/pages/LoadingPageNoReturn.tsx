import { Loader2 } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function LoadingPageNoReturn() {

    return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-100">

            <div className="flex flex-col items-center gap-4">

                <div className="bg-blue-600 text-white p-5 rounded-full shadow-lg animate-pulse">
                    <Loader2 size={34} className="animate-spin" />
                </div>

                <h1 className="text-xl font-semibold text-slate-700">
                    Loading...
                </h1>

                <p className="text-sm text-slate-500">
                    Please wait while we prepare your dashboard
                </p>

            </div>

        </div>
    );
}

export default LoadingPageNoReturn;