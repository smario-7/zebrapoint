import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { useChat, WS_STATUS } from "../../hooks/useChat";
import MessageBubble from "./MessageBubble";
import ChatInput from "./ChatInput";
import StatusBar from "./StatusBar";
import { SkeletonText } from "../ui/Skeleton";

export default function ChatWindow({ groupId, groupName }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const bottomRef = useRef(null);
  const containerRef = useRef(null);

  const {
    messages,
    status,
    onlineCount,
    sendMessage,
    isConnected,
    manualReconnect,
    lastError
  } = useChat(groupId);

  useEffect(() => {
    if (messages.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (status === WS_STATUS.CONNECTED && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [status, messages.length]);

  useEffect(() => {
    if (lastError?.code === "UNAUTHORIZED") {
      navigate("/login");
    }
  }, [lastError, navigate]);

  const isOwn = (msg) => msg.user_id === user?.id;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border overflow-hidden">
      <StatusBar
        status={status}
        onlineCount={onlineCount}
        groupName={groupName}
        onReconnect={manualReconnect}
      />

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50"
      >
        {status === WS_STATUS.CONNECTING && (
          <div className="space-y-4 p-2">
            <SkeletonText lines={2} />
            <SkeletonText lines={1} />
            <SkeletonText lines={3} />
          </div>
        )}

        {isConnected && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <span className="text-4xl mb-3">💬</span>
            <p className="text-slate-500 font-medium">
              Brak wiadomości
            </p>
            <p className="text-slate-400 text-sm mt-1">
              Bądź pierwszy — napisz coś do grupy!
            </p>
          </div>
        )}

        {messages.map((msg, index) => (
          <MessageBubble
            key={msg.id || index}
            message={msg}
            isOwn={isOwn(msg)}
          />
        ))}

        <div ref={bottomRef} />
      </div>

      <ChatInput
        onSend={sendMessage}
        disabled={!isConnected}
      />
    </div>
  );
}

