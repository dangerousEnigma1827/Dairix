import { useUser } from "../hooks/useUser";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { user, loading } = useUser();
  if (!user) {
    return <Navigate to="/login" />;
  }

  console.log(user)

  console.log(user?.role, " ", allowedRoles.includes(user?.role), " ", allowedRoles)

  if (loading) return <Navigate to="/loading"/>

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
}