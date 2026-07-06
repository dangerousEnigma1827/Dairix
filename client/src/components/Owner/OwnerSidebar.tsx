import { Boxes, LayoutDashboard, Milk } from "lucide-react";
import { NavLink } from "react-router-dom";

function OwnerSidebar() {
    return (
        <aside className="hidden md:flex md:w-64 min-h-dvh bg-blue-600 text-white flex-col shadow-xl">
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
                        ${
                            isActive
                                ? "bg-white text-blue-600 shadow-md"
                                : "text-white hover:bg-blue-500"
                        }`
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
                        ${
                            isActive
                                ? "bg-white text-blue-600 shadow-md"
                                : "text-white hover:bg-blue-500"
                        }`
                    }
                >
                    <Boxes size={20} />
                    <span>Products</span>
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