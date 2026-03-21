import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";

function ParamRow({ label, value }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 py-2 border-b border-slate-200 dark:border-slate-700 text-sm">
      <dt className="font-medium text-slate-600 dark:text-slate-400">{label}</dt>
      <dd className="sm:col-span-2 text-slate-800 dark:text-slate-200 break-words">
        {typeof value === "object" && value !== null ? (
          <pre className="text-xs bg-slate-50 dark:bg-slate-900/80 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
          </pre>
        ) : (
          String(value)
        )}
      </dd>
    </div>
  );
}

export default function AdminML() {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/monitoring/ml")
      .then((res) => setData(res.data))
      .catch(() => setError(t("ml.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  const statusCounts = useMemo(() => {
    const runs = data?.runs ?? [];
    const acc = {};
    for (const r of runs) {
      const s = r.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, [data]);

  const maxStatus = useMemo(() => {
    return Math.max(1, ...Object.values(statusCounts));
  }, [statusCounts]);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">{t("ml.loading")}</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  const { parameters, openai_model_group_descriptions, runs } = data;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("ml.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("ml.subtitle")}</p>

      <section className="mb-8">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("ml.paramsTitle")}</h2>
        <dl className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-4">
          <ParamRow label={t("ml.retrainEvery")} value={parameters.retrain_trigger_new_profiles} />
          <ParamRow label={t("ml.minProfiles")} value={parameters.min_profiles_before_first_retrain} />
          <ParamRow label={t("ml.noiseThreshold")} value={parameters.noise_similarity_threshold} />
          <ParamRow label={t("ml.hdbscan")} value={parameters.hdbscan} />
          <ParamRow label={t("ml.openaiModel")} value={openai_model_group_descriptions} />
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("ml.runsByStatus")}</h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-2">
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-slate-500">{t("ml.noRuns")}</p>
          ) : (
            Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3 text-sm">
                <span className="w-24 font-medium text-slate-600 dark:text-slate-400">{status}</span>
                <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden">
                  <div
                    className="h-full bg-zebra-500 rounded-lg transition-all"
                    style={{ width: `${(count / maxStatus) * 100}%`, minWidth: count ? "8px" : 0 }}
                    title={String(count)}
                  />
                </div>
                <span className="w-8 text-right text-slate-700 dark:text-slate-300">{count}</span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("ml.historyTitle")}</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 font-medium">{t("ml.colWhen")}</th>
                <th className="p-3 font-medium">{t("ml.colStatus")}</th>
                <th className="p-3 font-medium">{t("ml.colProfiles")}</th>
                <th className="p-3 font-medium">{t("ml.colClusters")}</th>
                <th className="p-3 font-medium">{t("ml.colNoise")}</th>
                <th className="p-3 font-medium">{t("ml.colReassigned")}</th>
                <th className="p-3 font-medium">{t("ml.colDuration")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-slate-500">
                    {t("ml.noRuns")}
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr
                    key={run.id}
                    className="border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="p-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                      {new Date(run.run_at).toLocaleString(locale)}
                    </td>
                    <td className="p-3">{run.status}</td>
                    <td className="p-3">{run.profiles_count}</td>
                    <td className="p-3">{run.clusters_found}</td>
                    <td className="p-3">{run.noise_count}</td>
                    <td className="p-3">{run.reassigned}</td>
                    <td className="p-3">{run.duration_ms != null ? `${run.duration_ms} ms` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {runs.some((r) => r.error_message) && (
          <p className="text-xs text-slate-500 mt-2">{t("ml.errorHint")}</p>
        )}
      </section>
    </div>
  );
}
