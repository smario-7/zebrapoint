import { Link, NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

const NAV_ITEMS = [
  { to: "/admin", end: true, labelKey: "layout.navDashboard" },
  { to: "/admin/reports", end: false, labelKey: "layout.navReports" },
  { to: "/admin/users", end: false, labelKey: "layout.navUsers" },
  { to: "/admin/groups", end: false, labelKey: "layout.navGroups" },
  { to: "/admin/ml", end: false, labelKey: "layout.navML" },
  { to: "/admin/ai", end: false, labelKey: "layout.navAI" },
  { to: "/admin/logs", end: false, labelKey: "layout.navLogs" },
  { to: "/admin/system", end: false, labelKey: "layout.navSystem" },
];

export default function AdminLayout() {
  const { t } = useTranslation("admin");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <aside className="w-56 bg-slate-900 dark:bg-slate-950 flex-shrink-0 flex flex-col min-h-screen border-r border-slate-800 dark:border-slate-800">
        <div className="p-4 border-b border-slate-700">
          <Link
            to="/admin"
            className="block focus:outline-none focus:ring-2 focus:ring-zebra-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
            aria-label={`ZebraPoint — ${t("layout.panelTitle")}`}
          >
            <img
              src="/logo_circle_text_wh.svg"
              alt=""
              className="h-8 w-auto"
            />
          </Link>
          <p className="text-slate-400 text-xs mt-1.5">{t("layout.panelTitle")}</p>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-zebra-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-700">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            {t("layout.backToDashboard")}
          </Link>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <Outlet />
      </main>
    </div>
  );
}
