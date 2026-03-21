import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LogoBrand from "../ui/LogoBrand";
import useThemeStore from "../../store/themeStore";

function DefaultHeaderLinks() {
  const { t } = useTranslation("landing");
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/login"
        className="text-sm font-medium text-[var(--zp-app-text-primary)] hover:text-[var(--zp-accent-primary)] transition"
      >
        {t("nav.signIn")}
      </Link>
      <Link
        to="/register"
        className="text-sm font-medium text-white bg-[var(--zp-accent-primary)] hover:opacity-90 px-4 py-2 rounded-xl transition"
      >
        {t("nav.joinFree")}
      </Link>
    </div>
  );
}

export default function PublicLayout({ children, headerRight }) {
  const dark = useThemeStore((s) => s.dark);

  return (
    <div className="min-h-screen bg-[var(--zp-app-bg)] flex flex-col">
      <header className="h-16 flex items-center justify-between w-full border-b border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-5 md:px-12">
        <Link
          to="/"
          className="group font-bold text-[17px] text-[var(--zp-app-text-primary)] hover:opacity-80 transition"
          aria-label="ZebraPoint"
        >
          <LogoBrand inverted={dark} className="h-8 w-auto" />
        </Link>
        {headerRight ?? <DefaultHeaderLinks />}
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <footer className="text-center py-6 text-xs text-[var(--zp-app-text-muted)]">
        © 2026 ZebraPoint · Platforma wsparcia dla opiekunów
      </footer>
    </div>
  );
}
