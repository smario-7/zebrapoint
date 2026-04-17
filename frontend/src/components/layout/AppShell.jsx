import Sidebar from "./Sidebar";
import useThemeStore from "../../store/themeStore";
import { Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AppShell({ children, fullHeight, contentClassName }) {
  const { t } = useTranslation("common");
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const innerClass =
    contentClassName ||
    `max-w-5xl mx-auto w-full px-4 sm:px-6 pb-20 md:pb-0 ${fullHeight ? "flex min-h-0 flex-1 flex-col" : "py-8"}`;

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
      <main
        className={`min-h-0 flex-1 min-w-0 w-full overflow-y-auto ${
          fullHeight ? "flex flex-col py-0" : ""
        }`}
      >
        <div className={innerClass}>
          {children}
        </div>
      </main>
    </div>
  );
}
