import { useState, useEffect } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ConfirmModal from "../../components/ui/ConfirmModal";

export default function AdminUsers() {
  const { t, i18n } = useTranslation(["admin", "common"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [unbanConfirm, setUnbanConfirm] = useState(null);
  const [unbanLoading, setUnbanLoading] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const { data } = await api.get(`/admin/users${params}`);
      setUsers(data);
    } catch {
      toast.error(t("users.loadError"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tylko pierwsze wczytanie listy
  }, []);

  const handleUnbanConfirm = async () => {
    if (!unbanConfirm) return;
    setUnbanLoading(true);
    try {
      await api.post(`/admin/users/${unbanConfirm.userId}/unban`);
      toast.success(t("users.unbanSuccess", { name: unbanConfirm.displayName }));
      setUnbanConfirm(null);
      loadUsers();
    } catch {
      toast.error(t("users.unbanError"));
    } finally {
      setUnbanLoading(false);
    }
  };

  return (
    <div>
      <ConfirmModal
        open={unbanConfirm !== null}
        title={t("users.unban")}
        message={
          unbanConfirm
            ? t("users.unbanConfirm", { name: unbanConfirm.displayName })
            : ""
        }
        confirmLabel={t("common:confirm")}
        cancelLabel={t("common:cancel")}
        onConfirm={handleUnbanConfirm}
        onCancel={() => setUnbanConfirm(null)}
        loading={unbanLoading}
      />
      <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">{t("users.title")}</h1>
      <div className="flex gap-2 mb-5">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadUsers()}
          placeholder={t("users.searchPlaceholder")}
          className="flex-1 border border-slate-200 dark:border-slate-600 dark:bg-slate-900 rounded-xl px-4 py-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-zebra-500 text-sm"
        />
        <button
          type="button"
          onClick={loadUsers}
          className="bg-zebra-600 text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-zebra-700 transition text-sm"
        >
          {t("users.search")}
        </button>
      </div>
      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              {[
                t("users.headers.user"),
                t("users.headers.role"),
                t("users.headers.status"),
                t("users.headers.warnings"),
                t("users.headers.reports"),
                t("users.headers.actions"),
              ].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide"
                  >
                    {h}
                  </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  {t("users.loading")}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{user.display_name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        user.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned ? (
                      <div>
                        <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {t("users.banned")}
                        </span>
                        {user.banned_until && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {t("users.until")}{" "}
                            {new Date(user.banned_until).toLocaleDateString(locale)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">
                        {t("users.active")}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        user.warning_count > 0
                          ? "text-amber-600 font-bold"
                          : "text-slate-400"
                      }
                    >
                      {user.warning_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={
                        user.report_count > 0
                          ? "text-red-600 font-bold"
                          : "text-slate-400"
                      }
                    >
                      {user.report_count}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_banned && (
                      <button
                        type="button"
                        onClick={() =>
                          setUnbanConfirm({
                            userId: user.user_id,
                            displayName: user.display_name,
                          })
                        }
                        className="text-xs text-emerald-600 hover:underline"
                      >
                        {t("users.unban")}
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
