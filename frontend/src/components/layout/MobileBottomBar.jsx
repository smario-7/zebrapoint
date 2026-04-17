import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Layers,
  FileText,
  Mail,
  User,
} from "lucide-react";
import UnreadBadge from "./UnreadBadge";

export default function MobileBottomBar({ isActive }) {
  const { t } = useTranslation("common");

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-around py-2 safe-area-pb"
      aria-label={t("aria.mobileNav")}
    >
      <Link
        to="/dashboard"
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium ${
          isActive("/dashboard")
            ? "text-zebra-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-300"
        }`}
      >
        <LayoutDashboard className="w-6 h-6" aria-hidden />
        <span>{t("nav.home")}</span>
      </Link>
      <Link
        to="/lenses"
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium ${
          isActive("/lenses")
            ? "text-zebra-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-300"
        }`}
      >
        <Layers className="w-6 h-6" aria-hidden />
        <span className="max-w-[4.5rem] truncate text-center">{t("nav.lensesShort")}</span>
      </Link>
      <Link
        to="/my-posts"
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium ${
          isActive("/my-posts")
            ? "text-zebra-600 dark:text-teal-400"
            : "text-slate-500 dark:text-slate-300"
        }`}
      >
        <FileText className="w-6 h-6" aria-hidden />
        <span className="max-w-[4.5rem] truncate text-center">{t("nav.myPostsShort")}</span>
      </Link>
      <Link
        to="/messages"
        className={`relative flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium ${
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
        className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-medium ${
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
