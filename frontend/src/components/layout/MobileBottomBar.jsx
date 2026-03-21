import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  BookOpen,
  Mail,
  User,
} from "lucide-react";
import UnreadBadge from "./UnreadBadge";

export default function MobileBottomBar({ isActive, groupBase }) {
  const { t } = useTranslation("common");

  return (
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
            isActive(groupBase)
              ? "text-zebra-600 dark:text-teal-400"
              : "text-slate-500 dark:text-slate-300"
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
            isActive(`${groupBase}/forum`)
              ? "text-zebra-600 dark:text-teal-400"
              : "text-slate-500 dark:text-slate-300"
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
          isActive("/messages")
            ? "text-zebra-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-300"
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
          isActive("/profile")
            ? "text-zebra-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-300"
        }`}
      >
        <User className="w-6 h-6" aria-hidden />
        <span>{t("nav.profile")}</span>
      </Link>
    </nav>
  );
}
