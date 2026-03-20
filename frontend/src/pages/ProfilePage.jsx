import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import NickInput from "../components/auth/NickInput";
import api from "../services/api";
import { useProfile } from "../hooks/useProfile";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";

const nameSchema = z.object({
  display_name: z
    .string()
    .min(3, "Min. 3 znaki")
    .max(30, "Max. 30 znaków")
    .regex(/^[a-zA-Z0-9_-]+$/, "Dozwolone: litery, cyfry, _ i -")
    .transform((v) => v.trim()),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Podaj aktualne hasło"),
    new_password: z.string().min(8, "Min. 8 znaków"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Hasła nie są identyczne",
    path: ["confirm_password"],
  });

export default function ProfilePage() {
  const { t, i18n } = useTranslation(["app", "auth"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const { user, fetchMe } = useAuthStore();
  const { group, loading } = useProfile();
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [nickValue, setNickValue] = useState(user?.display_name ?? "");
  const [nickStatus, setNickStatus] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  useEffect(() => {
    if (editingName) {
      setNickValue(user?.display_name ?? "");
      setNickStatus(null);
    }
  }, [editingName, user?.display_name]);

  const nameSchemaParsed = nameSchema.safeParse({ display_name: nickValue.trim() });
  const nameValid = nameSchemaParsed.success;
  const nameError = nameSchemaParsed.success ? null : nameSchemaParsed.error?.errors?.[0]?.message ?? null;
  const canSaveName =
    nameValid &&
    (nickStatus === "available" ||
      (nickStatus === null &&
        user?.display_name &&
        nickValue.trim().toLowerCase() === user.display_name.toLowerCase()));
  const nameSubmitDisabled = !canSaveName || nameSaving;

  const {
    register: regPwd,
    handleSubmit: submitPwd,
    reset: resetPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSaving },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const onSaveName = async (e) => {
    e.preventDefault();
    const parsed = nameSchema.safeParse({ display_name: nickValue.trim() });
    if (!parsed.success) return;
    setNameSaving(true);
    try {
      await api.patch("/auth/me", { display_name: parsed.data.display_name });
      await fetchMe();
      setEditingName(false);
      setNickValue(user?.display_name ?? "");
      setNickStatus(null);
      toast.success(t("profile.saveNameSuccess"));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "object" && detail?.message
          ? detail.message
          : detail || t("profile.saveNameError");
      toast.error(msg);
    } finally {
      setNameSaving(false);
    }
  };

  const onChangePassword = async (data) => {
    try {
      await api.patch("/auth/me/password", {
        current_password: data.current_password,
        new_password: data.new_password,
      });
      resetPwd();
      setEditingPassword(false);
      toast.success(t("profile.passwordSuccess"));
    } catch (err) {
      toast.error(err.response?.data?.detail || t("profile.passwordError"));
    }
  };

  return (
    <AppShell>
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t("profile.title")}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
          {t("profile.subtitle")}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-8">
          {/* Lewa kolumna: dane użytkownika i grupa */}
          <div className="space-y-4">
            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <Avatar name={user?.display_name} size="lg" className="mb-4" />
                <p className="font-semibold text-slate-800 dark:text-slate-100 text-lg">
                  {user?.display_name}
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500">{user?.email}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  {t("profile.memberSince")}{" "}
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString(locale, {
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
              <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 text-sm">
                {t("profile.myGroup")}
              </h2>
              {loading ? (
                <SkeletonCard />
              ) : group ? (
                <div>
                  <Link
                    to={`/groups/${group.id}`}
                    className="text-zebra-600 dark:text-teal-400 font-medium hover:underline"
                  >
                    {group.name}
                  </Link>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                    {t(
                      group.member_count === 1 ? "profile.member" : "profile.members",
                      { count: group.member_count }
                    )}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-400 dark:text-slate-500 text-sm mb-3">
                    {t("profile.noGroup")}
                  </p>
                  <Link to="/symptoms/new">
                    <Button variant="secondary" size="sm">
                      {t("profile.describeToJoin")}
                    </Button>
                  </Link>
                </div>
              )}
            </section>
          </div>

          {/* Prawa kolumna: bezpieczeństwo i strefa niebezpieczna */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
              <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-4">
                {t("profile.security")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                {t("profile.account")}
              </p>
              {editingName ? (
                <form onSubmit={onSaveName} className="space-y-3">
                  <NickInput
                    label={t("profile.nickLabel")}
                    value={nickValue}
                    onChange={setNickValue}
                    currentNick={user?.display_name}
                    onStatusChange={setNickStatus}
                    error={nameError}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={nameSubmitDisabled}
                      loading={nameSaving}
                    >
                      {t("profile.save")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      type="button"
                      onClick={() => {
                        setEditingName(false);
                        setNickValue(user?.display_name ?? "");
                        setNickStatus(null);
                      }}
                    >
                      {t("profile.cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-slate-800 dark:text-slate-100 font-medium">
                    {user?.display_name}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingName(true)}
                  >
                    {t("profile.change")}
                  </Button>
                </div>
              )}

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-6 mb-3">
                {t("profile.changePassword")}
              </p>
              {editingPassword ? (
                <form onSubmit={submitPwd(onChangePassword)} className="space-y-3">
                  <Input
                    label={t("profile.currentPassword")}
                    type="password"
                    error={pwdErrors.current_password?.message}
                    {...regPwd("current_password")}
                  />
                  <Input
                    label={t("profile.newPassword")}
                    type="password"
                    hint={t("register.passwordHint")}
                    error={pwdErrors.new_password?.message}
                    {...regPwd("new_password")}
                  />
                  <Input
                    label={t("profile.confirmPassword")}
                    type="password"
                    error={pwdErrors.confirm_password?.message}
                    {...regPwd("confirm_password")}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" loading={pwdSaving}>
                      {t("profile.changePasswordAction")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingPassword(false);
                        resetPwd();
                      }}
                    >
                      {t("profile.cancel")}
                    </Button>
                  </div>
                </form>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingPassword(true)}
                >
                  {t("profile.changePasswordAction")}
                </Button>
              )}
            </section>

            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800 p-6">
              <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {t("profile.dangerZone")}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                {t("profile.dangerZoneDesc")}
              </p>
              <Button
                variant="danger"
                size="sm"
                onClick={() =>
                  toast.error(t("profile.deactivateSoon"))
                }
              >
                {t("profile.deactivateAccount")}
              </Button>
            </section>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
