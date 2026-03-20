import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, useController } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import NickInput from "../components/auth/NickInput";

const schema = (t) => z
  .object({
    display_name: z
      .string()
      .min(3, t("validation.minChars"))
      .max(30, t("validation.maxChars"))
      .regex(/^[a-zA-Z0-9_-]+$/, t("validation.allowedChars")),
    email: z.string().email(t("validation.invalidEmail")),
    password: z.string().min(8, t("validation.minPassword")),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: t("validation.passwordsMismatch"),
    path: ["confirm"],
  });

export default function RegisterPage() {
  const { t } = useTranslation("auth");
  const { register: registerUser, isLoading, error, registerErrorDetail, clearError } = useAuthStore();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema(t)),
  });

  const { field: displayNameField } = useController({
    name: "display_name",
    control,
  });

  useEffect(() => {
    if (registerErrorDetail) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clear only when user changes nick
  }, [displayNameField.value]);

  const onSubmit = async (data) => {
    const result = await registerUser(data.email, data.password, data.display_name);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 1500);
    }
  };

  if (success) {
    return (
      <PublicLayout
        headerRight={
          <Link
            to="/login"
            className="text-sm font-medium text-[var(--zp-accent-primary)] hover:opacity-80 transition"
          >
            {t("register.hasAccount")}
          </Link>
        }
      >
        <div className="flex-1 flex items-center justify-center px-5 py-6 md:px-6">
          <div className="text-center w-full max-w-[540px] rounded-[20px] border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-8">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-[26px] font-bold tracking-tight text-[var(--zp-app-text-primary)]">
              {t("register.successTitle")}
            </h2>
            <p className="text-[var(--zp-app-text-muted)]">{t("register.successRedirect")}</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout
      headerRight={
        <Link
          to="/login"
          className="text-sm font-medium text-[var(--zp-accent-primary)] hover:opacity-80 transition"
        >
          {t("register.hasAccount")}
        </Link>
      }
    >
      <div className="flex-1 flex items-center justify-center px-5 py-6 md:px-6">
        <div className="w-full max-w-[540px] rounded-[20px] border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-7 md:p-10 flex flex-col gap-4 md:gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--zp-app-text-primary)]">
              {t("register.title")}
            </h1>
            <p className="text-sm text-[var(--zp-app-text-muted)]">{t("register.subtitle")}</p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              <p>{error}</p>
              {registerErrorDetail?.field === "display_name" && registerErrorDetail?.suggestions?.length > 0 && (
                <div className="mt-2">
                  <p className="text-[var(--zp-app-text-primary)] text-xs mb-1">{t("register.alternativesLabel")}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {registerErrorDetail.suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setValue("display_name", s)}
                        className="text-xs bg-[var(--zp-app-card)] border border-red-200 dark:border-red-800 hover:opacity-90 text-red-700 dark:text-red-300 px-2.5 py-1 rounded-full transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 md:gap-5">
            <NickInput
              value={displayNameField.value}
              onChange={displayNameField.onChange}
              error={errors.display_name?.message}
            />
            <Input
              label={t("login.email")}
              type="email"
              placeholder={t("login.placeholderEmail")}
              error={errors.email?.message}
              {...register("email")}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-[12px]">
              <Input
                label={t("login.password")}
                type="password"
                placeholder={t("validation.minPassword")}
                hint={t("validation.minPassword")}
                error={errors.password?.message}
                {...register("password")}
              />
              <Input
                label={t("register.repeatPassword")}
                type="password"
                placeholder={t("register.repeatPasswordPlaceholder")}
                error={errors.confirm?.message}
                {...register("confirm")}
              />
            </div>
            <Button type="submit" fullWidth loading={isLoading} size="md">
              {isLoading ? t("register.loading") : t("register.submit")}
            </Button>
          </form>

          <p className="text-center text-[13px] text-[var(--zp-app-text-muted)] flex items-center justify-center gap-1 flex-wrap">
            {t("register.hasAccountShort")}{" "}
            <Link
              to="/login"
              className="font-semibold text-[var(--zp-accent-primary)] hover:underline"
            >
              {t("login.title")}
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
