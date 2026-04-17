import { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import { useTranslation } from "react-i18next";
import { lensesApi } from "../api/v2/lenses";
import { postsApi } from "../api/v2/posts";
import { topicsApi } from "../api/v2/topics";
import { MatchBadge } from "../components/v2/MatchBadge";
import ErrorMessage from "../components/ui/ErrorMessage";

function TileCard({ to, icon, title, subtitle, children }) {
  return (
    <Link
      to={to}
      className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] p-4 sm:p-5 hover:border-zebra-300 dark:hover:border-teal-600 hover:shadow-sm transition flex flex-col min-h-[120px] sm:min-h-[140px]"
    >
      <p className="text-2xl leading-none mb-2 shrink-0">{icon}</p>
      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm sm:text-base">{title}</p>
      {subtitle && (
        <p className="text-xs text-[var(--zp-app-text-muted)] mt-0.5 mb-2">{subtitle}</p>
      )}
      <div className="flex-1 min-h-0 mt-1 text-sm">{children}</div>
    </Link>
  );
}

export default function Dashboard() {
  const { t } = useTranslation("app");
  const { user } = useAuthStore();
  const firstName = user?.display_name?.split(" ")[0] || t("dashboard.userFallback");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lenses, setLenses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [chats, setChats] = useState([]);
  const [proposals, setProposals] = useState([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [L, P, I, C, Pr] = await Promise.all([
        lensesApi.list("all", 5, 0),
        postsApi.list(),
        topicsApi.invitations().catch(() => []),
        topicsApi.list().catch(() => []),
        postsApi.myProposals().catch(() => []),
      ]);
      setLenses(L || []);
      const sortedPosts = [...(P || [])].sort((a, b) => {
        const tb = new Date(b.published_at || b.created_at).getTime();
        const ta = new Date(a.published_at || a.created_at).getTime();
        return tb - ta;
      });
      setPosts(sortedPosts.slice(0, 3));
      setInvitations(I || []);
      setChats(C || []);
      setProposals(Pr || []);
    } catch (e) {
      setError(e.message || "Nie udało się wczytać pulpitu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const proposalSummary = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const p of proposals) {
      const k = p.status;
      if (k in counts) counts[k] += 1;
    }
    return counts;
  }, [proposals]);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="shrink-0">
            <Avatar name={user?.display_name} size="lg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {t("dashboard.greeting", { name: firstName })}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              Skrót soczewek, postów, zaproszeń i czatów
            </p>
          </div>
        </div>

        {error && <ErrorMessage message={error} onRetry={loadDashboard} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <TileCard to="/lenses" icon="🔎" title="Top soczewki" subtitle="Według Twojego dopasowania">
            {loading ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>
            ) : lenses.length === 0 ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Brak danych — otwórz soczewki</p>
            ) : (
              <ul className="space-y-1.5">
                {lenses.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 text-xs sm:text-sm">
                    <span className="truncate text-slate-700 dark:text-slate-200">
                      {l.emoji ? `${l.emoji} ` : ""}
                      {l.name}
                    </span>
                    {l.user_score != null ? (
                      <MatchBadge score={l.user_score} />
                    ) : (
                      <span className="text-[10px] text-[var(--zp-app-text-muted)] shrink-0">{l.post_count} post.</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </TileCard>

          <TileCard to="/my-posts" icon="📝" title="Moje posty" subtitle="Ostatnia aktywność">
            {loading ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>
            ) : posts.length === 0 ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Nie masz jeszcze postów</p>
            ) : (
              <ul className="space-y-1.5">
                {posts.map((p) => (
                  <li key={p.id} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                    <span className="font-medium">{p.title}</span>
                    <span className="text-[var(--zp-app-text-muted)] ml-1">({p.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </TileCard>

          <TileCard to="/topics" icon="✉️" title="Zaproszenia" subtitle="Do czatów tematycznych">
            {loading ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>
            ) : invitations.length === 0 ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Brak oczekujących zaproszeń</p>
            ) : (
              <ul className="space-y-1.5">
                {invitations.slice(0, 5).map((inv) => (
                  <li key={inv.chat_id} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                    <span className="font-medium">{inv.inviter_username}</span>
                    <span className="text-[var(--zp-app-text-muted)]"> — {inv.query_preview}</span>
                  </li>
                ))}
              </ul>
            )}
          </TileCard>

          <TileCard to="/topics" icon="💬" title="Aktywne czaty" subtitle="Moje tematy">
            {loading ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>
            ) : chats.length === 0 ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Brak czatów — znajdź temat</p>
            ) : (
              <ul className="space-y-1.5">
                {chats.slice(0, 5).map((c) => (
                  <li key={c.id} className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 truncate">
                    {c.query_text}
                    <span className="text-[var(--zp-app-text-muted)] ml-1">({c.status})</span>
                  </li>
                ))}
              </ul>
            )}
          </TileCard>
        </div>

        <div className="mt-3 sm:mt-4">
          <TileCard to="/my-posts" icon="💡" title="Propozycje soczewek" subtitle="Status Twoich zgłoszeń">
            {loading ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>
            ) : proposals.length === 0 ? (
              <p className="text-xs text-[var(--zp-app-text-muted)]">Nie wysłałeś jeszcze propozycji</p>
            ) : (
              <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
                <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-100 px-2 py-1">
                  Oczekujące: {proposalSummary.pending}
                </span>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100 px-2 py-1">
                  Zaakceptowane: {proposalSummary.approved}
                </span>
                <span className="rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1">
                  Odrzucone: {proposalSummary.rejected}
                </span>
              </div>
            )}
          </TileCard>
        </div>
      </div>
    </AppShell>
  );
}
