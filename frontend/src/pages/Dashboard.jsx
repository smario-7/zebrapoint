import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorMessage from "../components/ui/ErrorMessage";
import { useProfile } from "../hooks/useProfile";
import { useTranslation } from "react-i18next";
import GroupTile from "../components/group/GroupTile";

function TileCard({ to, icon, titleDesktop, titleMobile, subtitleDesktop, subtitleMobile }) {
  return (
    <Link
      to={to}
      className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-5 hover:border-zebra-300 dark:hover:border-teal-600 hover:shadow-sm transition group min-h-[96px]"
    >
      <p className="text-2xl leading-none mb-3">{icon}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100">
        <span className="hidden sm:inline">{titleDesktop}</span>
        <span className="sm:hidden">{titleMobile}</span>
      </p>
      <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">
        <span className="hidden sm:inline">{subtitleDesktop}</span>
        <span className="sm:hidden">{subtitleMobile}</span>
      </p>
    </Link>
  );
}

export default function Dashboard() {
  const { t } = useTranslation("app");
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { group, profile, loading, error, hasProfile, refetch } = useProfile();

  const firstName = user?.display_name?.split(" ")[0] || t("dashboard.userFallback");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0">
            <Avatar name={user?.display_name} size="lg" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {t("dashboard.greeting", { name: firstName })}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {hasProfile
                ? t("dashboard.connectedToGroup")
                : t("dashboard.startWithSymptoms")}
            </p>
          </div>
        </div>

        {error && (
          <ErrorMessage message={error} onRetry={refetch} />
        )}

        {loading && (
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && !hasProfile && (
          <div className="bg-[var(--zp-app-card)] rounded-2xl border border-dashed border-[var(--zp-app-border)] p-10 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              {t("dashboard.describeToJoin")}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-6 max-w-sm mx-auto">
              {t("dashboard.systemWillFind")}
            </p>
            <Link to="/symptoms/new">
              <Button size="lg">{t("dashboard.describeSymptoms")}</Button>
            </Link>
          </div>
        )}

        {!loading && hasProfile && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <GroupTile
                group={group}
                profile={profile}
                onManage={() => navigate("/groups")}
              />

              {group?.id && (
                <>
                  <TileCard
                    to={`/groups/${group.id}`}
                    icon="💬"
                    titleDesktop={t("dashboard.groupChat")}
                    titleMobile={t("dashboard.groupChatShort")}
                    subtitleDesktop={t("dashboard.chatWithMembers")}
                    subtitleMobile={t("dashboard.newMessages")}
                  />
                  <TileCard
                    to={`/groups/${group.id}/forum`}
                    icon="📋"
                    titleDesktop={t("dashboard.groupForum")}
                    titleMobile={t("dashboard.groupForumShort")}
                    subtitleDesktop={t("dashboard.postsAndDiscussions")}
                    subtitleMobile={t("dashboard.newPosts")}
                  />
                </>
              )}
            </div>

            <div className="mt-6 bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-5">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
                {t("dashboard.recentActivity")}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-800 dark:text-slate-100 truncate">
                    {t("dashboard.recentActivityMessage")}
                  </p>
                  <p className="text-xs text-[var(--zp-app-text-muted)]">
                    {t("dashboard.minutesAgo")}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
