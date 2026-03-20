import { useState, useEffect, useRef, useCallback } from "react";
import useAuthStore from "../store/authStore";

export const WS_STATUS = {
  DISCONNECTED: "disconnected",
  CONNECTING:   "connecting",
  CONNECTED:    "connected",
  RECONNECTING: "reconnecting",
  FAILED:       "failed"
};

const WS_BASE_URL     = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const MAX_RECONNECT   = 5;
const RECONNECT_DELAY = 2000;
const PING_INTERVAL   = 25000;
const MAX_MESSAGES    = 200;

/**
 * Hook zarządzający połączeniem WebSocket z czatem grupowym.
 *
 * @param {string} groupId - UUID grupy
 */
export function useChat(groupId) {
  const { token } = useAuthStore();

  const [messages, setMessages]       = useState([]);
  const [status, setStatus]           = useState(WS_STATUS.DISCONNECTED);
  const [onlineCount, setOnlineCount] = useState(0);
  const [lastError, setLastError]     = useState(null);

  const wsRef          = useRef(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef(null);
  const pingTimer      = useRef(null);
  const isMounted      = useRef(true);
  const connectRef     = useRef(null);

  const addMessages = useCallback((newMessages) => {
    setMessages((prev) => {
      const combined = [...prev, ...newMessages];
      return combined.slice(-MAX_MESSAGES);
    });
  }, []);

  const handleServerMessage = useCallback((event) => {
    let data;
    try {
      data = JSON.parse(event.data);
    } catch {
      // Nieprawidłowy JSON z serwera — ignorujemy
      return;
    }

    switch (data.type) {
      case "connected":
        break;
      case "history":
        setMessages(data.messages || []);
        break;
      case "message":
        addMessages([data]);
        break;
      case "user_joined":
        setOnlineCount(data.online_count ?? 0);
        addMessages([{
          id:         `sys-${Date.now()}`,
          type:       "system",
          content:    `${data.display_name} dołączył/a do czatu`,
          created_at: new Date().toISOString()
        }]);
        break;
      case "user_left":
        setOnlineCount(data.online_count ?? 0);
        addMessages([{
          id:         `sys-${Date.now()}`,
          type:       "system",
          content:    `${data.display_name} opuścił/a czat`,
          created_at: new Date().toISOString()
        }]);
        break;
      case "pong":
        break;
      case "error":
        setLastError({
          code:    data.code || "UNKNOWN",
          message: data.message || "Wystąpił błąd połączenia czatu"
        });
        break;
      default:
        break;
    }
  }, [addMessages]);

  const startPing = useCallback(() => {
    pingTimer.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, PING_INTERVAL);
  }, []);

  const stopPing = useCallback(() => {
    if (pingTimer.current) {
      clearInterval(pingTimer.current);
      pingTimer.current = null;
    }
  }, []);

  function scheduleReconnect() {
    if (!isMounted.current) return;

    if (reconnectCount.current >= MAX_RECONNECT) {
      setStatus(WS_STATUS.FAILED);
      return;
    }

    reconnectCount.current += 1;

    const delay = RECONNECT_DELAY * Math.pow(2, reconnectCount.current - 1);
    setStatus(WS_STATUS.RECONNECTING);
    reconnectTimer.current = setTimeout(() => connectRef.current?.(), delay);
  }

  const connect = useCallback(() => {
    if (!groupId || !token || !isMounted.current) return;

    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    setStatus(WS_STATUS.CONNECTING);

    const url = `${WS_BASE_URL}/ws/chat/${groupId}?token=${token}`;
    const ws  = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted.current) return;
      setStatus(WS_STATUS.CONNECTED);
      reconnectCount.current = 0;
      startPing();
    };

    ws.onmessage = handleServerMessage;

    ws.onerror = () => {
      // onclose obsłuży dalsze kroki
    };

    ws.onclose = (event) => {
      if (!isMounted.current) return;

      stopPing();

      if (event.code === 4001 || event.code === 4003) {
        setStatus(WS_STATUS.FAILED);
        return;
      }

      if (event.code === 1000) {
        setStatus(WS_STATUS.DISCONNECTED);
        return;
      }

      scheduleReconnect();
    };
  }, [groupId, token, handleServerMessage, startPing, stopPing]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    stopPing();
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close(1000, "Component unmounted");
      wsRef.current = null;
    }
  }, [stopPing]);

  const sendMessage = useCallback((content) => {
    if (!content?.trim()) return;
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }
    wsRef.current.send(JSON.stringify({
      type:    "message",
      content: content.trim()
    }));
  }, []);

  useEffect(() => {
    isMounted.current = true;
    queueMicrotask(() => connect());

    return () => {
      isMounted.current = false;
      disconnect();
    };
  }, [groupId, connect, disconnect]);

  const manualReconnect = useCallback(() => {
    reconnectCount.current = 0;
    connect();
  }, [connect]);

  return {
    messages,
    status,
    onlineCount,
    sendMessage,
    isConnected:    status === WS_STATUS.CONNECTED,
    isReconnecting: status === WS_STATUS.RECONNECTING,
    hasFailed:      status === WS_STATUS.FAILED,
    manualReconnect,
    lastError
  };
}

