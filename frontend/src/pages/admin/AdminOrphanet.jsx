import { useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function AdminOrphanet() {
  const { t } = useTranslation("admin");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(null);

  async function search(e) {
    e.preventDefault();
    if (q.trim().length < 2) {
      toast.error(t("v2orphanet.minChars"));
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const rows = await adminApi.orphanetSearch(q.trim());
      setResults(rows || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function importDisease(orphaId) {
    setImporting(orphaId);
    try {
      await adminApi.orphanetImport(orphaId);
      toast.success(t("v2orphanet.imported"));
      if (q.trim().length >= 2) {
        const rows = await adminApi.orphanetSearch(q.trim());
        setResults(rows || []);
      }
    } catch {
    } finally {
      setImporting(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("v2orphanet.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("v2orphanet.subtitle")}</p>

      <form onSubmit={search} className="flex flex-col sm:flex-row gap-2 mb-6 max-w-2xl">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("v2orphanet.searchPlaceholder")}
          className="flex-1"
        />
        <Button type="submit" loading={searching}>
          {t("v2orphanet.search")}
        </Button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2orphanet.colCode")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2orphanet.colName")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2orphanet.colHpo")}</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2orphanet.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {results.length === 0 && !searching && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {t("v2orphanet.hint")}
                </td>
              </tr>
            )}
            {results.map((r) => (
              <tr key={r.orpha_id}>
                <td className="px-4 py-3 font-mono text-xs">{r.orpha_code}</td>
                <td className="px-4 py-3 text-slate-800 dark:text-slate-100">{r.name_pl || r.name_en}</td>
                <td className="px-4 py-3">{r.hpo_count}</td>
                <td className="px-4 py-3 text-right">
                  {r.already_imported ? (
                    <span className="text-xs text-slate-400">{t("v2orphanet.inDb")}</span>
                  ) : (
                    <Button
                      size="sm"
                      type="button"
                      loading={importing === r.orpha_id}
                      onClick={() => importDisease(r.orpha_id)}
                    >
                      {t("v2orphanet.import")}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
