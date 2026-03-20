import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { useTranslation } from "react-i18next";

function StatCard({ label, value, color, link, urgent }) {
  const { t } = useTranslation("admin");
  const content = (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 ${
        urgent ? "border-red-300 dark:border-red-900 shadow-sm shadow-red-100 dark:shadow-red-900/20" : ""
      }`}
    >
      <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {urgent && (
        <p className="text-xs text-red-500 mt-1 font-medium">
          {t("dashboard.requiresAttention")}
        </p>
      )}
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

export default function AdminDashboard() {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/admin/reports/stats"),
      api.get("/admin/pipeline/status").catch(() => ({ data: [] })),
    ])
      .then(([statsRes, pipelineRes]) => {
        setStats({
          reports: statsRes.data,
          pipeline: Array.isArray(pipelineRes.data) ? pipelineRes.data[0] ?? null : null,
        });
      })
      .catch(() => setStats({ reports: {}, pipeline: null }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">{t("dashboard.loading")}</p>;

  const { reports = {}, pipeline } = stats || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        {t("dashboard.title")}
      </h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label={t("dashboard.pendingReports")}
          value={reports.pending ?? 0}
          color="text-red-600"
          link="/admin/reports"
          urgent={(reports.pending ?? 0) > 0}
        />
        <StatCard
          label={t("dashboard.reviewed")}
          value={reports.reviewed ?? 0}
          color="text-emerald-600"
        />
        <StatCard
          label={t("dashboard.totalReports")}
          value={reports.total ?? 0}
          color="text-slate-600"
        />
        <StatCard
          label={t("dashboard.lastRetrain")}
          value={
            pipeline
              ? t("dashboard.groupsCount", { count: pipeline.clusters_found })
              : t("dashboard.noData")
          }
          color="text-zebra-600"
        />
      </div>

      {pipeline && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5">
          <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
            {t("dashboard.lastPipeline")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: t("dashboard.profiles"), value: pipeline.profiles_count },
              { label: t("dashboard.clusters"), value: pipeline.clusters_found },
              { label: t("dashboard.noise"), value: pipeline.noise_count },
              { label: t("dashboard.reassigned"), value: pipeline.reassigned },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 dark:bg-slate-900/90 rounded-xl p-3">
                <p className="text-slate-400 dark:text-slate-500 text-xs">{item.label}</p>
                <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            {new Date(pipeline.run_at).toLocaleString(locale)} · {pipeline.duration_ms}ms
            · {t("dashboard.status")}: {pipeline.status}
          </p>
        </div>
      )}
    </div>
  );
}
