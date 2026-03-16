import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./store/authStore";

import LandingPage  from "./pages/LandingPage";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard    from "./pages/Dashboard";
import SymptomsForm from "./pages/SymptomsForm";
import GroupPage    from "./pages/GroupPage";
import ProfilePage  from "./pages/ProfilePage";
import ForumPage    from "./pages/ForumPage";
import PostDetailPage from "./pages/PostDetailPage";
import AdminLayout    from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminReports   from "./pages/admin/AdminReports";
import AdminUsers     from "./pages/admin/AdminUsers";
import AdminGroups    from "./pages/admin/AdminGroups";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminGuard     from "./components/AdminGuard";

export default function App() {
  const { token, fetchMe } = useAuthStore();

  useEffect(() => {
    if (token) {
      fetchMe();
    }
  }, [token, fetchMe]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"         element={<LandingPage />} />
        <Route path="/login"    element={
          token ? <Navigate to="/dashboard" replace /> : <LoginPage />
        } />
        <Route path="/register" element={
          token ? <Navigate to="/dashboard" replace /> : <RegisterPage />
        } />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/profile"     element={<ProfilePage />} />
          <Route path="/symptoms/new" element={<SymptomsForm />} />
          <Route path="/groups/:groupId" element={<GroupPage />} />
          <Route path="/groups/:groupId/forum" element={<ForumPage />} />
          <Route path="/groups/:groupId/posts/:postId" element={<PostDetailPage />} />
        </Route>

        <Route path="/admin" element={<AdminGuard />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="groups" element={<AdminGroups />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
