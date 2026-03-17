import { useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import DmContactSearch from "../components/dm/DmContactSearch";
import api from "../services/api";
import toast from "react-hot-toast";
import { useConversations } from "../hooks/useConversations";

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return "teraz";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} godz.`;
  return new Date(date).toLocaleDateString("pl-PL");
}

export default function MessagesPage() {
  const navigate = useNavigate();
  const { conversations, loading, error, refetch } = useConversations();

  const startConversation = async (userId) => {
    try {
      const { data } = await api.post(`/dm/start?other_user_id=${userId}`);
      navigate(`/messages/${data.id}`);
    } catch {
      toast.error("Nie udało się rozpocząć konwersacji");
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">💬 Wiadomości</h1>
          <p className="text-slate-500 text-sm mt-1">
            Prywatne rozmowy z innymi członkami
          </p>
        </div>

        <DmContactSearch onSelectUser={startConversation} />

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 bg-slate-100 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <p className="text-slate-600 font-medium">{error}</p>
            <button
              onClick={() => refetch()}
              className="mt-3 text-sm text-zebra-600 hover:text-zebra-700 font-medium"
              type="button"
            >
              Spróbuj ponownie
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <div className="text-5xl mb-3">💬</div>
            <p className="text-slate-600 font-medium">Brak wiadomości</p>
            <p className="text-slate-400 text-sm mt-1">
              Wyszukaj nick żeby rozpocząć rozmowę
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                to={`/messages/${conv.id}`}
                className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-slate-50 rounded-2xl transition border border-transparent hover:border-slate-200"
              >
                <div className="relative flex-shrink-0">
                  <Avatar name={conv.other_user_nick} size="md" />
                  {conv.unread_count > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-5 h-5 bg-zebra-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
                    >
                      {conv.unread_count > 9 ? "9+" : conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p
                      className={`font-semibold text-sm ${
                        conv.unread_count > 0
                          ? "text-slate-900"
                          : "text-slate-700"
                      }`}
                    >
                      {conv.other_user_nick}
                    </p>
                    <p className="text-xs text-slate-400 flex-shrink-0 ml-2">
                      {timeAgo(conv.last_message_at)}
                    </p>
                  </div>
                  <p
                    className={`text-xs truncate mt-0.5 ${
                      conv.unread_count > 0
                        ? "text-slate-700 font-medium"
                        : "text-slate-400"
                    }`}
                  >
                    {conv.last_message_text || "Brak wiadomości"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
