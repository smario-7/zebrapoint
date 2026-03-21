import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";

function StatCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
      <p className="text-slate-400 dark:text-slate-500 text-xs mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}

export default function AdminAI() {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/monitoring/ai")
      .then((res) => setData(res.data))
      .catch(() => setError(t("ai.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">{t("ai.loading")}</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  const { model, totals, daily } = data;
  const dailyWithUsage = (daily || []).filter((d) => d.total_tokens > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("ai.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        {t("ai.subtitle")}{" "}
        <span className="font-mono text-slate-700 dark:text-slate-300">{model}</span>
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label={t("ai.calls")} value={totals.calls} />
        <StatCard label={t("ai.promptTokens")} value={totals.prompt_tokens} />
        <StatCard label={t("ai.completionTokens")} value={totals.completion_tokens} />
        <StatCard label={t("ai.totalTokens")} value={totals.total_tokens} />
      </div>

      <section>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("ai.dailyTitle")}</h2>
        <p className="text-xs text-slate-500 mb-3">{t("ai.dailyHint")}</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-3 font-medium">{t("ai.colDate")}</th>
                <th className="p-3 font-medium">{t("ai.promptTokens")}</th>
                <th className="p-3 font-medium">{t("ai.completionTokens")}</th>
                <th className="p-3 font-medium">{t("ai.totalTokens")}</th>
              </tr>
            </thead>
            <tbody>
              {dailyWithUsage.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-slate-500">
                    {t("ai.noDaily")}
                  </td>
                </tr>
              ) : (
                dailyWithUsage.map((row) => (
                  <tr
                    key={row.date}
                    className="border-b border-slate-100 dark:border-slate-700/80 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                  >
                    <td className="p-3 whitespace-nowrap">
                      {new Date(row.date + "T12:00:00").toLocaleDateString(locale)}
                    </td>
                    <td className="p-3">{row.prompt_tokens}</td>
                    <td className="p-3">{row.completion_tokens}</td>
                    <td className="p-3 font-medium">{row.total_tokens}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
