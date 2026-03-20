import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogoBrand from "../ui/LogoBrand";
import useThemeStore from "../../store/themeStore";

export default function LandingNav() {
  const { t, i18n } = useTranslation(["common", "landing"]);
  const dark = useThemeStore((s) => s.dark);
  const toggleTheme = useThemeStore((s) => s.toggle);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [menuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between">
          <Link
            to="/"
            className="group font-bold text-xl text-slate-800 dark:text-slate-100 hover:text-zebra-600 dark:hover:text-teal-400 transition"
            aria-label="ZebraPoint"
          >
            {dark ? (
              <img src="/logo_circle_text_wh.svg" alt="ZebraPoint" className="h-8 w-auto" />
            ) : (
              <LogoBrand className="h-8 w-auto" />
            )}
          </Link>

          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition px-3 py-1.5 rounded-lg"
              aria-label={dark ? t("common:theme.enableLight") : t("common:theme.enableDark")}
            >
              {dark ? t("landing:nav.themeLight") : t("landing:nav.themeDark")}
            </button>
            <button
              type="button"
              onClick={() => i18n.changeLanguage(i18n.language === "pl" ? "en" : "pl")}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition px-3 py-1.5 rounded-lg"
            >
              {i18n.language === "pl" ? "EN" : "PL"}
            </button>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition px-3 py-1.5"
            >
              {t("landing:nav.signIn")}
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 px-4 py-2 rounded-xl transition"
            >
              {t("landing:nav.joinFree")}
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? t("common:aria.closeMenu") : t("common:aria.openMenu")}
            aria-expanded={menuOpen}
          >
            <span className="sr-only">{menuOpen ? t("common:aria.close") : t("common:aria.menu")}</span>
            <span className="block w-6 h-5 relative">
              <span
                className={`absolute left-0 w-6 h-0.5 bg-current rounded transition-transform duration-200 ${
                  menuOpen ? "top-2 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-2 w-6 h-0.5 bg-current rounded transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 w-6 h-0.5 bg-current rounded transition-transform duration-200 ${
                  menuOpen ? "top-2 -rotate-45" : "top-4"
                }`}
              />
            </span>
          </button>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 overflow-hidden md:hidden transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!menuOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
          aria-label={t("common:aria.closeMenu")}
        />
        <div
          className={`absolute top-0 right-0 w-full max-w-xs h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-xl flex flex-col transition-transform duration-300 ease-out ${
            menuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <div className="h-14 flex items-center justify-end px-4 border-b border-slate-100 dark:border-slate-800">
            <button
              type="button"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setMenuOpen(false)}
              aria-label={t("common:aria.close")}
            >
              <span className="text-2xl leading-none">×</span>
            </button>
          </div>
          <div className="p-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="text-left text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 rounded-xl transition"
            >
              {dark ? t("landing:nav.enableLight") : t("landing:nav.enableDark")}
            </button>
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 px-4 py-3 rounded-xl transition"
            >
              {t("landing:nav.signIn")}
            </Link>
            <Link
              to="/register"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-semibold bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 px-4 py-3 rounded-xl transition text-center"
            >
              {t("landing:nav.joinFree")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
