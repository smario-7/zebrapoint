import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";

function StatCard({ label, value, color, link, urgent }) {
  const inner = (
    <div
      className={`rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 ${
        urgent ? "border-amber-300 dark:border-amber-800" : ""
      }`}
    >
      <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {urgent && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
          Wymaga uwagi
        </p>
      )}
    </div>
  );
  return link ? <Link to={link} className="block hover:opacity-95 transition">{inner}</Link> : inner;
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-slate-400 dark:text-slate-500">{t("v2monitor.loading")}</p>;
  }

  const s = stats;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("v2monitor.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("v2monitor.subtitle")}</p>

      {!s && (
        <p className="text-red-500 text-sm">{t("v2monitor.loadFailed")}</p>
      )}

      {s && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label={t("v2monitor.usersTotal")} value={s.users_total} color="text-slate-700 dark:text-slate-200" />
            <StatCard label={t("v2monitor.usersActive")} value={s.users_active} color="text-emerald-600" />
            <StatCard
              label={t("v2monitor.postsPublished")}
              value={s.posts_published}
              color="text-slate-700 dark:text-slate-200"
            />
            <StatCard
              label={t("v2monitor.postsNoEmbed")}
              value={s.posts_without_embedding}
              color="text-amber-600"
              link="/admin/content"
              urgent={s.posts_without_embedding > 0}
            />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard label={t("v2monitor.lensesTotal")} value={s.lenses_total} color="text-slate-700 dark:text-slate-200" />
            <StatCard label={t("v2monitor.lensesActive")} value={s.lenses_active} color="text-teal-600" />
            <StatCard
              label={t("v2monitor.lensesNoEmbed")}
              value={s.lenses_without_embedding}
              color="text-amber-600"
              link="/admin/lenses"
              urgent={s.lenses_without_embedding > 0}
            />
            <StatCard
              label={t("v2monitor.proposalsPending")}
              value={s.proposals_pending}
              color="text-purple-600"
              link="/admin/proposals"
              urgent={s.proposals_pending > 0}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 text-sm text-slate-600 dark:text-slate-300 space-y-2">
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-100">{t("v2monitor.lastOrphanet")}:</span>{" "}
              {s.last_orphanet_sync
                ? new Date(s.last_orphanet_sync).toLocaleString(locale)
                : "—"}
            </p>
            <p>
              <span className="font-medium text-slate-800 dark:text-slate-100">{t("v2monitor.hpoVersion")}:</span>{" "}
              {s.last_hpo_sync || "—"}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
