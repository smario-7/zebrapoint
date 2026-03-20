import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../services/api";
import AppShell from "../components/layout/AppShell";
import { useTranslation } from "react-i18next";

function createSymptomsSchema(t) {
  return z.object({
    description: z
      .string()
      .min(100, t("symptoms.validationMin"))
      .max(1000, t("symptoms.validationMax")),
  });
}

export default function SymptomsForm() {
  const { t } = useTranslation("app");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const navigate = useNavigate();

  const schema = useMemo(() => createSymptomsSchema(t), [t]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ resolver: zodResolver(schema) });

  const description = watch("description", "");
  const charCount = description.length;
  const isValid = charCount >= 100 && charCount <= 1000;

  const onSubmit = async (formData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const { data } = await api.post("/symptoms/", formData);
      setMatchResult(data.match);
      setTimeout(() => {
        navigate(`/groups/${data.match.group_id}`);
      }, 2200);
    } catch (err) {
      const msg = err.response?.data?.detail || t("symptoms.submitError");
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (matchResult) {
    return (
      <AppShell>
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 max-w-md w-full text-center">
            <div className="text-6xl mb-4">
              {matchResult.is_new ? "🌱" : "🦓"}
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {matchResult.is_new
                ? t("symptoms.creatingGroup")
                : t("symptoms.foundGroup")}
            </h2>
            {!matchResult.is_new && (
              <p className="text-zebra-600 dark:text-teal-400 font-medium mb-2">
                {matchResult.group_name}
              </p>
            )}
            {matchResult.score > 0 && (
              <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
                {t("symptoms.similarity", { percent: Math.round(matchResult.score * 100) })}
              </p>
            )}
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t("symptoms.redirecting")}
            </p>
            <div className="mt-4 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-zebra-500 dark:bg-teal-400 animate-pulse rounded-full w-full" />
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <Link
            to="/dashboard"
            className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 mb-4 inline-block"
          >
            {t("symptoms.backDashboard")}
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            {t("symptoms.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {t("symptoms.subtitle")}
          </p>
        </div>

        <div className="bg-zebra-50 dark:bg-teal-900/20 border border-zebra-100 dark:border-teal-800 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-zebra-700 dark:text-teal-400 uppercase tracking-wide mb-2">
            {t("symptoms.whatToDescribe")}
          </p>
          <ul className="space-y-1">
            {[t("symptoms.hint1"), t("symptoms.hint2"), t("symptoms.hint3"), t("symptoms.hint4"), t("symptoms.hint5")].map((hint, i) => (
              <li key={i} className="text-sm text-zebra-800 dark:text-teal-200 flex gap-2">
                <span className="text-zebra-400 dark:text-teal-500">•</span>
                {hint}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          {apiError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
              {apiError}
            </div>
          )}

          <textarea
            {...register("description")}
            placeholder={t("symptoms.placeholder")}
            className={`w-full h-52 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 transition bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
              errors.description
                ? "border-red-300 dark:border-red-700 focus:ring-red-400"
                : "border-slate-200 dark:border-slate-600 focus:ring-zebra-500 dark:focus:ring-teal-400"
            }`}
          />

          <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-sm min-h-[20px]">
              <span className="text-red-500 dark:text-red-400">{errors.description?.message}</span>
              {!errors.description?.message && (
                <span className={charCount < 100 ? "text-slate-400 dark:text-slate-500" : "text-zebra-600 dark:text-teal-400"}>
                  {charCount < 100 ? t("symptoms.minChars") : ""}
                </span>
              )}
            </span>
            <span className={`text-sm font-mono ${
              charCount > 1000
                ? "text-red-500 dark:text-red-400"
                : charCount >= 100
                ? "text-zebra-600 dark:text-teal-400"
                : "text-slate-400 dark:text-slate-500"
            }`}>
              {charCount} / 1000
            </span>
          </div>

          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charCount > 1000
                  ? "bg-red-400"
                  : charCount >= 100
                  ? "bg-zebra-500 dark:bg-teal-400"
                  : "bg-slate-300 dark:bg-slate-600"
              }`}
              style={{ width: `${Math.min((charCount / 1000) * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="w-full bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white dark:text-slate-900 font-semibold py-3 rounded-xl transition"
          >
            {isLoading ? t("symptoms.loading") : t("symptoms.submit")}
          </button>

          {isLoading && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3">
              {t("symptoms.analyzing")}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
