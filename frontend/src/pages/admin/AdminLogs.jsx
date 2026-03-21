import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";

const TAIL_LINES = 200;
const REFRESH_MS = 60_000;

const TABS = [
  { id: "backend", key: "tabBackend" },
  { id: "celery", key: "tabCelery" },
  { id: "redis", key: "tabRedis" },
];

function lineClassName(text) {
  if (/\b(ERROR|CRITICAL)\b/.test(text)) {
    return "text-red-600 dark:text-red-400";
  }
  if (/\bWARNING\b/.test(text)) {
    return "text-amber-600 dark:text-amber-400";
  }
  if (/\bDEBUG\b/.test(text)) {
    return "text-slate-500 dark:text-slate-500";
  }
  if (/\bINFO\b/.test(text)) {
    return "text-slate-700 dark:text-slate-300";
  }
  return "text-slate-600 dark:text-slate-400";
}

export default function AdminLogs() {
  const { t } = useTranslation("admin");
  const [tab, setTab] = useState("backend");
  const [payload, setPayload] = useState({ backend: [], celery: [], redis: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    api
      .get("/admin/monitoring/logs", { params: { lines: TAIL_LINES } })
      .then((res) => {
        setError(null);
        setPayload(res.data);
      })
      .catch(() => setError(t("logs.loadError")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  const lines = payload[tab] || [];

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
            {t("logs.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("logs.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-zebra-600 text-white hover:bg-zebra-700 transition"
        >
          {t("logs.refresh")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map(({ id, key }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === id
                ? "bg-slate-800 text-white dark:bg-zebra-600"
                : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
            }`}
          >
            {t(`logs.${key}`)}
          </button>
        ))}
      </div>

      {loading && lines.length === 0 && !error ? (
        <p className="text-slate-400 dark:text-slate-500">{t("logs.loading")}</p>
      ) : null}
      {error ? <p className="text-red-600 dark:text-red-400 mb-4">{error}</p> : null}

      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 max-h-[70vh] overflow-auto">
        {lines.length === 0 && !loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("logs.empty")}</p>
        ) : (
          <div className="space-y-0.5 font-mono text-xs">
            {lines.map((line, i) => (
              <p key={`${tab}-${i}`} className={`whitespace-pre-wrap break-all ${lineClassName(line)}`}>
                {line}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
