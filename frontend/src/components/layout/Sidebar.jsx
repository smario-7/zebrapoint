import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Hash,
  Mail,
  User,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import useThemeStore from "../../store/themeStore";
import Avatar from "../ui/Avatar";
import LogoBrand from "../ui/LogoBrand";
import useBootstrapStore from "../../store/bootstrapStore";
import UnreadBadge from "./UnreadBadge";
import MobileBottomBar from "./MobileBottomBar";

function NavLink({ to, icon, label, isActive }) {
  const IconComponent = icon;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
        isActive
          ? "bg-slate-700 text-white"
          : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
      }`}
    >
      <IconComponent className="w-5 h-5 shrink-0" aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

function NavLinkWithBadge({ to, icon, label, isActive }) {
  const IconComponent = icon;
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
        isActive
          ? "bg-slate-700 text-white"
          : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
      }`}
    >
      <span className="relative">
        <IconComponent className="w-5 h-5 shrink-0" aria-hidden />
        <UnreadBadge />
      </span>
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const { t, i18n } = useTranslation("common");
  const { user, logout } = useAuthStore();
  const startUnreadPolling = useBootstrapStore((s) => s.startUnreadPolling);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    startUnreadPolling();
  }, [startUnreadPolling]);

  const handleLogout = () => {
    logout();
    toast.success(t("logoutSuccess"));
    navigate("/login");
  };

  const isActive = (path) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    if (path === "/lenses") return location.pathname === "/lenses";
    if (path === "/my-posts") return location.pathname === "/my-posts";
    if (path === "/topics") return location.pathname.startsWith("/topics");
    if (path === "/admin") return location.pathname.startsWith("/admin");
    if (path === "/messages") return location.pathname.startsWith("/messages");
    if (path === "/profile") return location.pathname === "/profile";
    return false;
  };

  const desktopNav = (
    <>
      <NavLink
        to="/dashboard"
        icon={LayoutDashboard}
        label={t("nav.dashboard")}
        isActive={isActive("/dashboard")}
      />
      <NavLink
        to="/lenses"
        icon={Layers}
        label={t("nav.lenses")}
        isActive={isActive("/lenses")}
      />
      <NavLink
        to="/my-posts"
        icon={FileText}
        label={t("nav.myPosts")}
        isActive={isActive("/my-posts")}
      />
      <NavLink
        to="/topics"
        icon={Hash}
        label={t("nav.topics")}
        isActive={isActive("/topics")}
      />
      <NavLinkWithBadge
        to="/messages"
        icon={Mail}
        label={t("nav.messages")}
        isActive={isActive("/messages")}
      />
      <NavLink
        to="/profile"
        icon={User}
        label={t("nav.profile")}
        isActive={isActive("/profile")}
      />
      {user?.role === "admin" && (
        <NavLink
          to="/admin"
          icon={Shield}
          label={t("nav.adminPanel")}
          isActive={isActive("/admin")}
        />
      )}
    </>
  );

  return (
    <>
      <aside
        className="hidden md:flex md:flex-col md:w-56 md:shrink-0 bg-slate-800 dark:bg-slate-950 text-slate-300 dark:text-slate-400 h-screen sticky top-0 border-r border-slate-700/50 dark:border-slate-800"
        aria-label={t("aria.mainNav")}
      >
        <div className="p-4 border-b border-slate-700/50 dark:border-slate-800">
          <Link
            to="/dashboard"
            className="group flex items-center text-white hover:text-teal-400 transition"
            aria-label="ZebraPoint"
          >
            <LogoBrand inverted className="h-8 w-auto" />
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
          {desktopNav}
        </nav>
        <div className="p-3 border-t border-slate-700/50 dark:border-slate-800">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-300 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-800 transition"
            aria-label={dark ? t("theme.enableLight") : t("theme.enableDark")}
          >
            {dark ? <Sun className="w-5 h-5 shrink-0" aria-hidden /> : <Moon className="w-5 h-5 shrink-0" aria-hidden />}
            <span>{dark ? t("theme.lightMode") : t("theme.darkMode")}</span>
          </button>

          <button
            type="button"
            onClick={() => i18n.changeLanguage(i18n.language === "pl" ? "en" : "pl")}
            className="mt-2 flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-slate-300 dark:text-slate-400 hover:bg-slate-700/50 dark:hover:bg-slate-800 transition"
            aria-label={t("aria.changeLanguage")}
          >
            <span>{i18n.language === "pl" ? "EN" : "PL"}</span>
          </button>
        </div>
        <div className="p-3 border-t border-slate-700/50 dark:border-slate-800 flex items-center gap-3">
          <Avatar name={user?.display_name} size="sm" className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {user?.display_name}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-red-400 dark:hover:text-red-400 transition"
            >
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <MobileBottomBar isActive={isActive} />
    </>
  );
}
