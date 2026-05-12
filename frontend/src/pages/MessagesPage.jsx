import AppShell from "../components/layout/AppShell";
import DmConversationsPanel from "../components/dm/DmConversationsPanel";
import { useConversations } from "../hooks/useConversations";
import { useTranslation } from "react-i18next";

export default function MessagesPage() {
  const { t } = useTranslation(["app", "common"]);
  const { conversations, loading, error, refetch } = useConversations();

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <DmConversationsPanel
            conversations={conversations}
            loading={loading}
            activeConversationId={null}
            showSearchButton={false}
            title={t("messages.title")}
            subtitle={t("messages.subtitle")}
            linkPrefix="/topics"
          />
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300 mb-4">
            <p className="font-medium">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-xs font-semibold underline"
              type="button"
            >
              {t("common:retry")}
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
