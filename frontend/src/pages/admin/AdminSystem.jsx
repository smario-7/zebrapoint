import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-wrap gap-2 py-1.5 text-sm border-b border-slate-100 dark:border-slate-700/80">
      <span className="text-slate-500 dark:text-slate-400 min-w-[10rem]">{label}</span>
      <span className="text-slate-800 dark:text-slate-200 font-mono break-all">{value ?? "—"}</span>
    </div>
  );
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function AdminSystem() {
  const { t } = useTranslation("admin");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState({ redis: [], celery: [] });
  const [historyError, setHistoryError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/monitoring/system")
      .then((res) => setData(res.data))
      .catch(() => setError(t("system.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    api
      .get("/admin/monitoring/stats-history", { params: { entries: 48 } })
      .then((res) => {
        setHistory(res.data);
        setHistoryError(null);
      })
      .catch(() => setHistoryError(t("system.historyLoadError")));
  }, [t]);

  if (loading) return <p className="text-slate-400 dark:text-slate-500">{t("system.loading")}</p>;
  if (error) return <p className="text-red-600 dark:text-red-400">{error}</p>;
  if (!data) return null;

  const { redis, celery } = data;
  const ri = redis.info || {};
  const redisHist = history.redis || [];
  const celeryHist = history.celery || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("system.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("system.subtitle")}</p>

      <section className="mb-8">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("system.redisTitle")}</h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-sm mb-3">
            <span className="text-slate-500">{t("system.connected")}: </span>
            <span className={redis.connected ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
              {redis.connected ? t("system.yes") : t("system.no")}
            </span>
            {redis.error && (
              <span className="block text-red-600 text-xs mt-1">{redis.error}</span>
            )}
          </p>
          <InfoRow label={t("system.redisVersion")} value={ri.redis_version} />
          <InfoRow label={t("system.uptime")} value={ri.uptime_in_seconds != null ? `${ri.uptime_in_seconds} s` : null} />
          <InfoRow label={t("system.clients")} value={ri.connected_clients} />
          <InfoRow label={t("system.memory")} value={ri.used_memory_human} />
          <InfoRow label={t("system.memoryPeak")} value={ri.used_memory_peak_human} />
          <InfoRow label={t("system.keysDb0")} value={ri.total_keys_db0} />
        </div>
      </section>

      <section>
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("system.celeryTitle")}</h2>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
          <p className="text-sm mb-2">
            <span className="text-slate-500">{t("system.workersReachable")}: </span>
            <span
              className={
                celery.workers_reachable ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"
              }
            >
              {celery.workers_reachable ? t("system.yes") : t("system.no")}
            </span>
          </p>
          {celery.error && <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">{celery.error}</p>}
          <p className="text-xs text-slate-500">{t("system.celeryHint")}</p>
        </div>

        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("system.activeTasks")}</h3>
        <ul className="space-y-2 mb-6 text-sm">
          {(celery.active || []).length === 0 ? (
            <li className="text-slate-500">{t("system.none")}</li>
          ) : (
            celery.active.map((task) => (
              <li
                key={`${task.worker}-${task.id}`}
                className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
              >
                <p className="font-mono text-xs text-slate-500">{task.worker}</p>
                <p className="font-medium">{task.name}</p>
                <p className="text-xs text-slate-500 break-all">id: {task.id}</p>
              </li>
            ))
          )}
        </ul>

        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t("system.scheduledTasks")}</h3>
        <ul className="space-y-2 text-sm mb-10">
          {(celery.scheduled || []).length === 0 ? (
            <li className="text-slate-500">{t("system.none")}</li>
          ) : (
            celery.scheduled.map((task) => (
              <li
                key={`${task.worker}-${task.id}-${task.eta}`}
                className="bg-slate-50 dark:bg-slate-900/80 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
              >
                <p className="font-mono text-xs text-slate-500">{task.worker}</p>
                <p className="font-medium">{task.name}</p>
                {task.eta && <p className="text-xs text-slate-500">ETA: {task.eta}</p>}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="border-t border-slate-200 dark:border-slate-700 pt-8">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">{t("system.historyTitle")}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("system.historySubtitle")}</p>
        {historyError && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">{historyError}</p>
        )}

        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("system.historyRedis")}</h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto mb-8">
          {redisHist.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("system.historyEmpty")}</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("system.colTime")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colMemory")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colClients")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colKeys")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colUptime")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colError")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {redisHist.map((row, i) => (
                  <tr key={`r-${row.ts}-${i}`} className="text-slate-800 dark:text-slate-200">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmt(row.ts)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.used_memory_human)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.connected_clients)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.total_keys_db0)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.uptime_in_seconds)}</td>
                    <td className="px-3 py-2 text-xs text-red-600 dark:text-red-400 max-w-xs break-all">
                      {row.error ? row.error : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">{t("system.historyCelery")}</h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {celeryHist.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">{t("system.historyEmpty")}</p>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t("system.colTime")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colWorker")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colProcessed")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colActive")}</th>
                  <th className="px-3 py-2 font-medium">{t("system.colError")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {celeryHist.map((row, i) => (
                  <tr key={`c-${row.ts}-${row.worker}-${i}`} className="text-slate-800 dark:text-slate-200">
                    <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{fmt(row.ts)}</td>
                    <td className="px-3 py-2 font-mono text-xs break-all">{fmt(row.worker)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.processed)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{fmt(row.active)}</td>
                    <td className="px-3 py-2 text-xs text-red-600 dark:text-red-400 max-w-xs break-all">
                      {row.snapshot_error ? row.snapshot_error : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
