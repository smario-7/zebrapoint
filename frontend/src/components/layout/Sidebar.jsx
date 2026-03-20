import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Mail,
  User,
  Shield,
  Sun,
  Moon,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import useThemeStore from "../../store/themeStore";
import Avatar from "../ui/Avatar";
import { useProfile } from "../../hooks/useProfile";
import LogoBrand from "../ui/LogoBrand";
import useBootstrapStore from "../../store/bootstrapStore";

function UnreadBadge() {
  const { t } = useTranslation("common");
  const count = useBootstrapStore((s) => s.unreadCount);

  if (count === 0) return null;

  return (
    <span
      className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
      aria-label={t("unreadCount", { count })}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}

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
  const { group } = useProfile();
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
    if (path === "/groups") return location.pathname === "/groups";
    if (path === "/admin") return location.pathname.startsWith("/admin");
    if (path === "/messages")
      return location.pathname.startsWith("/messages");
    if (path === "/profile") return location.pathname === "/profile";
    if (path.startsWith("/groups/") && path.includes("/forum"))
      return location.pathname.includes("/forum");
    if (path.startsWith("/groups/"))
      return location.pathname.startsWith("/groups/") && !location.pathname.includes("/forum");
    return false;
  };

  const groupId = group?.id;
  const groupBase = groupId ? `/groups/${groupId}` : null;

  const desktopNav = (
    <>
      <NavLink
        to="/dashboard"
        icon={LayoutDashboard}
        label={t("nav.dashboard")}
        isActive={isActive("/dashboard")}
      />
      <NavLink
        to="/groups"
        icon={Users}
        label={t("nav.groups")}
        isActive={isActive("/groups")}
      />
      {groupBase && (
        <>
          <NavLink
            to={groupBase}
            icon={MessageSquare}
            label={t("nav.groupChat")}
            isActive={isActive(groupBase)}
          />
          <NavLink
            to={`${groupBase}/forum`}
            icon={BookOpen}
            label={t("nav.forum")}
            isActive={isActive(`${groupBase}/forum`)}
          />
        </>
      )}
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
      {/* Desktop: lewy sidebar */}
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

      {/* Mobile: dolna belka */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around py-2 safe-area-pb"
        aria-label={t("aria.mobileNav")}
      >
        <Link
          to="/dashboard"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
            isActive("/dashboard")
              ? "text-zebra-600 dark:text-teal-400"
              : "text-slate-500 dark:text-slate-300"
          }`}
        >
          <LayoutDashboard className="w-6 h-6" aria-hidden />
          <span>{t("nav.home")}</span>
        </Link>
          <Link
            to="/groups"
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
              isActive("/groups")
                ? "text-zebra-600 dark:text-teal-400"
                : "text-slate-500 dark:text-slate-300"
            }`}
          >
            <Users className="w-6 h-6" aria-hidden />
            <span>{t("nav.groups")}</span>
          </Link>
        {groupBase ? (
          <Link
            to={groupBase}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
              isActive(groupBase) ? "text-zebra-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            <MessageSquare className="w-6 h-6" aria-hidden />
            <span>{t("nav.chat")}</span>
          </Link>
        ) : (
          <span className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-300 dark:text-slate-500 text-xs">
            <MessageSquare className="w-6 h-6" aria-hidden />
            <span>{t("nav.chat")}</span>
          </span>
        )}
        {groupBase ? (
          <Link
            to={`${groupBase}/forum`}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
              isActive(`${groupBase}/forum`) ? "text-zebra-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-300"
            }`}
          >
            <BookOpen className="w-6 h-6" aria-hidden />
            <span>{t("nav.forum")}</span>
          </Link>
        ) : (
          <span className="flex flex-col items-center gap-0.5 px-3 py-1 text-slate-300 dark:text-slate-500 text-xs">
            <BookOpen className="w-6 h-6" aria-hidden />
            <span>{t("nav.forum")}</span>
          </span>
        )}
        <Link
          to="/messages"
          className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
            isActive("/messages") ? "text-zebra-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          <span className="relative">
            <Mail className="w-6 h-6" aria-hidden />
            <UnreadBadge />
          </span>
          <span>{t("nav.messagesShort")}</span>
        </Link>
        <Link
          to="/profile"
          className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-xs font-medium ${
            isActive("/profile") ? "text-zebra-600 dark:text-teal-400" : "text-slate-500 dark:text-slate-300"
          }`}
        >
          <User className="w-6 h-6" aria-hidden />
          <span>{t("nav.profile")}</span>
        </Link>
      </nav>
    </>
  );
}
