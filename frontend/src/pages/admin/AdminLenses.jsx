import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function AdminLenses() {
  const { t } = useTranslation("admin");
  const [lenses, setLenses] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [activeOnly, setActiveOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newEmoji, setNewEmoji] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminApi.lenses({
        type: typeFilter || undefined,
        active_only: activeOnly,
        limit: 200,
      });
      setLenses(rows || []);
    } catch {
      setLenses([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, activeOnly]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(lensId) {
    setBusyId(lensId);
    try {
      await adminApi.toggleLens(lensId);
      toast.success(t("v2lenses.toggled"));
      load();
    } catch {
    } finally {
      setBusyId(null);
    }
  }

  async function createTopical(e) {
    e.preventDefault();
    if (!newName.trim()) {
      toast.error(t("v2lenses.nameRequired"));
      return;
    }
    setCreating(true);
    try {
      await adminApi.createLens({
        name: newName.trim(),
        description: newDesc.trim() || null,
        emoji: newEmoji.trim() || null,
        type: "topical",
      });
      toast.success(t("v2lenses.created"));
      setNewName("");
      setNewDesc("");
      setNewEmoji("");
      load();
    } catch {
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("v2lenses.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("v2lenses.subtitle")}</p>

      <form
        onSubmit={createTopical}
        className="mb-8 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3 max-w-xl"
      >
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t("v2lenses.newTopical")}</p>
        <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("v2lenses.namePlaceholder")} />
        <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder={t("v2lenses.descPlaceholder")} />
        <Input value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} placeholder={t("v2lenses.emojiPlaceholder")} />
        <Button type="submit" loading={creating}>
          {t("v2lenses.createBtn")}
        </Button>
      </form>

      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { value: "", label: t("v2lenses.filterAll") },
          { value: "diagnostic", label: t("v2lenses.filterDiagnostic") },
          { value: "symptomatic", label: t("v2lenses.filterSymptomatic") },
          { value: "topical", label: t("v2lenses.filterTopical") },
        ].map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              typeFilter === f.value
                ? "bg-zebra-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
        <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 ml-2">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          {t("v2lenses.activeOnly")}
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2lenses.colLens")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2lenses.colType")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2lenses.colPosts")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2lenses.colEmbed")}</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2lenses.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2lenses.loading")}
                </td>
              </tr>
            ) : lenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2lenses.empty")}
                </td>
              </tr>
            ) : (
              lenses.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <span className="mr-2">{l.emoji || "·"}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{l.name}</span>
                    {!l.is_active && (
                      <span className="ml-2 text-xs text-amber-600">({t("v2lenses.inactive")})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{l.type}</td>
                  <td className="px-4 py-3">{l.post_count}</td>
                  <td className="px-4 py-3">{l.embedding_ready ? "✓" : "…"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      loading={busyId === l.id}
                      onClick={() => toggle(l.id)}
                    >
                      {l.is_active ? t("v2lenses.deactivate") : t("v2lenses.activate")}
                    </Button>
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
