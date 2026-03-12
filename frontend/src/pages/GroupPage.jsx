import { useParams, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import ErrorMessage from "../components/ui/ErrorMessage";
import { SkeletonMember } from "../components/ui/Skeleton";
import { useGroupMembers } from "../hooks/useGroupMembers";
import { useProfile } from "../hooks/useProfile";

export default function GroupPage() {
  const { groupId } = useParams();
  const { group } = useProfile();
  const { members, loading: membersLoading, error } = useGroupMembers(groupId);

  return (
    <AppShell>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
        <Link to="/dashboard" className="hover:text-slate-600 transition">
          Tablica
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">
          {group?.name || "Grupa"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* Główna sekcja — czat (stub) */}
        <div className="sm:col-span-2">
          <div className="bg-white rounded-2xl border overflow-hidden">
            <div className="p-4 border-b bg-slate-50">
              <p className="font-semibold text-slate-700">
                💬 Czat grupowy
              </p>
            </div>
            <div className="h-96 flex items-center justify-center text-center p-8">
              <div>
                <div className="text-4xl mb-3">🔧</div>
                <p className="text-slate-500 font-medium">
                  Czat będzie dostępny w następnym etapie
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  Sprint 4 — WebSocket
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel boczny — członkowie */}
        <div className="bg-white rounded-2xl border p-4">
          <p className="font-semibold text-slate-700 mb-4 text-sm uppercase tracking-wide">
            Członkowie ({members.length})
          </p>

          {error && <ErrorMessage message={error} />}

          {membersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonMember key={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.user_id} className="flex items-center gap-2">
                  <Avatar name={m.display_name} size="sm" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {m.display_name}
                    </p>
                    <p className="text-xs text-slate-400">
                      od {new Date(m.joined_at).toLocaleDateString("pl-PL")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
