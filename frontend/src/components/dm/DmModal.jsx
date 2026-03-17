import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import toast from "react-hot-toast";

const EMOJIS = ["😊", "😢", "😂", "❤️", "👍", "🙏", "💪", "🦓", "✨", "🌈", "💚", "🔥"];

/**
 * Modal do wysłania DM.
 *
 * Props:
 *   targetUserId    UUID odbiorcy
 *   targetUserNick  Nick odbiorcy
 *   onClose         Funkcja zamykania
 *   forumContext    (opcjonalny) — kontekst wpisu z forum
 *   { postId, postTitle, postExcerpt, groupId }
 */
export default function DmModal({
  targetUserId,
  targetUserNick,
  onClose,
  forumContext = null,
}) {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [showContext, setShowContext] = useState(!!forumContext);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      const convRes = await api.post(
        `/dm/start?other_user_id=${targetUserId}`
      );
      const conversationId = convRes.data.id;

      let fullContent = message.trim();
      if (forumContext && showContext) {
        fullContent =
          `💬 *W odpowiedzi na: "${forumContext.postTitle}"*\n\n` +
          fullContent;
      }

      await api.post(
        `/dm/conversations/${conversationId}/messages`,
        { content: fullContent }
      );

      toast.success(`Wiadomość wysłana do ${targetUserNick}!`);
      onClose();
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd wysyłania");
    } finally {
      setSending(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm
                 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md
                   flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <div>
            <h3 className="font-bold text-slate-800 text-lg leading-tight">
              Nowa wiadomość
            </h3>
            <p className="text-sm text-slate-500 mt-0.5">
              Do:{" "}
              <strong className="text-zebra-700 font-semibold">
                {targetUserNick}
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-full text-slate-400 hover:text-slate-600
                       hover:bg-slate-100 transition text-xl leading-none"
            aria-label="Zamknij"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-5 space-y-3">
          {forumContext && showContext && (
            <ForumContextQuote
              context={forumContext}
              onDismiss={() => setShowContext(false)}
            />
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Napisz do ${targetUserNick}...`}
            rows={4}
            maxLength={2000}
            autoFocus
            className="w-full border border-slate-200 rounded-xl px-4 py-3
                       text-sm leading-relaxed resize-none
                       focus:outline-none focus:ring-2 focus:ring-zebra-500
                       transition"
          />

          {showEmoji && (
            <div className="flex flex-wrap gap-1 p-2 bg-slate-50
                            rounded-xl border border-slate-200">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setMessage((prev) => prev + e)}
                  className="text-xl p-1.5 hover:bg-slate-200
                             rounded-lg transition"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className={`w-9 h-9 flex items-center justify-center
                            rounded-xl text-xl transition ${
                  showEmoji
                    ? "bg-zebra-100 text-zebra-600"
                    : "text-slate-400 hover:bg-slate-100"
                }`}
                title="Emotki"
              >
                😊
              </button>
              <button
                type="button"
                onClick={() =>
                  toast("Załączanie zdjęć — wkrótce! 📸", { icon: "🚧" })
                }
                className="w-9 h-9 flex items-center justify-center
                           rounded-xl text-xl text-slate-400
                           hover:bg-slate-100 transition"
                title="Załącz zdjęcie (wkrótce)"
              >
                📎
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600
                           font-semibold text-sm rounded-xl
                           hover:bg-slate-50 transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="px-5 py-2 bg-zebra-600 hover:bg-zebra-700
                           disabled:bg-slate-200 disabled:text-slate-400
                           text-white font-semibold text-sm rounded-xl
                           transition"
              >
                {sending ? "Wysyłam..." : "Wyślij →"}
              </button>
            </div>
          </div>

          {message.length > 1800 && (
            <p className="text-xs text-right text-slate-400">
              {2000 - message.length} pozostało
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

function ForumContextQuote({ context, onDismiss }) {
  const excerpt = context.postExcerpt
    ? context.postExcerpt.slice(0, 120) +
      (context.postExcerpt.length > 120 ? "..." : "")
    : null;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl
                    px-4 py-3 flex gap-3">
      <div className="w-0.5 bg-zebra-300 rounded-full flex-shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-zebra-600 mb-1
                      flex items-center gap-1.5">
          <span>📋</span>
          <span>Odpowiedź na wpis z forum</span>
        </p>
        <p className="text-sm font-medium text-slate-500 line-clamp-1
                      leading-snug">
          {context.postTitle}
        </p>
        {excerpt && (
          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed
                        line-clamp-2 italic">
            „{excerpt}"
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="flex-shrink-0 self-start w-5 h-5 flex items-center
                   justify-center rounded-full text-slate-300
                   hover:text-slate-500 hover:bg-slate-200
                   transition text-xs font-bold leading-none"
        title="Usuń odniesienie"
        aria-label="Usuń kontekst forum"
      >
        ×
      </button>
    </div>
  );
}
