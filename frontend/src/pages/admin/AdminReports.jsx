import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const STATUS_OPTIONS = [
  { value: "pending", labelKey: "reports.statusPending" },
  { value: "reviewed", labelKey: "reports.statusReviewed" },
  { value: "dismissed", labelKey: "reports.statusDismissed" },
  { value: "all", labelKey: "reports.statusAll" },
];

const ACTION_OPTIONS = [
  { value: "dismiss", labelKey: "reports.actions.dismiss", color: "bg-slate-500" },
  { value: "warn", labelKey: "reports.actions.warn", color: "bg-amber-500" },
  { value: "delete_content", labelKey: "reports.actions.delete_content", color: "bg-orange-500" },
  { value: "ban_temp", labelKey: "reports.actions.ban_temp", color: "bg-red-500" },
  { value: "ban_permanent", labelKey: "reports.actions.ban_permanent", color: "bg-red-800" },
];

export default function AdminReports() {
  const { t, i18n } = useTranslation("admin");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [acting, setActing] = useState(null);
  const [actionForm, setActionForm] = useState({
    action_type: "",
    reason: "",
    ban_hours: 24,
    warning_message: "",
  });

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/reports?status_filter=${statusFilter}&limit=50`
      );
      setReports(data);
    } catch {
      toast.error(t("reports.loadError"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleAction = async (reportId) => {
    if (!actionForm.action_type) {
      toast.error(t("reports.selectAction"));
      return;
    }
    try {
      await api.post(`/admin/reports/${reportId}/action`, actionForm);
      toast.success(t("reports.actionDone"));
      setActing(null);
      setActionForm({
        action_type: "",
        reason: "",
        ban_hours: 24,
        warning_message: "",
      });
      loadReports();
    } catch (err) {
      const msg = err.response?.data?.detail ?? t("reports.actionError");
      toast.error(
        Array.isArray(msg) ? msg[0]?.msg ?? t("reports.actionError") : msg
      );
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t("reports.title")}</h1>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                statusFilter === opt.value
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 dark:text-slate-500 text-sm">{t("reports.loading")}</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-600 dark:text-slate-300 font-medium">{t("reports.noReports")}</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
            {statusFilter === "pending"
              ? t("reports.queueEmpty")
              : t("reports.noInStatus")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        report.status === "pending"
                          ? "bg-red-100 text-red-700"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {report.status === "pending"
                        ? t("reports.statusPending")
                        : report.status === "reviewed"
                          ? t("reports.statusReviewed")
                          : report.status === "dismissed"
                            ? t("reports.statusDismissed")
                            : report.status}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {report.target_type}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {report.reason}
                    </span>
                    {report.report_count > 1 && (
                      <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                        {t("reports.timesReported", { count: report.report_count })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("reports.reportedBy")}{" "}
                    <strong>{report.reporter_name}</strong> ·{" "}
                    {new Date(report.created_at).toLocaleString(locale)}
                  </p>
                </div>
                {report.status === "pending" && (
                  <button
                    type="button"
                    onClick={() =>
                      setActing(acting === report.id ? null : report.id)
                    }
                    className="text-sm bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-4 py-1.5 rounded-xl transition flex-shrink-0"
                  >
                    {acting === report.id ? t("reports.cancel") : t("reports.review")}
                  </button>
                )}
              </div>

              {report.target_preview && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3 text-sm text-slate-600 border border-slate-200">
                  {report.target_preview}
                </div>
              )}
              {report.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-3">
                  „{report.description}"
                </p>
              )}

              {acting === report.id && (
                <div className="border-t pt-4 mt-3 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {ACTION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setActionForm((f) => ({
                            ...f,
                            action_type: opt.value,
                          }))
                        }
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl text-white transition ${opt.color} ${
                          actionForm.action_type === opt.value
                            ? "ring-2 ring-offset-1 ring-slate-400"
                            : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    ))}
                  </div>
                  {actionForm.action_type === "ban_temp" && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600 dark:text-slate-300 flex-shrink-0">
                        {t("reports.banHours")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={8760}
                        value={actionForm.ban_hours}
                        onChange={(e) =>
                          setActionForm((f) => ({
                            ...f,
                            ban_hours: parseInt(e.target.value, 10) || 24,
                          }))
                        }
                        className="w-24 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zebra-500"
                      />
                    </div>
                  )}
                  {actionForm.action_type === "warn" && (
                    <textarea
                      value={actionForm.warning_message}
                      onChange={(e) =>
                        setActionForm((f) => ({
                          ...f,
                          warning_message: e.target.value,
                        }))
                      }
                      placeholder={t("reports.warningPlaceholder")}
                      rows={2}
                      className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-zebra-500"
                    />
                  )}
                  <textarea
                    value={actionForm.reason}
                    onChange={(e) =>
                      setActionForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    placeholder={t("reports.reasonPlaceholder")}
                    rows={2}
                    className="w-full border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 resize-none focus:outline-none focus:ring-2 focus:ring-zebra-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAction(report.id)}
                    disabled={!actionForm.action_type}
                    className="bg-slate-800 hover:bg-slate-900 dark:disabled:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2 rounded-xl transition"
                  >
                    {t("reports.executeAction")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
