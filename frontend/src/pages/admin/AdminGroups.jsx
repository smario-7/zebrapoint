import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

export default function AdminGroups() {
  const { t } = useTranslation("admin");
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/admin/groups")
      .then(({ data }) => setGroups(data))
      .catch(() => toast.error(t("groups.loadError")))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">{t("groups.loading")}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {t("groups.title")}
      </h1>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {[t("groups.headers.name"), t("groups.headers.participants"), t("groups.headers.category"), t("groups.headers.keywords")].map(
                (h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((g) => (
              <tr key={g.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">{g.name}</td>
                <td className="px-4 py-3 text-slate-600">{g.member_count}</td>
                <td className="px-4 py-3 text-slate-600">{g.symptom_category ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{g.keywords ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
