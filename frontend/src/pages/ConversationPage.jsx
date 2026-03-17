import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import { useDM, DM_STATUS } from "../hooks/useDM";
import useAuthStore from "../store/authStore";
import api from "../services/api";
import toast from "react-hot-toast";

const EMOJIS = [
  "😊", "😢", "😂", "❤️", "👍", "👏", "🙏", "💪", "🦓", "✨", "🌈", "💚",
];

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuthStore();
  const [otherUser, setOtherUser] = useState(null);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const {
    messages,
    setMessages,
    status,
    isConnected,
    sendMessage,
    manualReconnect,
  } = useDM(conversationId);

  useEffect(() => {
    const load = async () => {
      if (!conversationId) return;
      try {
        const convRes = await api.get("/dm/conversations");
        const conv = convRes.data.find((c) => c.id === conversationId);
        if (conv) {
          setOtherUser({
            id: conv.other_user_id,
            nick: conv.other_user_nick,
          });
        }

        const msgRes = await api.get(
          `/dm/conversations/${conversationId}/messages?limit=50`
        );
        setMessages(msgRes.data ?? []);
      } catch {
        toast.error("Nie udało się załadować wiadomości");
      } finally {
        setLoadingHistory(false);
      }
    };
    load();
  }, [conversationId, setMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || !isConnected) return;
    sendMessage(text);
    setInput("");
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const addEmoji = (emoji) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const statusColor = {
    [DM_STATUS.CONNECTED]: "bg-emerald-400",
    [DM_STATUS.CONNECTING]: "bg-amber-400 animate-pulse",
    [DM_STATUS.RECONNECTING]: "bg-amber-400 animate-pulse",
    [DM_STATUS.FAILED]: "bg-red-400",
    [DM_STATUS.DISCONNECTED]: "bg-slate-300",
  }[status];

  return (
    <AppShell fullHeight>
      <div className="flex flex-col h-full max-w-2xl mx-auto">

        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-10">
          <Link
            to="/messages"
            className="text-slate-400 hover:text-slate-600 transition text-xl leading-none mr-1"
          >
            ←
          </Link>

          <div className="relative">
            <Avatar name={otherUser?.nick ?? "?"} size="md" />
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${statusColor}`}
            />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">
              {otherUser?.nick ?? "Ładowanie..."}
            </p>
            <p className="text-xs text-slate-400">
              {status === DM_STATUS.CONNECTED
                ? "Online"
                : status === DM_STATUS.CONNECTING
                  ? "Łączenie..."
                  : status === DM_STATUS.RECONNECTING
                    ? "Ponowne łączenie..."
                    : "Offline"}
            </p>
          </div>

          {(status === DM_STATUS.FAILED || status === DM_STATUS.DISCONNECTED) && (
            <button
              type="button"
              onClick={manualReconnect}
              className="text-xs text-zebra-600 hover:underline"
            >
              Połącz
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-slate-50 min-h-0"
        >
          {loadingHistory ? (
            <div className="flex justify-center py-8">
              <p className="text-slate-400 text-sm">Ładowanie...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[200px] py-16 text-center">
              <span className="text-5xl mb-3">👋</span>
              <p className="text-slate-500 font-medium">Początek konwersacji</p>
              <p className="text-slate-400 text-sm mt-1">
                Napisz pierwszą wiadomość!
              </p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isOwn = msg.sender_id === user?.id;
              const prevMsg = messages[i - 1];
              const showDate =
                !prevMsg ||
                new Date(msg.created_at).toDateString() !==
                  new Date(prevMsg.created_at).toDateString();

              return (
                <div key={msg.id ?? i}>
                  {showDate && (
                    <div className="flex justify-center my-3">
                      <span className="text-xs text-slate-400 bg-slate-200 px-3 py-1 rounded-full">
                        {new Date(msg.created_at).toLocaleDateString("pl-PL", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs sm:max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isOwn
                          ? "bg-zebra-600 text-white rounded-tr-sm"
                          : "bg-white border text-slate-800 rounded-tl-sm shadow-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">
                        {msg.content}
                      </p>
                      <p
                        className={`text-xs mt-1 text-right ${
                          isOwn ? "text-zebra-200" : "text-slate-400"
                        }`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isOwn && (
                          <span className="ml-1">
                            {msg.is_read ? "✓✓" : "✓"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="bg-white border-t px-4 py-3 flex-shrink-0">
          {showEmoji && (
            <div className="flex flex-wrap gap-1 mb-2 p-2 bg-slate-50 rounded-xl border">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  className="text-xl p-1 hover:bg-slate-200 rounded-lg transition"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className={`flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl transition text-xl ${
                showEmoji
                  ? "bg-zebra-100 text-zebra-600"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
              aria-label="Emotki"
            >
              😊
            </button>

            <button
              type="button"
              onClick={() =>
                toast("Załączanie zdjęć — wkrótce! 📸", { icon: "🚧" })
              }
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xl"
              title="Załącz zdjęcie (wkrótce)"
            >
              📎
            </button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!isConnected}
              placeholder={
                isConnected
                  ? "Napisz wiadomość... (Enter = wyślij)"
                  : "Łączenie..."
              }
              rows={1}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-zebra-500 disabled:bg-slate-50 disabled:text-slate-400 transition max-h-32 min-h-[42px]"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={!isConnected || !input.trim()}
              className="flex-shrink-0 w-9 h-9 bg-zebra-600 hover:bg-zebra-700 disabled:bg-slate-200 text-white rounded-xl flex items-center justify-center transition"
              aria-label="Wyślij"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
