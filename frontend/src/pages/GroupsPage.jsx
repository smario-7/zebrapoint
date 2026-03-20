import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useTranslation } from "react-i18next";
import ErrorMessage from "../components/ui/ErrorMessage";
import { SkeletonCard } from "../components/ui/Skeleton";
import { useProfile } from "../hooks/useProfile";
import { useGroupManagement } from "../hooks/useGroupManagement";
import SymptomEditor from "../components/group/SymptomEditor";
import GroupMatchMini from "../components/group/GroupMatchMini";

export default function GroupsPage() {
  const { t } = useTranslation("app");

  const { profile, group, loading, error, refetch } = useProfile();
  const {
    matches,
    loadingMatches,
    changingGroup,
    updatingDesc,
    loadMatches,
    updateDescription,
    changeGroup,
  } = useGroupManagement({ onGroupChanged: refetch });

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  const realMatches = useMemo(() => {
    return matches.filter(
      (m) => !m.is_new_group && m.group_id !== "__new__"
    );
  }, [matches]);

  const accentColor = group?.accent_color || "#0d9488";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t("groupDrawer.title")}
            </h1>
            <p className="text-sm text-[var(--zp-app-text-muted)] mt-1">
              {t("groups.subtitle")}
            </p>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={refetch} />}

        {loading ? (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">
                  {t("groupDrawer.currentGroup")}
                </p>
                {group ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0"
                        style={{
                          backgroundColor: `${accentColor}22`,
                          border: `2px solid ${accentColor}44`,
                        }}
                      >
                        <div
                          className="w-full h-full rounded-xl opacity-60"
                          style={{ backgroundColor: accentColor }}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-100">
                          {group.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {group.symptom_category || t("groupDrawer.general")} ·{" "}
                          {t("groupDrawer.members", {
                            count: group.member_count ?? 0,
                          })}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/groups/${group.id}`}
                      className="text-sm font-semibold text-zebra-600 dark:text-teal-400 hover:text-zebra-700 dark:hover:text-teal-300 transition flex-shrink-0 flex items-center gap-1"
                    >
                      {t("groupDrawer.chatLink")}
                    </Link>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 dark:text-slate-500 italic">
                    {t("groupDrawer.noGroup")}
                  </p>
                )}
              </div>

              <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-700">
                <SymptomEditor
                  description={profile?.description}
                  onSave={updateDescription}
                  saving={updatingDesc}
                />
              </div>

              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    {t("groupDrawer.nearestGroups")}
                  </p>
                  {!loadingMatches && realMatches.length > 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {t("groupDrawer.basedOnDescription")}
                    </p>
                  )}
                </div>

                {loadingMatches ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                ) : realMatches.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/30 rounded-2xl border border-slate-100 dark:border-slate-600/50">
                    <p className="text-4xl mb-2">🔍</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                      {profile ? t("groupDrawer.noMatches") : t("groupDrawer.fillFormFirst")}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {profile ? t("groupDrawer.noMatchesHint") : t("groupDrawer.fillFormHint")}
                    </p>
                    {!profile && (
                      <Link
                        to="/symptoms/new"
                        className="inline-block mt-3 text-sm font-semibold text-zebra-600 dark:text-teal-400 hover:text-zebra-700 dark:hover:text-teal-300"
                      >
                        {t("groupDrawer.goToForm")}
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {realMatches.map((match) => (
                      <GroupMatchMini
                        key={match.group_id}
                        match={match}
                        isCurrentGroup={match.group_id === group?.id}
                        isChanging={changingGroup}
                        onSelect={(m) => changeGroup(m, profile?.id)}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-600/40">
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
                    {t("groupDrawer.matchNote")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

