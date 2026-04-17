import { BrowserRouter, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import useAuthStore from "./store/authStore";
import useThemeStore from "./store/themeStore";

import LandingPage  from "./pages/LandingPage";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard    from "./pages/Dashboard";
import SymptomsForm from "./pages/SymptomsForm";
import GroupPage    from "./pages/GroupPage";
import GroupsPage   from "./pages/GroupsPage";
import ProfilePage  from "./pages/ProfilePage";
import ForumPage    from "./pages/ForumPage";
import PostDetailPage from "./pages/PostDetailPage";
import MessagesPage     from "./pages/MessagesPage";
import ConversationPage from "./pages/ConversationPage";
import TopicsPage from "./pages/TopicsPage";
import TopicChatPage from "./pages/TopicChatPage";
import Onboarding from "./pages/Onboarding";
import Lenses from "./pages/Lenses";
import MyPosts from "./pages/MyPosts";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContent from "./pages/admin/AdminContent";
import AdminLenses from "./pages/admin/AdminLenses";
import AdminOrphanet from "./pages/admin/AdminOrphanet";
import AdminProposals from "./pages/admin/AdminProposals";

import ProtectedRoute from "./components/ProtectedRoute";
import OnboardingGuard from "./components/OnboardingGuard";
import AdminGuard     from "./components/AdminGuard";
import AnimatedRoutes from "./components/motion/AnimatedRoutes";
import RouteTransition from "./components/motion/RouteTransition";

function withTransition(element) {
  return <RouteTransition>{element}</RouteTransition>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const { isAuthenticated, user, fetchMe, logout } = useAuthStore();
  const postAuthPath = user?.onboarding_completed === false ? "/onboarding" : "/dashboard";
  const dark = useThemeStore((s) => s.dark);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("transition-colors", "duration-300");
    if (dark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [dark]);

  useEffect(() => {
    const onUnauthorized = () => {
      logout();
      navigate("/login", { replace: true });
    };
    window.addEventListener("zp:unauthorized", onUnauthorized);
    return () => window.removeEventListener("zp:unauthorized", onUnauthorized);
  }, [navigate, logout]);

  return (
    <AnimatedRoutes>
      <Route path="/"         element={withTransition(<LandingPage />)} />
      <Route path="/login"    element={
        isAuthenticated ? <Navigate to={postAuthPath} replace /> : withTransition(<LoginPage />)
      } />
      <Route path="/register" element={
        isAuthenticated ? <Navigate to={postAuthPath} replace /> : withTransition(<RegisterPage />)
      } />

      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGuard />}>
          <Route path="/onboarding" element={withTransition(<Onboarding />)} />
          <Route path="/dashboard" element={withTransition(<Dashboard />)} />
          <Route path="/groups" element={withTransition(<GroupsPage />)} />
          <Route path="/profile" element={withTransition(<ProfilePage />)} />
          <Route path="/symptoms/new" element={withTransition(<SymptomsForm />)} />
          <Route path="/groups/:groupId" element={withTransition(<GroupPage />)} />
          <Route path="/groups/:groupId/forum" element={withTransition(<ForumPage />)} />
          <Route path="/groups/:groupId/posts/:postId" element={withTransition(<PostDetailPage />)} />
          <Route path="/messages" element={withTransition(<MessagesPage />)} />
          <Route path="/messages/:conversationId" element={withTransition(<ConversationPage />)} />
          <Route path="/topics" element={withTransition(<TopicsPage />)} />
          <Route path="/topics/:chatId" element={withTransition(<TopicChatPage />)} />
          <Route path="/lenses" element={withTransition(<Lenses />)} />
          <Route path="/my-posts" element={withTransition(<MyPosts />)} />
        </Route>
      </Route>

      <Route path="/admin" element={<AdminGuard />}>
        <Route element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="content" element={<AdminContent />} />
          <Route path="lenses" element={<AdminLenses />} />
          <Route path="orphanet" element={<AdminOrphanet />} />
          <Route path="proposals" element={<AdminProposals />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </AnimatedRoutes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
