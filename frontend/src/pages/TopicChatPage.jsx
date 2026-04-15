import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";

import api from "../services/api";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";

function mergeById(existing, incoming) {
  const map = new Map();
  for (const m of existing) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

export default function TopicChatPage() {
  const navigate = useNavigate();
  const { chatId } = useParams();
  const [detail, setDetail] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const pollRef = useRef(null);

  const lastAfter = useMemo(() => {
    if (!messages.length) return null;
    const last = messages[messages.length - 1];
    return last.created_at;
  }, [messages]);

  const loadDetail = useCallback(async () => {
    const { data } = await api.get(`/api/v2/topics/${chatId}`);
    setDetail(data);
  }, [chatId]);

  const fetchMessages = useCallback(
    async (after) => {
      const params = after ? { after } : {};
      const { data } = await api.get(`/api/v2/topics/${chatId}/messages`, { params });
      return data;
    },
    [chatId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadDetail();
        const initial = await fetchMessages(null);
        if (!cancelled) setMessages(initial);
      } catch (e) {
        if (!cancelled) {
          const d = e.response?.data?.detail;
          toast.error(typeof d === "string" ? d : "Nie udało się wczytać czatu");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, fetchMessages, loadDetail]);

  useEffect(() => {
    if (loading) return undefined;

    async function tick() {
      try {
        const chunk = await fetchMessages(lastAfter);
        if (chunk.length) {
          setMessages((prev) => mergeById(prev, chunk));
        }
      } catch {
        /* polling — cicho */
      }
    }

    pollRef.current = setInterval(tick, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loading, lastAfter, fetchMessages]);

  async function sendMessage(e) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    try {
      await api.post(`/api/v2/topics/${chatId}/messages`, { content: text });
      setBody("");
      const full = await fetchMessages(null);
      setMessages(full);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się wysłać");
    }
  }

  async function closeChat() {
    try {
      await api.post(`/api/v2/topics/${chatId}/close`);
      toast.success("Czat zamknięty");
      await loadDetail();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się zamknąć");
    }
  }

  async function leaveChat() {
    try {
      await api.post(`/api/v2/topics/${chatId}/leave`);
      toast.success("Opuściłeś czat");
      navigate("/topics");
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się opuścić");
    }
  }

  if (loading && !detail) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-[var(--zp-app-text-muted)]">Ładowanie…</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              to="/topics"
              className="text-sm text-zebra-600 dark:text-teal-400 hover:underline mb-2 inline-block"
            >
              ← Moje tematy
            </Link>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {detail?.query_text}
            </h1>
            <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">
              {detail?.status === "active" ? "Aktywny" : "Zamknięty"} · uczestnicy:{" "}
              {detail?.members?.length ?? 0}
            </p>
          </div>
          <div className="flex gap-2">
            {detail?.is_creator && detail?.status === "active" && (
              <Button type="button" variant="secondary" onClick={closeChat}>
                Zamknij czat
              </Button>
            )}
            {!detail?.is_creator && detail?.status === "active" && (
              <Button type="button" variant="secondary" onClick={leaveChat}>
                Opuść czat
              </Button>
            )}
          </div>
        </div>

        <section className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-4 min-h-[200px] max-h-[50vh] overflow-y-auto flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-[var(--zp-app-text-muted)]">Brak wiadomości</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="text-sm">
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  {m.author_username}
                </span>
                <span className="text-xs text-[var(--zp-app-text-muted)] ml-2">
                  {new Date(m.created_at).toLocaleString()}
                </span>
                <p className="mt-1 text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {m.content}
                </p>
              </div>
            ))
          )}
        </section>

        {detail?.status === "active" && (
          <form onSubmit={sendMessage} className="flex flex-col sm:flex-row gap-2">
            <textarea
              className="flex-1 rounded-xl border border-[var(--zp-app-border)] bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[80px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Napisz wiadomość…"
            />
            <Button type="submit" className="self-end sm:self-stretch">
              Wyślij
            </Button>
          </form>
        )}
      </div>
    </AppShell>
  );
}
