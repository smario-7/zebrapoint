import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import useAuthStore from "../store/authStore";
import PublicLayout from "../components/layout/PublicLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

const schema = (t) => z.object({
  email: z.string().email(t("validation.invalidEmail")),
  password: z.string().min(1, t("validation.passwordRequired")),
});

export default function LoginPage() {
  const { t } = useTranslation("auth");
  const { login, isLoading, error } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema(t)),
  });

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);
    if (result.success) {
      const u = useAuthStore.getState().user;
      navigate(u?.onboarding_completed === false ? "/onboarding" : "/dashboard");
    }
  };

  return (
    <PublicLayout
      headerRight={
        <Link
          to="/register"
          className="text-sm font-medium text-[var(--zp-accent-primary)] hover:opacity-80 transition"
        >
          {t("login.noAccount")}
        </Link>
      }
    >
      <div className="flex-1 flex items-center justify-center px-5 py-6 md:py-6 md:px-6">
        <div className="w-full max-w-[520px] rounded-[20px] border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-7 md:p-10 flex flex-col gap-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-bold tracking-tight text-[var(--zp-app-text-primary)]">
              {t("login.title")}
            </h1>
            <p className="text-sm text-[var(--zp-app-text-muted)]">
              {t("login.subtitle")}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label={t("login.email")}
              type="email"
              placeholder={t("login.placeholderEmail")}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={t("login.password")}
              type="password"
              error={errors.password?.message}
              {...register("password")}
            />
            <Button type="submit" fullWidth loading={isLoading} size="md">
              {isLoading ? t("login.loading") : t("login.submit")}
            </Button>
          </form>

          <p className="text-center text-[13px] text-[var(--zp-app-text-muted)] flex items-center justify-center gap-1 flex-wrap">
            {t("login.noAccountShort")}{" "}
            <Link
              to="/register"
              className="font-semibold text-[var(--zp-accent-primary)] hover:underline"
            >
              {t("login.registerLink")}
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
