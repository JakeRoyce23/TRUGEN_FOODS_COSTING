import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-context";

export function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.loading) return <p role="status" className="p-8 text-center">Restoring your session…</p>;
  if (!auth.user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet key={auth.user.id} />;
}
