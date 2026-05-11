import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import api from "../services/api";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";

function InvitationRow({ inv, onResponded }) {
  const [busy, setBusy] = useState(false);

  async function respond(action) {
    setBusy(true);
    try {
      await api.post(`/api/v2/topics/invitations/${inv.chat_id}/respond`, { action });
      toast.success(action === "accept" ? "Dołączono do czatu" : "Odrzucono zaproszenie");
      onResponded();
    } catch (e) {
      const d = e.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się odpowiedzieć");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-[var(--zp-app-border)] last:border-0">
      <div>
        <p className="font-medium text-slate-800 dark:text-slate-100">
          {inv.inviter_username}
        </p>
        <p className="text-sm text-[var(--zp-app-text-muted)] mt-1 line-clamp-2">
          {inv.query_preview}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button type="button" variant="secondary" disabled={busy} onClick={() => respond("reject")}>
          Odrzuć
        </Button>
        <Button type="button" disabled={busy} onClick={() => respond("accept")}>
          Akceptuj
        </Button>
      </div>
    </div>
  );
}

export default function TopicsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [targetCount, setTargetCount] = useState(10);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [searchId, setSearchId] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null);
  const [chats, setChats] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);

  const loadLists = useCallback(async () => {
    setLoadingChats(true);
    try {
      const [chRes, invRes] = await Promise.all([
        api.get("/api/v2/topics"),
        api.get("/api/v2/topics/invitations"),
      ]);
      setChats(chRes.data);
      setInvitations(invRes.data);
    } catch {
      toast.error("Nie udało się wczytać listy");
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  useEffect(() => {
    if (!searchId) return undefined;

    let cancelled = false;
    let intervalId;

    async function pollOnce() {
      try {
        const { data } = await api.get(`/api/v2/topics/search/${searchId}`);
        if (cancelled) return;
        setSearchStatus(data);
        if (data.status === "done" || data.status === "error") {
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        if (!cancelled) {
          setSearchStatus({ status: "error", error: "Błąd odpytywania" });
          if (intervalId) clearInterval(intervalId);
        }
      }
    }

    pollOnce();
    intervalId = setInterval(pollOnce, 2000);
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [searchId]);

  async function startSearch(e) {
    e.preventDefault();
    if (!query.trim()) {
      toast.error("Wpisz czego szukasz");
      return;
    }
    setSearchStatus(null);
    try {
      const { data } = await api.post("/api/v2/topics/search", {
        query: query.trim(),
        target_count: targetCount,
        include_location: includeLocation,
      });
      setSearchId(data.search_id);
      setSearchStatus({ status: "pending", found_count: 0, target_count: data.target_count });
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się uruchomić wyszukiwania");
    }
  }

  async function confirmChat() {
    if (!searchId) return;
    try {
      const { data } = await api.post("/api/v2/topics/confirm", { search_id: searchId });
      toast.success("Czat utworzony");
      setSearchId(null);
      setSearchStatus(null);
      await loadLists();
      navigate(`/topics/${data.id}`);
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === "string" ? d : "Nie udało się utworzyć czatu");
    }
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Moje tematy</h1>
          <p className="text-sm text-[var(--zp-app-text-muted)] mt-1">
            Znajdź innych rodziców o podobnym profilu i utwórz tymczasowy czat.
          </p>
        </div>

        <section className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Nowe wyszukiwanie
          </h2>
          <form onSubmit={startSearch} className="space-y-4">
            <div>
              <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">
                Opisz, czego szukasz
              </label>
              <textarea
                className="w-full rounded-xl border border-[var(--zp-app-border)] bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[100px]"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Np. wsparcie przy diagnostyce rzadkiej choroby neurologicznej..."
              />
            </div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">
                  Liczba osób
                </label>
                <select
                  className="rounded-xl border border-[var(--zp-app-border)] bg-white dark:bg-slate-900 px-3 py-2 text-sm"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
                >
                  {[5, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLocation}
                  onChange={(e) => setIncludeLocation(e.target.checked)}
                />
                Uwzględnij lokalizację w dopasowaniu
              </label>
            </div>
            <Button type="submit">Szukaj osób</Button>
          </form>

          {searchStatus && (
            <div className="mt-6 pt-6 border-t border-[var(--zp-app-border)]">
              <p className="text-sm text-slate-700 dark:text-slate-200">
                Status: <strong>{searchStatus.status}</strong>
                {searchStatus.status === "pending" && " — szukamy kandydatów…"}
                {searchStatus.status === "done" &&
                  ` — znaleziono ${searchStatus.found_count} z ${searchStatus.target_count}`}
                {searchStatus.status === "error" && (searchStatus.error ? ` — ${searchStatus.error}` : "")}
              </p>
              {searchStatus.status === "done" && searchStatus.found_count > 0 && (
                <div className="mt-3">
                  <Button type="button" onClick={confirmChat}>
                    Utwórz czat i wyślij zaproszenia
                  </Button>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Zaproszenia
          </h2>
          {loadingChats ? (
            <p className="text-sm text-[var(--zp-app-text-muted)]">Ładowanie…</p>
          ) : invitations.length === 0 ? (
            <p className="text-sm text-[var(--zp-app-text-muted)]">Brak oczekujących zaproszeń</p>
          ) : (
            invitations.map((inv) => (
              <InvitationRow key={inv.chat_id} inv={inv} onResponded={loadLists} />
            ))
          )}
        </section>

        <section className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-5">
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">
            Twoje czaty
          </h2>
          {loadingChats ? (
            <p className="text-sm text-[var(--zp-app-text-muted)]">Ładowanie…</p>
          ) : chats.length === 0 ? (
            <p className="text-sm text-[var(--zp-app-text-muted)]">Nie masz jeszcze czatów</p>
          ) : (
            <ul className="space-y-2">
              {chats.map((c) => (
                <li key={c.id}>
                  <Link
                    to={`/topics/${c.id}`}
                    className="block rounded-xl border border-[var(--zp-app-border)] px-4 py-3 hover:border-zebra-300 dark:hover:border-teal-600 transition"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
                      {c.query_text}
                    </span>
                    <span className="text-xs text-[var(--zp-app-text-muted)] mt-1 block">
                      {c.status === "active" ? "Aktywny" : "Zamknięty"} · uczestnicy: {c.member_count}{" "}
                      · oczekujące zaproszenia: {c.pending_count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
