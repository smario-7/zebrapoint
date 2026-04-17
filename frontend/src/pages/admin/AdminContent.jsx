import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";
import Button from "../../components/ui/Button";

export default function AdminContent() {
  const { t } = useTranslation("admin");
  const [posts, setPosts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminApi.posts({
        status: statusFilter || undefined,
        limit: 80,
      });
      setPosts(rows || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function removePost(id) {
    if (!window.confirm(t("v2content.confirmRemove"))) return;
    setRemoving(id);
    try {
      await adminApi.deletePost(id);
      toast.success(t("v2content.removed"));
      load();
    } catch {
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("v2content.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("v2content.subtitle")}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { value: "", label: t("v2content.filterAll") },
          { value: "published", label: t("v2content.filterPublished") },
          { value: "draft", label: t("v2content.filterDraft") },
          { value: "removed", label: t("v2content.filterRemoved") },
        ].map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              statusFilter === f.value
                ? "bg-zebra-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2content.colTitle")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2content.colStatus")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2content.colComments")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2content.colCreated")}</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2content.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2content.loading")}
                </td>
              </tr>
            ) : posts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2content.empty")}
                </td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 max-w-xs truncate">{p.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs">{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{p.comment_count}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {new Date(p.created_at).toLocaleString("pl-PL")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {p.status !== "removed" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        loading={removing === p.id}
                        onClick={() => removePost(p.id)}
                      >
                        {t("v2content.softDelete")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
