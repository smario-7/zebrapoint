import { useState, useEffect, useMemo } from "react";
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
import HpoSearch from "../components/profile/HpoSearch";
import OrphaSearch from "../components/profile/OrphaSearch";
import api, { API_V2_AUTH_BASE } from "../services/api";
import { useTranslation } from "react-i18next";

function createNameSchema(t) {
  return z.object({
    display_name: z
      .string()
      .min(3, t("validation.minChars", { ns: "auth" }))
      .max(30, t("validation.maxChars", { ns: "auth" }))
      .regex(/^[a-zA-Z0-9_-]+$/, t("validation.allowedChars", { ns: "auth" }))
      .transform((v) => v.trim()),
  });
}

function createPasswordSchema(t) {
  return z
    .object({
      current_password: z.string().min(1, t("profile.currentPasswordRequired")),
      new_password: z
        .string()
        .min(8, t("validation.minPassword", { ns: "auth" })),
      confirm_password: z.string(),
    })
    .refine((d) => d.new_password === d.confirm_password, {
      message: t("validation.passwordsMismatch", { ns: "auth" }),
      path: ["confirm_password"],
    });
}

export default function ProfilePage() {
  const { t, i18n } = useTranslation(["app", "auth"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const { user, fetchMe } = useAuthStore();
  const [editingName, setEditingName] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [nickValue, setNickValue] = useState(user?.display_name ?? "");
  const [nickStatus, setNickStatus] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);

  const [symptomText, setSymptomText] = useState("");
  const [hpoTerms, setHpoTerms] = useState([]);
  const [diagnosisConfirmed, setDiagnosisConfirmed] = useState(false);
  const [orphaId, setOrphaId] = useState(null);
  const [orphaLabel, setOrphaLabel] = useState("");
  const [searchable, setSearchable] = useState(false);
  const [consentSearchable, setConsentSearchable] = useState(false);
  const [locationCity, setLocationCity] = useState("");
  const [locationCountry, setLocationCountry] = useState("PL");
  const [healthSaving, setHealthSaving] = useState(false);

  useEffect(() => {
    if (editingName) {
      setNickValue(user?.display_name ?? "");
      setNickStatus(null);
    }
  }, [editingName, user?.display_name]);

  useEffect(() => {
    if (!user) return;
    setSymptomText(user.symptom_description || "");
    setHpoTerms(
      (user.hpo_profile || []).map((x) => ({
        hpo_id: x.hpo_id,
        label_pl: x.label_pl ?? null,
        label_en: x.label_en || "",
      }))
    );
    setDiagnosisConfirmed(!!user.diagnosis_confirmed);
    setOrphaId(user.orpha_id ?? null);
    setOrphaLabel(
      user.orpha_disease
        ? user.orpha_disease.name_pl || user.orpha_disease.name_en
        : ""
    );
    setSearchable(!!user.searchable);
    setConsentSearchable(!!user.consent_searchable_info);
    setLocationCity(user.location_city || "");
    setLocationCountry(user.location_country || "PL");
  }, [user]);

  const nameSchema = useMemo(() => createNameSchema(t), [t]);
  const passwordSchema = useMemo(() => createPasswordSchema(t), [t]);

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
      await api.patch(`${API_V2_AUTH_BASE}/me`, { username: parsed.data.display_name });
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
      await api.patch(`${API_V2_AUTH_BASE}/me/password`, {
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

  const saveHealthProfile = async () => {
    if (diagnosisConfirmed && (orphaId == null || orphaId === undefined)) {
      toast.error(t("profile.diagnosisOrphaRequired"));
      return;
    }
    setHealthSaving(true);
    try {
      await api.patch(`${API_V2_AUTH_BASE}/me/health-profile`, {
        symptom_description: symptomText.trim() || null,
        hpo_ids: hpoTerms.map((x) => x.hpo_id),
        diagnosis_confirmed: diagnosisConfirmed,
        orpha_id: diagnosisConfirmed ? orphaId : null,
        consent_searchable_info: consentSearchable,
        searchable,
        location_city: locationCity.trim(),
        location_country: locationCountry.trim() || "PL",
      });
      await fetchMe();
      toast.success(t("profile.healthSaveToast"));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((x) => x.msg || JSON.stringify(x)).join("; ")
          : t("profile.healthSaveError");
      toast.error(msg);
    } finally {
      setHealthSaving(false);
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
          {/* Lewa kolumna: podsumowanie konta */}
          <div className="space-y-4">
            <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
              <div className="flex flex-col items-center text-center">
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
                    hint={t("register.passwordHint", { ns: "auth" })}
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

            {user?.onboarding_completed ? (
              <>
                <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t("profile.sectionMedical")}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    {t("profile.sectionMedicalHint")}
                  </p>
                  <div className="space-y-4 text-sm">
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">
                        {t("profile.symptomDescription")}
                      </label>
                      <textarea
                        className="w-full min-h-[120px] rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-100"
                        value={symptomText}
                        onChange={(e) => setSymptomText(e.target.value)}
                        maxLength={20000}
                      />
                      <p className="text-xs text-slate-400 mt-1">
                        {symptomText.length} / 20000
                      </p>
                    </div>
                    <HpoSearch terms={hpoTerms} onTermsChange={setHpoTerms} maxItems={50} />
                    <div className="flex items-center gap-2">
                      <input
                        id="dx-conf"
                        type="checkbox"
                        className="rounded border-slate-300 dark:border-slate-600"
                        checked={diagnosisConfirmed}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setDiagnosisConfirmed(v);
                          if (!v) {
                            setOrphaId(null);
                            setOrphaLabel("");
                          }
                        }}
                      />
                      <label htmlFor="dx-conf" className="text-slate-700 dark:text-slate-200 cursor-pointer">
                        {t("profile.diagnosisToggle")}
                      </label>
                    </div>
                    <OrphaSearch
                      value={orphaId}
                      label={orphaLabel}
                      diagnosisConfirmed={diagnosisConfirmed}
                      onChange={(id, name) => {
                        setOrphaId(id);
                        setOrphaLabel(name || "");
                      }}
                    />
                    <Button type="button" size="sm" loading={healthSaving} onClick={saveHealthProfile}>
                      {t("profile.saveMedical")}
                    </Button>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t("profile.sectionVisibility")}
                  </h2>
                  <div className="space-y-4 text-sm">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300 dark:border-slate-600"
                        checked={searchable}
                        onChange={(e) => {
                          const v = e.target.checked;
                          setSearchable(v);
                          if (v) setConsentSearchable(true);
                        }}
                      />
                      <span className="text-slate-700 dark:text-slate-200">
                        {t("profile.searchableToggle")}
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-slate-300 dark:border-slate-600"
                        checked={consentSearchable}
                        onChange={(e) => setConsentSearchable(e.target.checked)}
                      />
                      <span className="text-slate-700 dark:text-slate-200">
                        {t("profile.consentSearchableToggle")}
                      </span>
                    </label>
                    <Input
                      label={t("profile.locationCity")}
                      value={locationCity}
                      onChange={(e) => setLocationCity(e.target.value)}
                    />
                    <Input
                      label={t("profile.locationCountry")}
                      value={locationCountry}
                      onChange={(e) => setLocationCountry((e.target.value || "PL").toUpperCase().slice(0, 8))}
                    />
                    <Button type="button" size="sm" variant="secondary" loading={healthSaving} onClick={saveHealthProfile}>
                      {t("profile.saveVisibility")}
                    </Button>
                  </div>
                </section>

                <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-6">
                  <h2 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    {t("profile.sectionConsents")}
                  </h2>
                  <label className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-slate-300 dark:border-slate-600"
                      checked={!!user?.consent_data_processing}
                      disabled
                    />
                    <span>
                      {t("profile.consentDataProcessingReadonly")}
                      <span className="block text-xs text-slate-400 mt-1">
                        {t("profile.consentDataProcessingNote")}
                      </span>
                    </span>
                  </label>
                </section>
              </>
            ) : (
              <section className="bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 text-sm text-amber-900 dark:text-amber-100">
                {t("profile.onboardingRequired")}
              </section>
            )}

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
