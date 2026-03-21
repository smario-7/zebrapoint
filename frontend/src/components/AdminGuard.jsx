import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AdminGuard() {
  const { user, sessionChecked } = useAuthStore();

  if (!sessionChecked) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
