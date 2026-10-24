import { useUser } from "../hooks/useUser";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { Loader2, Milk } from "lucide-react";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children?: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="bg-blue-600 p-3 rounded-2xl shadow-md shadow-blue-200">
          <Milk size={28} className="text-white" />
        </div>
        <Loader2 size={24} className="text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}