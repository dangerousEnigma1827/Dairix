import { Outlet } from "react-router-dom";
import OwnerSidebar from "../../components/Owner/OwnerSidebar";

function OwnerLayout() {
    return (
        <div className="flex min-h-screen bg-slate-100">
            <OwnerSidebar />

            <div className="flex-1 overflow-y-auto">
                <Outlet />
            </div>
        </div>
    );
}

export default OwnerLayout;