import { useState, useEffect, useRef, useCallback } from "react";
import useAuthStore from "../store/authStore";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const PING_INTERVAL = 25000;
const MAX_MESSAGES = 200;

export const DM_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  FAILED: "failed",
};

/**
 * Normalizuje wiadomość z WebSocket do postaci spójnej z REST (MessageOut).
 * Backend WS wysyła: id, sender_id, sender_nick, content, is_read, created_at.
 */
function normalizeMessage(msg) {
  return {
    id: msg.id,
    sender_id: msg.sender_id,
    sender_nick: msg.sender_nick ?? "",
    content: msg.content ?? "",
    message_type: msg.message_type ?? "text",
    image_url: msg.image_url ?? null,
    is_read: msg.is_read ?? false,
    created_at: msg.created_at,
  };
}

/**
 * Hook do pojedynczej konwersacji DM: WebSocket + stan wiadomości.
 * Po połączeniu można załadować historię przez setMessages (REST),
 * nowe wiadomości z WS są dopisywane. Przy odebraniu wiadomości wysyła "read".
 */
export function useDM(conversationId) {
  const { token } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState(DM_STATUS.DISCONNECTED);

  const wsRef = useRef(null);
  const activeConversationRef = useRef(null);
  const connectRef = useRef(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pingTimer = useRef(null);
  const isMounted = useRef(true);

  const addMessage = useCallback((msg) => {
    const normalized = normalizeMessage(msg);
    setMessages((prev) => {
      if (normalized.id && prev.some((m) => m.id === normalized.id)) {
        return prev;
      }
      return [...prev, normalized].slice(-MAX_MESSAGES);
    });
  }, []);

  const handleMessage = useCallback(
    (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }

      switch (data.type) {
        case "message":
          addMessage(data);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: "read" }));
          }
          break;
        case "error":
          if (data.code === "UNAUTHORIZED") {
            try {
              useAuthStore.getState().logout();
            } finally {
              window.location.href = "/login";
            }
          }
          break;
        case "pong":
          break;
        default:
          break;
      }
    },
    [addMessage]
  );

  const connect = useCallback(() => {
    if (!conversationId || !token || !isMounted.current) return;

    const cidStr = String(conversationId);
    const existingWs = wsRef.current;

    // Jeśli mamy już połączenie dla tej samej rozmowy (albo w trakcie łączenia),
    // nie tworzymy kolejnego WebSocketu.
    if (
      activeConversationRef.current === cidStr &&
      existingWs &&
      (existingWs.readyState === WebSocket.OPEN ||
        existingWs.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    // Jeśli użytkownik zmienił rozmowę, zamykamy poprzedni socket (jeśli jeszcze żyje).
    if (existingWs && existingWs.readyState !== WebSocket.CLOSED) {
      try {
        existingWs.close(1000, "Conversation changed");
      } catch {
        // Ignorujemy błąd zamykania, bo i tak socket jest w złym stanie.
      }
    }

    activeConversationRef.current = cidStr;

    setStatus(DM_STATUS.CONNECTING);
    const cid = encodeURIComponent(cidStr);
    const t = encodeURIComponent(String(token));
    const ws = new WebSocket(
      `${WS_BASE}/ws/dm/${cid}?token=${t}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      if (wsRef.current !== ws) return;
      if (!isMounted.current) return;
      setStatus(DM_STATUS.CONNECTED);
      reconnectCount.current = 0;
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      handleMessage(event);
    };

    ws.onclose = (e) => {
      if (wsRef.current !== ws) return;
      if (!isMounted.current) return;
      clearInterval(pingTimer.current);
      pingTimer.current = null;
      if (e.code === 4001 || e.code === 4003 || e.code === 1000) {
        setStatus(DM_STATUS.DISCONNECTED);
        return;
      }
      if (reconnectCount.current < 5) {
        reconnectCount.current++;
        setStatus(DM_STATUS.RECONNECTING);
        const delay = 2000 * Math.pow(2, reconnectCount.current - 1);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectRef.current?.();
        }, delay);
      } else {
        setStatus(DM_STATUS.FAILED);
      }
    };
  }, [conversationId, token, handleMessage]);
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const sendMessage = useCallback((content) => {
    if (!content?.trim()) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: content.trim() }));
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connectRef.current = connect;
    connect();
    return () => {
      isMounted.current = false;
      activeConversationRef.current = null;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      clearInterval(pingTimer.current);
      pingTimer.current = null;
      if (wsRef.current) {
        wsRef.current.close(1000);
        wsRef.current = null;
      }
    };
  }, [conversationId, connect]);

  return {
    messages,
    setMessages,
    status,
    isConnected: status === DM_STATUS.CONNECTED,
    sendMessage,
    manualReconnect: connect,
  };
}
