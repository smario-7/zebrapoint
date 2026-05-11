import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";

export default function AdminProposals() {
  const { t } = useTranslation("admin");
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [rejectId, setRejectId] = useState(null);
  const [rejectComment, setRejectComment] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminApi.proposals({ status: statusFilter || undefined });
      setItems(rows || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id) {
    setBusyId(id);
    try {
      await adminApi.approveProposal(id);
      toast.success(t("v2proposals.approved"));
      load();
    } catch {
    } finally {
      setBusyId(null);
    }
  }

  async function submitReject(e) {
    e.preventDefault();
    if (!rejectId) return;
    const c = rejectComment.trim();
    if (!c) {
      toast.error(t("v2proposals.commentRequired"));
      return;
    }
    setBusyId(rejectId);
    try {
      await adminApi.rejectProposal(rejectId, c);
      toast.success(t("v2proposals.rejected"));
      setRejectId(null);
      setRejectComment("");
      load();
    } catch {
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">{t("v2proposals.title")}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{t("v2proposals.subtitle")}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {[
          { value: "pending", label: t("v2proposals.filterPending") },
          { value: "approved", label: t("v2proposals.filterApproved") },
          { value: "rejected", label: t("v2proposals.filterRejected") },
          { value: "", label: t("v2proposals.filterAll") },
        ].map((f) => (
          <button
            key={f.value || "all"}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
              statusFilter === f.value
                ? "bg-zebra-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rejectId && (
        <form
          onSubmit={submitReject}
          className="mb-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-amber-50 dark:bg-amber-950/30 p-4 max-w-lg space-y-2"
        >
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("v2proposals.rejectTitle")}</p>
          <Input
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder={t("v2proposals.rejectPlaceholder")}
          />
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" loading={busyId === rejectId}>
              {t("v2proposals.sendReject")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => { setRejectId(null); setRejectComment(""); }}>
              {t("v2proposals.cancel")}
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2proposals.colName")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2proposals.colAuthor")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2proposals.colType")}</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2proposals.colStatus")}</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">{t("v2proposals.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2proposals.loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {t("v2proposals.empty")}
                </td>
              </tr>
            ) : (
              items.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100 max-w-[200px]">
                    <div className="truncate">{p.name}</div>
                    <div className="text-xs text-slate-500 font-normal line-clamp-2">{p.justification}</div>
                  </td>
                  <td className="px-4 py-3">{p.proposer_username}</td>
                  <td className="px-4 py-3">{p.type}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-xs">{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {p.status === "pending" && (
                      <>
                        <Button size="sm" type="button" loading={busyId === p.id} onClick={() => approve(p.id)}>
                          {t("v2proposals.approve")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          type="button"
                          disabled={busyId !== null}
                          onClick={() => { setRejectId(p.id); setRejectComment(""); }}
                        >
                          {t("v2proposals.reject")}
                        </Button>
                      </>
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
