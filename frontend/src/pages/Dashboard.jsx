import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import { SkeletonCard } from "../components/ui/Skeleton";
import ErrorMessage from "../components/ui/ErrorMessage";
import { useProfile } from "../hooks/useProfile";
import { useGroupManagement } from "../hooks/useGroupManagement";
import GroupTile from "../components/group/GroupTile";
import GroupDrawer from "../components/group/GroupDrawer";

export default function Dashboard() {
  const { user } = useAuthStore();
  const { profile, group, loading, error, hasProfile, refetch } = useProfile();
  const {
    isOpen,
    matches,
    loadingMatches,
    changingGroup,
    updatingDesc,
    openDrawer,
    closeDrawer,
    updateDescription,
    changeGroup,
  } = useGroupManagement({ onGroupChanged: refetch });

  const firstName = user?.display_name?.split(" ")[0] || "Użytkowniku";

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Avatar name={user?.display_name} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Cześć, {firstName}! 👋
            </h1>
            <p className="text-slate-400 text-sm">
              {hasProfile
                ? "Jesteś połączony z grupą wsparcia"
                : "Zacznij od opisania objawów"}
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
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <div className="text-5xl mb-4">📝</div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">
              Opisz objawy, żeby dołączyć do grupy
            </h2>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              System znajdzie osoby z podobnymi doświadczeniami
              i połączy Was w prywatnej grupie wsparcia.
            </p>
            <Link to="/symptoms/new">
              <Button size="lg">Opisz objawy →</Button>
            </Link>
          </div>
        )}

        {!loading && hasProfile && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <GroupTile
              group={group}
              profile={profile}
              onManage={openDrawer}
            />
            {group && (
              <>
                <Link
                  to={`/groups/${group.id}`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-zebra-300 hover:shadow-sm transition group"
                >
                  <div className="text-2xl mb-2">💬</div>
                  <p className="font-medium text-slate-700 group-hover:text-zebra-700 transition">
                    Czat grupowy
                  </p>
                  <p className="text-xs text-slate-400">
                    Porozmawiaj z innymi członkami
                  </p>
                </Link>
                <Link
                  to={`/groups/${group.id}/forum`}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-zebra-300 hover:shadow-sm transition group"
                >
                  <div className="text-2xl mb-2">📋</div>
                  <p className="font-medium text-slate-700 group-hover:text-zebra-700 transition">
                    Forum grupy
                  </p>
                  <p className="text-xs text-slate-400">
                    Posty i dyskusje w grupie
                  </p>
                </Link>
              </>
            )}
          </div>
        )}

        <GroupDrawer
          isOpen={isOpen}
          onClose={closeDrawer}
          group={group}
          profile={profile}
          matches={matches}
          loadingMatches={loadingMatches}
          updatingDesc={updatingDesc}
          changingGroup={changingGroup}
          onUpdateDescription={updateDescription}
          onChangeGroup={changeGroup}
        />
      </div>
    </AppShell>
  );
}
