import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./store/authStore";

import LandingPage  from "./pages/LandingPage";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard    from "./pages/Dashboard";
import SymptomsForm from "./pages/SymptomsForm";
import GroupPage    from "./pages/GroupPage";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  const { isAuthenticated, fetchMe } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchMe();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/symptoms/new" element={<SymptomsForm />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
