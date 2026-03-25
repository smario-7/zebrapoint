import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
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
  const [retrainDraft, setRetrainDraft] = useState("");
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [retrainLoading, setRetrainLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get("/admin/monitoring/ml")
      .then((res) => setData(res.data))
      .catch(() => setError(t("ml.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (data?.parameters?.retrain_trigger_new_profiles != null) {
      setRetrainDraft(String(data.parameters.retrain_trigger_new_profiles));
    }
  }, [data]);

  const handleSaveThreshold = async () => {
    const n = parseInt(retrainDraft, 10);
    if (Number.isNaN(n) || n < 1 || n > 500) {
      toast.error(t("ml.thresholdInvalid"));
      return;
    }
    setSavingThreshold(true);
    try {
      await api.patch("/admin/ml/settings", { retrain_trigger_new_profiles: n });
      toast.success(t("ml.thresholdSaved"));
      const res = await api.get("/admin/monitoring/ml");
      setData(res.data);
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : t("ml.thresholdSaveError"));
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleRetrain = async () => {
    setRetrainLoading(true);
    try {
      const res = await api.post("/admin/retrain");
      toast.success(t("ml.retrainQueued", { taskId: res.data.task_id ?? "—" }));
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : t("ml.retrainError"));
    } finally {
      setRetrainLoading(false);
    }
  };

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
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("ml.actionsTitle")}</h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label htmlFor="ml-retrain-threshold" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                {t("ml.retrainThresholdEdit")}
              </label>
              <input
                id="ml-retrain-threshold"
                type="number"
                min={1}
                max={500}
                value={retrainDraft}
                onChange={(e) => setRetrainDraft(e.target.value)}
                className="w-full max-w-xs rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100 text-sm"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t("ml.retrainThresholdHint")}</p>
            </div>
            <button
              type="button"
              onClick={handleSaveThreshold}
              disabled={savingThreshold}
              className="shrink-0 rounded-xl bg-zebra-600 hover:bg-zebra-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2"
            >
              {savingThreshold ? t("ml.saving") : t("ml.saveThreshold")}
            </button>
          </div>
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleRetrain}
              disabled={retrainLoading}
              className="rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-900/80 text-slate-800 dark:text-slate-100 text-sm font-medium px-4 py-2 disabled:opacity-50"
            >
              {retrainLoading ? t("ml.retrainSending") : t("ml.retrainNow")}
            </button>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t("ml.retrainNowHint")}</p>
          </div>
        </div>
      </section>

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
                <th className="p-3 font-medium min-w-[12rem]">{t("ml.colMessage")}</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-slate-500">
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
                    <td className="p-3 text-xs text-slate-600 dark:text-slate-400 max-w-md break-words align-top">
                      {run.error_message ? run.error_message : "—"}
                    </td>
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
