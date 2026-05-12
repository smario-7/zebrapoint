import { useState, useEffect, useCallback, useRef } from "react";

import api from "../services/api";

const TOPICS_BASE = "/api/v2/topics";
const POLL_MS = 4000;

/**
 * Czat dynamiczny (temat v2): historia i wysyłka przez REST, okresowe odświeżanie listy wiadomości.
 */
export function useTopicChat(chatId) {
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const pollRef = useRef(null);

  const loadDetail = useCallback(async () => {
    if (!chatId) return;
    const { data } = await api.get(`${TOPICS_BASE}/${chatId}`);
    setDetail(data);
  }, [chatId]);

  const loadMessages = useCallback(async () => {
    if (!chatId) return;
    const { data } = await api.get(`${TOPICS_BASE}/${chatId}/messages`);
    const list = Array.isArray(data) ? data : [];
    setMessages(
      list.map((m) => ({
        id: m.id,
        content: m.content ?? "",
        created_at: m.created_at,
        author_username: m.author_username ?? "",
      }))
    );
  }, [chatId]);

  useEffect(() => {
    if (!chatId) return;
    let cancelled = false;

    (async () => {
      setReady(false);
      setLoadError(null);
      setSendError(null);
      try {
        await loadDetail();
        await loadMessages();
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) {
          setReady(false);
          setLoadError("Nie udało się wczytać czatu");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chatId, loadDetail, loadMessages]);

  useEffect(() => {
    if (!chatId || !ready) return;
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadMessages().catch(() => {});
    }, POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [chatId, ready, loadMessages]);

  const sendMessage = useCallback(
    async (content) => {
      const text = content?.trim();
      if (!text || !chatId) return;
      setSendError(null);
      try {
        await api.post(`${TOPICS_BASE}/${chatId}/messages`, { content: text });
        await loadMessages();
      } catch (err) {
        const d = err.response?.data?.detail;
        setSendError(typeof d === "string" ? d : "Nie udało się wysłać wiadomości");
      }
    },
    [chatId, loadMessages]
  );

  return {
    detail,
    messages,
    setMessages,
    ready,
    loadError,
    sendError,
    sendMessage,
    reload: loadMessages,
  };
}
