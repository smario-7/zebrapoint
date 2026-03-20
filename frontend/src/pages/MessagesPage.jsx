import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import DmContactSearch from "../components/dm/DmContactSearch";
import DmConversationsPanel from "../components/dm/DmConversationsPanel";
import api from "../services/api";
import toast from "react-hot-toast";
import { useConversations } from "../hooks/useConversations";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../hooks/useMediaQuery";

export default function MessagesPage() {
  const { t } = useTranslation(["app", "common"]);
  const navigate = useNavigate();
  const { conversations, loading, error, refetch } = useConversations();
  const [searchOpen, setSearchOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  const startConversation = async (userId) => {
    try {
      const { data } = await api.post(`/dm/start?other_user_id=${userId}`);
      navigate(`/messages/${data.id}`);
    } catch {
      toast.error(t("messages.startError"));
    }
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <DmConversationsPanel
            conversations={conversations}
            loading={loading}
            activeConversationId={null}
            showSearchButton={!isDesktop}
            onOpenSearch={isDesktop ? undefined : () => setSearchOpen(true)}
            title={t("messages.title")}
            subtitle={isDesktop ? t("messages.subtitle") : null}
          />
        </div>

        {searchOpen && (
          <DmContactSearch onSelectUser={startConversation} />
        )}

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
