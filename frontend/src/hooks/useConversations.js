import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

/**
 * Hook do listy konwersacji DM i łącznej liczby nieprzeczytanych.
 * Pobiera GET /dm/conversations oraz GET /dm/conversations/unread-count.
 * Używany na MessagesPage i do badge w navbar.
 */
export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [convRes, unreadRes] = await Promise.all([
        api.get("/dm/conversations"),
        api.get("/dm/conversations/unread-count"),
      ]);
      setConversations(convRes.data ?? []);
      setTotalUnread(unreadRes.data?.unread_count ?? 0);
    } catch {
      setError("Nie udało się pobrać konwersacji");
      setConversations([]);
      setTotalUnread(0);
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
