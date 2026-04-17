import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { lensesApi } from "../api/v2/lenses";
import { postsApi } from "../api/v2/posts";
import AppShell from "../components/layout/AppShell";
import { LensCard } from "../components/v2/LensCard";
import { MatchBadge } from "../components/v2/MatchBadge";
import LensPostDetail from "../components/v2/LensPostDetail";
import Button from "../components/ui/Button";

const FILTERS = [
  { id: "all", label: "Wszystkie" },
  { id: "diagnostic", label: "Diagnostyczne" },
  { id: "symptomatic", label: "Objawowe" },
  { id: "topical", label: "Tematyczne" },
];

function LensPostsList({ lens, onOpenPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await lensesApi.getPosts(lens.id, 30, 0);
      setPosts(rows || []);
    } catch (e) {
      toast.error(e.message || "Nie udało się wczytać postów");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [lens.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-[var(--zp-app-text-muted)] p-4">Wczytywanie postów…</p>;
  }
  if (!posts.length) {
    return (
      <p className="text-sm text-[var(--zp-app-text-muted)] p-6 text-center">
        Brak opublikowanych postów w tej soczewce.
      </p>
    );
  }
  return (
    <ul className="space-y-3 p-2 sm:p-4">
      {posts.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onOpenPost(p)}
            className="w-full text-left rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-4 hover:border-zebra-300 dark:hover:border-teal-600 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-slate-900 dark:text-slate-100">{p.title}</span>
              <MatchBadge score={p.match_score} />
            </div>
            {p.content && (
              <p className="mt-2 text-sm text-[var(--zp-app-text-muted)] line-clamp-3">{p.content}</p>
            )}
            <p className="mt-2 text-xs text-[var(--zp-app-text-muted)]">
              {p.published_at ? new Date(p.published_at).toLocaleString("pl-PL") : ""} ·{" "}
              {p.comment_count} komentarzy
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function Lenses() {
  const [filter, setFilter] = useState("all");
  const [lenses, setLenses] = useState([]);
  const [loadingLenses, setLoadingLenses] = useState(true);
  const [selectedLens, setSelectedLens] = useState(null);
  const [rightView, setRightView] = useState("posts");
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingLenses(true);
    lensesApi
      .list(filter, 80, 0)
      .then((rows) => {
        if (!cancelled) setLenses(rows || []);
      })
      .catch((e) => {
        if (!cancelled) {
          toast.error(e.message || "Nie udało się wczytać soczewek");
          setLenses([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLenses(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filter]);

  useEffect(() => {
    if (selectedLens && !lenses.some((l) => l.id === selectedLens.id)) {
      setSelectedLens(null);
      setSelectedPost(null);
      setRightView("posts");
    }
  }, [lenses, selectedLens]);

  function selectLens(lens) {
    setSelectedLens(lens);
    setRightView("posts");
    setSelectedPost(null);
  }

  function openPost(p) {
    setSelectedPost(p);
    setRightView("detail");
  }

  return (
    <AppShell fullHeight contentClassName="max-w-none w-full px-4 sm:px-6 pb-20 md:pb-6 flex min-h-0 flex-1 flex-col py-6">
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-3 mb-4 text-sm text-blue-900 dark:text-blue-100">
          Dopasowanie odbywa się na zasadzie algorytmu i nie jest diagnozą medyczną. Pomaga znaleźć
          tematy i treści, które mogą być dla Ciebie przydatne.
        </div>

        <div className="flex gap-4 flex-1 min-h-0">
          <div className="w-72 sm:w-80 shrink-0 flex flex-col gap-2 min-h-0 border border-[var(--zp-app-border)] rounded-xl bg-[var(--zp-app-card)] p-2">
            <div className="flex flex-wrap gap-1 shrink-0 p-1">
              {FILTERS.map((f) => (
                <Button
                  key={f.id}
                  variant={filter === f.id ? "primary" : "secondary"}
                  size="sm"
                  type="button"
                  className="!text-xs !px-2 !py-1 !h-auto"
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </Button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
              {loadingLenses && (
                <p className="text-xs text-[var(--zp-app-text-muted)] p-2">Ładowanie…</p>
              )}
              {!loadingLenses &&
                lenses.map((lens) => (
                  <LensCard
                    key={lens.id}
                    lens={lens}
                    isSelected={selectedLens?.id === lens.id}
                    onClick={() => selectLens(lens)}
                  />
                ))}
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto border border-[var(--zp-app-border)] rounded-xl bg-[var(--zp-app-bg)]">
            {!selectedLens && (
              <div className="text-[var(--zp-app-text-muted)] text-center mt-20 text-sm p-4">
                Wybierz soczewkę z lewej listy.
              </div>
            )}
            {selectedLens && rightView === "posts" && (
              <div className="min-h-0">
                <div className="sticky top-0 z-10 bg-[var(--zp-app-bg)]/95 backdrop-blur border-b border-[var(--zp-app-border)] px-4 py-3">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {selectedLens.emoji && <span>{selectedLens.emoji}</span>}
                    {selectedLens.name}
                  </h2>
                  {selectedLens.description && (
                    <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">{selectedLens.description}</p>
                  )}
                </div>
                <LensPostsList lens={selectedLens} onOpenPost={openPost} />
              </div>
            )}
            {rightView === "detail" && selectedPost && (
              <div className="p-2 sm:p-4">
                <LensPostDetail
                  postId={selectedPost.id}
                  matchScore={selectedPost.match_score}
                  onBack={() => {
                    setRightView("posts");
                    setSelectedPost(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
