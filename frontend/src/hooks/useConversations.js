import { useState, useEffect, useCallback } from "react";
import api from "../services/api";
import useBootstrapStore from "../store/bootstrapStore";
import i18n from "../i18n";

/**
 * Hook do listy konwersacji DM.
 * Zliczanie nieprzeczytanych jest globalnie w `bootstrapStore` (cache/polling).
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
      const convRes = await api.get("/dm/conversations");
      setConversations(convRes.data ?? []);
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
