import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import useBootstrapStore from "../store/bootstrapStore";
import i18n from "../i18n";

/**
 * Lista „konwersacji” w UI wiadomości — w v2 to czaty tematyczne (GET /api/v2/topics).
 * Pola mapujemy do kształtu oczekiwanego przez DmConversationsPanel (nick, podgląd, czas).
 */
export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const totalUnread = useBootstrapStore((s) => s.unreadCount);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get("/api/v2/topics");
      const rows = Array.isArray(data) ? data : [];
      const mapped = rows.map((c) => ({
        id: c.id,
        other_user_nick:
          (c.query_text && String(c.query_text).slice(0, 48)) || "Mój temat",
        last_message_at: c.created_at,
        last_message_text: `${c.member_count ?? 0} w czacie · ${c.pending_count ?? 0} zaproszeń`,
      }));
      setConversations(mapped);
    } catch {
      setError(i18n.t("hooks.conversationsLoadError", { ns: "app" }));
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    conversations,
    totalUnread,
    loading,
    error,
    refetch: fetchAll,
  };
}
