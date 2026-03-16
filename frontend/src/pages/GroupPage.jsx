import { useParams, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import ErrorMessage from "../components/ui/ErrorMessage";
import { SkeletonMember } from "../components/ui/Skeleton";
import { useGroupMembers } from "../hooks/useGroupMembers";
import { useProfile } from "../hooks/useProfile";
import ChatWindow from "../components/chat/ChatWindow";

export default function GroupPage() {
  const { groupId } = useParams();
  const { group } = useProfile();
  const { members, loading: membersLoading, error } = useGroupMembers(groupId);

  return (
    <AppShell>
      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
        <Link to="/dashboard" className="hover:text-slate-600 transition">
          Tablica
        </Link>
        <span>/</span>
        <span className="text-slate-600 font-medium truncate">
          {group?.name || "Grupa"}
        </span>
        <span className="mx-2">·</span>
        <Link
          to={`/groups/${groupId}/forum`}
          className="text-zebra-600 hover:text-zebra-700 font-medium transition"
        >
          📋 Forum
        </Link>
      </div>

      <div className="flex gap-4 flex-1 min-h-[480px]">
        <div className="flex-1 min-w-0 flex flex-col">
          <ChatWindow
            groupId={groupId}
            groupName={group?.name}
          />
        </div>

        <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl border p-4 flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
              Członkowie ({members.length})
            </p>

            {error && <ErrorMessage message={error} />}

            {membersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <SkeletonMember key={i} />)}
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto">
                {members.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2">
                    <Avatar name={m.display_name} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
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

            {group && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-slate-400">
                  Grupa od{" "}
                  {new Date(group.created_at).toLocaleDateString("pl-PL")}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

