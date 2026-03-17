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
  const reconnectCount = useRef(0);
  const pingTimer = useRef(null);
  const isMounted = useRef(true);

  const addMessage = useCallback((msg) => {
    const normalized = normalizeMessage(msg);
    setMessages((prev) => [...prev, normalized].slice(-MAX_MESSAGES));
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
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setStatus(DM_STATUS.CONNECTING);
    const ws = new WebSocket(
      `${WS_BASE}/ws/dm/${conversationId}?token=${token}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setStatus(DM_STATUS.CONNECTED);
      reconnectCount.current = 0;
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, PING_INTERVAL);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (e) => {
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
        setTimeout(
          connect,
          2000 * Math.pow(2, reconnectCount.current - 1)
        );
      } else {
        setStatus(DM_STATUS.FAILED);
      }
    };
  }, [conversationId, token, handleMessage]);

  const sendMessage = useCallback((content) => {
    if (!content?.trim()) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: "message", content: content.trim() }));
  }, []);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false;
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
