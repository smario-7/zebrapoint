import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useTranslation } from "react-i18next";
import ErrorMessage from "../components/ui/ErrorMessage";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useProfile } from "../hooks/useProfile";
import { useGroupManagement } from "../hooks/useGroupManagement";
import SymptomEditor from "../components/group/SymptomEditor";
import { LensCard } from "../components/v2/LensCard";
import { lensesApi } from "../api/v2/lenses";

export default function GroupsPage() {
  const { t } = useTranslation("app");
  const navigate = useNavigate();

  const { profile, loading, error, refetch } = useProfile();
  const { updatingDesc, updateDescription } = useGroupManagement({ onGroupChanged: refetch });

  const [lenses, setLenses] = useState(null);

  useEffect(() => {
    let cancelled = false;
    lensesApi
      .list("all", 50, 0)
      .then((rows) => {
        if (!cancelled) setLenses(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setLenses([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadingLenses = lenses === null;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t("groups.title")}
            </h1>
            <p className="text-sm text-[var(--zp-app-text-muted)] mt-1">
              {t("groups.v2PageSubtitle")}
            </p>
          </div>
          <Link
            to="/lenses"
            className="text-sm font-semibold text-zebra-600 dark:text-teal-400 hover:underline shrink-0"
          >
            {t("groups.allLensesLink")}
          </Link>
        </div>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)]">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t("groups.symptomsSection")}
                </p>
                <SymptomEditor
                  description={profile?.description}
                  onSave={updateDescription}
                  saving={updatingDesc}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  {t("groups.lensesMatched")}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                {t("groups.lensesHint")}
              </p>

              {loadingLenses ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : lenses.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-600/50">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t("groups.noLensesYet")}
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {lenses.map((lens) => (
                    <LensCard
                      key={lens.id}
                      lens={lens}
                      onClick={() => navigate("/lenses", { state: { lensId: lens.id } })}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
