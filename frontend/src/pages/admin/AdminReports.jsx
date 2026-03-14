import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

const STATUS_OPTIONS = [
  { value: "pending", label: "Oczekujące" },
  { value: "reviewed", label: "Rozpatrzone" },
  { value: "dismissed", label: "Odrzucone" },
  { value: "all", label: "Wszystkie" },
];

const ACTION_OPTIONS = [
  { value: "dismiss", label: "Odrzuć zgłoszenie", color: "bg-slate-500" },
  { value: "warn", label: "Wyślij ostrzeżenie", color: "bg-amber-500" },
  { value: "delete_content", label: "Usuń treść", color: "bg-orange-500" },
  { value: "ban_temp", label: "Ban czasowy", color: "bg-red-500" },
  { value: "ban_permanent", label: "Ban stały", color: "bg-red-800" },
];

export default function AdminReports() {
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

  const loadReports = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/admin/reports?status_filter=${statusFilter}&limit=50`
      );
      setReports(data);
    } catch {
      toast.error("Nie udało się pobrać zgłoszeń");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [statusFilter]);

  const handleAction = async (reportId) => {
    if (!actionForm.action_type) {
      toast.error("Wybierz akcję");
      return;
    }
    try {
      await api.post(`/admin/reports/${reportId}/action`, actionForm);
      toast.success("Akcja wykonana");
      setActing(null);
      setActionForm({
        action_type: "",
        reason: "",
        ban_hours: 24,
        warning_message: "",
      });
      loadReports();
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Błąd akcji";
      toast.error(Array.isArray(msg) ? msg[0]?.msg ?? "Błąd" : msg);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">🚩 Zgłoszenia</h1>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
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
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm">Ładowanie...</p>
      ) : reports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-600 font-medium">Brak zgłoszeń</p>
          <p className="text-slate-400 text-sm mt-1">
            {statusFilter === "pending"
              ? "Kolejka zgłoszeń jest pusta"
              : "Brak zgłoszeń w tym statusie"}
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
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {report.status}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {report.target_type}
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      {report.reason}
                    </span>
                    {report.report_count > 1 && (
                      <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">
                        🔥 {report.report_count}× zgłoszono
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Zgłosił: <strong>{report.reporter_name}</strong> ·{" "}
                    {new Date(report.created_at).toLocaleString("pl-PL")}
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
                    {acting === report.id ? "Anuluj" : "Rozpatrz"}
                  </button>
                )}
              </div>

              {report.target_preview && (
                <div className="bg-slate-50 rounded-xl px-4 py-3 mb-3 text-sm text-slate-600 border border-slate-200">
                  {report.target_preview}
                </div>
              )}
              {report.description && (
                <p className="text-sm text-slate-500 italic mb-3">
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
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {actionForm.action_type === "ban_temp" && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600 flex-shrink-0">
                        Czas bana (godziny):
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
                        className="w-24 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-zebra-500"
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
                      placeholder="Treść ostrzeżenia dla użytkownika..."
                      rows={2}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zebra-500"
                    />
                  )}
                  <textarea
                    value={actionForm.reason}
                    onChange={(e) =>
                      setActionForm((f) => ({ ...f, reason: e.target.value }))
                    }
                    placeholder="Notatka wewnętrzna (opcjonalnie)..."
                    rows={2}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-zebra-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAction(report.id)}
                    disabled={!actionForm.action_type}
                    className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm px-5 py-2 rounded-xl transition"
                  >
                    Wykonaj akcję
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
