import { Boxes, LayoutDashboard, Milk, Users, Truck, UserCog, CreditCard } from "lucide-react";
import { NavLink } from "react-router-dom";

function OwnerSidebar() {
    return (
        <aside className="hidden md:flex w-64 h-screen bg-blue-600 text-white flex-col shadow-xl sticky top-0">
            
            {/* Logo */}
            <div className="px-6 py-5 border-b border-blue-500 flex items-center gap-3">
                <div className="bg-white text-blue-600 p-2 rounded-lg">
                    <Milk size={22} />
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

                {/* Dashboard */}
                <NavLink
                    to="/owner"
                    end
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <LayoutDashboard size={20} />
                    <span>Dashboard</span>
                </NavLink>

                {/* Products */}
                <NavLink
                    to="/owner/products"
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <Boxes size={20} />
                    <span>Products</span>
                </NavLink>

                {/* Customers */}
                <NavLink
                    to="/owner/customers"
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <Users size={20} />
                    <span>Customers</span>
                </NavLink>

                {/* Deliveries (Dispatch System) */}
                <NavLink
                    to="/owner/deliveries"
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <Truck size={20} />
                    <span>Deliveries</span>
                </NavLink>

                {/* Delivery Staff (DMs) */}
                <NavLink
                    to="/owner/delivery-staff"
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <UserCog size={20} />
                    <span>Delivery Staff</span> 
                </NavLink>

                {/* Payments */}
                <NavLink
                    to="/owner/payments"
                    className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                        ${isActive ? "bg-white text-blue-600 shadow-md" : "text-white hover:bg-blue-500"}`
                    }
                >
                    <CreditCard size={20} />
                    <span>Payments</span>
                </NavLink>

            </nav>

            {/* Footer */}
            <div className="border-t border-blue-500 px-6 py-4">
                <p className="text-xs text-blue-100">
                    Dairix v1.0
                </p>
            </div>

        </aside>
    );
}

export default OwnerSidebar;