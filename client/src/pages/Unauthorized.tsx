import { ShieldX, ArrowLeft } from "lucide-react";
import { useNavigate, useRouteError, isRouteErrorResponse } from "react-router-dom";

type Props = {
    code?: number;
    message?: string;
};

function Unauthorized({ code = 403, message = "You are not authorized to access this page." }: Props) {
    const navigate = useNavigate();
    // const error = useRouteError();

    let statusCode = code;
    let errorMessage = message;

    // if (isRouteErrorResponse(error)) {
    //     statusCode = error.status;
    //     errorMessage = error.statusText || message;
    // }

    return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-100 p-6">

            <div className="bg-white shadow-2xl rounded-3xl p-10 max-w-md w-full text-center border-t-8 border-blue-600">

                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg">
                        <ShieldX size={32} />
                    </div>
                </div>

                {/* Status Code */}
                <h1 className="text-6xl font-bold text-blue-600">
                    {statusCode}
                </h1>

                {/* Title */}
                <h2 className="text-2xl font-semibold text-slate-800 mt-4">
                    Access Denied
                </h2>

                {/* Message */}
                <p className="text-slate-500 mt-3 leading-6">
                    {errorMessage}
                </p>

                {/* Actions */}
                <div className="mt-8 flex flex-col gap-3">

                    <button
                        onClick={() => navigate('/login')}
                        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl transition cursor-pointer"
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>

                    {/* <button
                        onClick={() => navigate("/login")}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        Go to Login
                    </button> */}

                </div>

            </div>
        </div>
    );
}

export default Unauthorized;