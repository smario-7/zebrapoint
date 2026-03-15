import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";

function StatCard({ label, value, color, link, urgent }) {
  const content = (
    <div
      className={`bg-white rounded-2xl border p-4 ${
        urgent ? "border-red-300 shadow-sm shadow-red-100" : ""
      }`}
    >
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {urgent && (
        <p className="text-xs text-red-500 mt-1 font-medium">Wymaga uwagi →</p>
      )}
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

export default function AdminDashboard() {
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

  if (loading) return <p className="text-slate-400">Ładowanie...</p>;

  const { reports = {}, pipeline } = stats || {};

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Oczekujące zgłoszenia"
          value={reports.pending ?? 0}
          color="text-red-600"
          link="/admin/reports"
          urgent={(reports.pending ?? 0) > 0}
        />
        <StatCard
          label="Rozpatrzone"
          value={reports.reviewed ?? 0}
          color="text-emerald-600"
        />
        <StatCard
          label="Łącznie zgłoszeń"
          value={reports.total ?? 0}
          color="text-slate-600"
        />
        <StatCard
          label="Ostatni retrain ML"
          value={pipeline ? `${pipeline.clusters_found} grup` : "Brak danych"}
          color="text-zebra-600"
        />
      </div>

      {pipeline && (
        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Ostatni ML Pipeline</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Profiley", value: pipeline.profiles_count },
              { label: "Klastry", value: pipeline.clusters_found },
              { label: "Szum", value: pipeline.noise_count },
              { label: "Przeniesieni", value: pipeline.reassigned },
            ].map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-slate-400 text-xs">{item.label}</p>
                <p className="font-bold text-slate-800 text-lg">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {new Date(pipeline.run_at).toLocaleString("pl-PL")} · {pipeline.duration_ms}ms
            · Status: {pipeline.status}
          </p>
        </div>
      )}
    </div>
  );
}
