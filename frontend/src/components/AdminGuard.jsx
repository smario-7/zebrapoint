import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function AdminGuard() {
  const { user } = useAuthStore();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
