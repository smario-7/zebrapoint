import { useParams } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import ErrorMessage from "../components/ui/ErrorMessage";
import { SkeletonMember } from "../components/ui/Skeleton";
import { useGroupMembers } from "../hooks/useGroupMembers";
import { useProfile } from "../hooks/useProfile";
import ChatWindow from "../components/chat/ChatWindow";
import { useTranslation } from "react-i18next";

export default function GroupPage() {
  const { t, i18n } = useTranslation(["app", "common"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const { groupId } = useParams();
  const { group } = useProfile();
  const { members, loading: membersLoading, error } = useGroupMembers(groupId);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 min-w-0">
              <Avatar name={group?.name} size="sm" className="shrink-0" />
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {group?.name || t("groupPage.group")}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("groupPage.communityChat")}
                </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-[480px]">
          <div className="flex-1 min-w-0 flex flex-col">
            <ChatWindow groupId={groupId} groupName={group?.name} />
          </div>

          <aside className="hidden lg:flex flex-col w-64 flex-shrink-0">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 flex-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-4">
                {t("groupPage.members", { count: members.length })}
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
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {m.display_name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {t("groupPage.memberSincePrefix")}{" "}
                          {new Date(m.joined_at).toLocaleDateString(locale)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {group && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {t("groupPage.groupFrom")}{" "}
                    {new Date(group.created_at).toLocaleDateString(locale)}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

