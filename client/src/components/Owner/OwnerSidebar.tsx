import { 
    Boxes, 
    LayoutDashboard, 
    Milk, 
    Users, 
    Truck, 
    UserCog, 
    CreditCard,
    LogOut
} from "lucide-react";

import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";

import { logoutService } from "../../api/Services/AuthServices";
import LogoutModal from "../../pages/LogoutModal";

function OwnerSidebar() {

    const navigate = useNavigate();

    const [logoutOpen, setLogoutOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);


    const handleLogout = async () => {
        try {

            setLogoutLoading(true);

            await logoutService();

            navigate("/login", {
                replace:true
            });

        } catch(err) {
            console.error("Logout failed",err);
        } finally {
            setLogoutLoading(false);
            setLogoutOpen(false);
        }
    };


    return (
        <aside className="hidden md:flex w-64 h-screen bg-blue-600 text-white flex-col shadow-xl sticky top-0">

            <LogoutModal
                open={logoutOpen}
                onClose={() => setLogoutOpen(false)}
                onConfirm={handleLogout}
                loading={logoutLoading}
            />


            {/* Logo */}
            <div className="px-6 py-5 border-b border-blue-500 flex items-center gap-3">

                <div className="bg-white text-blue-600 p-2 rounded-lg">
                    <Milk size={22}/>
                </div>

                <div>
                    <h1 className="text-2xl font-bold tracking-wide leading-tight">
                        Dairix
                    </h1>

                    <p className="text-xs text-blue-100">
                        Owner Panel
                    </p>
                </div>

            </div>


            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-2">


                <NavLink
                    to="/owner"
                    end
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <LayoutDashboard size={20}/>
                    Dashboard
                </NavLink>



                <NavLink
                    to="/owner/products"
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <Boxes size={20}/>
                    Products
                </NavLink>



                <NavLink
                    to="/owner/customers"
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <Users size={20}/>
                    Customers
                </NavLink>



                <NavLink
                    to="/owner/deliveries"
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <Truck size={20}/>
                    Deliveries
                </NavLink>



                <NavLink
                    to="/owner/delivery-staff"
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <UserCog size={20}/>
                    Delivery Staff
                </NavLink>



                <NavLink
                    to="/owner/payments"
                    className={({isActive}) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all
                        ${
                            isActive
                            ? "bg-white text-blue-600 shadow-md"
                            : "hover:bg-blue-500"
                        }`
                    }
                >
                    <CreditCard size={20}/>
                    Payments
                </NavLink>


            </nav>



            {/* Bottom section */}
            <div className="px-4 pb-5 space-y-3">


                {/* Logout */}
                <button
                    onClick={() => setLogoutOpen(true)}
                    className="
                    w-full
                    flex items-center gap-3
                    px-4 py-3
                    rounded-xl
                    text-sm
                    font-medium
                    text-white
                    hover:bg-blue-500
                    transition-all
                    "
                >
                    <LogOut size={20}/>
                    Logout
                </button>


                <div className="border-t border-blue-500 pt-4 px-2">
                    <p className="text-xs text-blue-100">
                        Dairix v1.0
                    </p>
                </div>


            </div>


        </aside>
    );
}


export default OwnerSidebar;