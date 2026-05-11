import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { adminApi } from "../../api/v2/admin";
import Button from "../../components/ui/Button";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function AdminUsers() {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [banConfirm, setBanConfirm] = useState(null);
  const [banLoading, setBanLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await adminApi.users({
        search: search.trim() || undefined,
        limit: 100,
      });
      setUsers(rows || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, []);

  const handleBanConfirm = async () => {
    if (!banConfirm) return;
    setBanLoading(true);
    try {
      await adminApi.banUser(banConfirm.id, banConfirm.banned);
      toast.success(banConfirm.banned ? t("v2users.banSuccess") : t("v2users.unbanSuccess"));
      setBanConfirm(null);
      loadUsers();
    } catch {
    } finally {
      setBanLoading(false);
    }
  };

  async function changeRole(userId, role) {
    try {
      await adminApi.setUserRole(userId, role);
      toast.success(t("v2users.roleSaved"));
      loadUsers();
    } catch {
    }
  }

  return (
    <div>
      <ConfirmModal
        open={banConfirm !== null}
        title={banConfirm?.banned ? t("v2users.confirmBanTitle") : t("v2users.confirmUnbanTitle")}
        message={
          banConfirm
            ? (banConfirm.banned ? t("v2users.confirmBanMsg", { name: banConfirm.username }) : t("v2users.confirmUnbanMsg", { name: banConfirm.username }))
            : ""
        }
        confirmLabel={t("common:confirm")}
        cancelLabel={t("common:cancel")}
        onConfirm={handleBanConfirm}
        onCancel={() => setBanConfirm(null)}
        loading={banLoading}
      />

      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">{t("v2users.title")}</h1>

      <div className="flex flex-col sm:flex-row gap-2 mb-5 max-w-2xl">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers()}
          placeholder={t("v2users.searchPlaceholder")}
          className="flex-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zebra-500 text-sm"
        />
        <Button type="button" variant="secondary" onClick={loadUsers} loading={loading}>
          {t("v2users.search")}
        </Button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
        <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colUser")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colRole")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colStatus")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colOnboarding")}</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colJoined")}</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("v2users.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  {t("v2users.loading")}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  {t("v2users.empty")}
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{u.username}</p>
                    <p className="text-xs text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    >
                      <option value="user">user</option>
                      <option value="moderator">moderator</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{u.onboarding_completed ? "✓" : "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => setBanConfirm({ id: u.id, username: u.username, banned: true })}
                        className="text-xs text-red-600 hover:underline"
                      >
                        {t("v2users.ban")}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBanConfirm({ id: u.id, username: u.username, banned: false })}
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        {t("v2users.unban")}
                      </button>
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
