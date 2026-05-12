import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

import useThemeStore from "../../store/themeStore";
import Sidebar from "./Sidebar";
import RouteTransition from "../motion/RouteTransition";

export default function MainAppLayout() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="min-h-screen h-dvh flex overflow-hidden bg-[var(--zp-app-bg)]">
      <Sidebar />
      <button
        type="button"
        onClick={toggleTheme}
        className="md:hidden fixed top-4 right-4 z-50 w-11 h-11 rounded-2xl bg-[var(--zp-app-card)] border border-[var(--zp-app-border)] shadow-sm flex items-center justify-center text-slate-700 dark:text-slate-200"
        aria-label={dark ? t("theme.enableLight") : t("theme.enableDark")}
      >
        {dark ? <Sun className="w-5 h-5" aria-hidden /> : <Moon className="w-5 h-5" aria-hidden />}
      </button>
      <main className="min-h-0 flex-1 min-w-0 w-full overflow-y-auto flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <RouteTransition key={location.pathname} variant="outlet">
            <Outlet />
          </RouteTransition>
        </AnimatePresence>
      </main>
    </div>
  );
}
