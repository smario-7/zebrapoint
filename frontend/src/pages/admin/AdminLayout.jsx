import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { to: "/admin", end: true, labelKey: "layout.navMonitoring" },
  { to: "/admin/users", end: false, labelKey: "layout.navUsers" },
  { to: "/admin/content", end: false, labelKey: "layout.navContent" },
  { to: "/admin/lenses", end: false, labelKey: "layout.navLenses" },
  { to: "/admin/orphanet", end: false, labelKey: "layout.navOrphanet" },
  { to: "/admin/proposals", end: false, labelKey: "layout.navProposals" },
];

export default function AdminLayout() {
  const { t } = useTranslation("admin");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row">
      <aside className="w-full md:w-56 shrink-0 bg-slate-900 dark:bg-slate-950 flex flex-col md:min-h-screen border-b md:border-b-0 md:border-r border-slate-800">
        <div className="p-4 border-b border-slate-700 shrink-0">
          <Link
            to="/admin"
            className="block focus:outline-none focus:ring-2 focus:ring-zebra-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
            aria-label={`ZebraPoint — ${t("layout.panelTitle")}`}
          >
            <img src="/logo_circle_text_wh.svg" alt="" className="h-8 w-auto" />
          </Link>
          <p className="text-slate-400 text-xs mt-1.5">{t("layout.panelTitle")}</p>
        </div>
        <nav className="flex flex-row md:flex-col gap-1 p-3 overflow-x-auto md:overflow-y-auto md:flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap shrink-0 md:shrink ${
                  isActive ? "bg-zebra-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700 shrink-0 hidden md:block">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {t("layout.backToDashboard")}
          </Link>
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-8">
        <Link
          to="/dashboard"
          className="md:hidden inline-block mb-4 text-sm text-zebra-600 dark:text-teal-400 font-medium"
        >
          {t("layout.backToDashboard")}
        </Link>
        <Outlet />
      </main>
    </div>
  );
}
