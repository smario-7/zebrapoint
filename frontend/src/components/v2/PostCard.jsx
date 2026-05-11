import { useState } from "react";
import toast from "react-hot-toast";

import { postsApi } from "../../api/v2/posts";
import { MatchBadge } from "./MatchBadge";
import Button from "../ui/Button";

const statusLabel = {
  draft: "Szkic",
  published: "Opublikowany",
  removed: "Usunięty",
};

export default function PostCard({ post, onEdit, onChanged }) {
  const [matches, setMatches] = useState(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  async function loadMatches() {
    setLoadingMatches(true);
    try {
      const rows = await postsApi.lensMatches(post.id);
      setMatches(rows || []);
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }

  async function toggleMatches() {
    if (!showMatches) {
      setShowMatches(true);
      if (matches === null) await loadMatches();
    } else {
      setShowMatches(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    try {
      await postsApi.publish(post.id);
      toast.success("Post opublikowany — trwa przypisywanie do soczewek.");
      onChanged?.();
    } catch {
    } finally {
      setPublishing(false);
    }
  }

  return (
    <article className="rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-4 mb-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-slate-900 dark:text-slate-100">{post.title}</h3>
          <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">
            <span className="inline-block rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5">
              {statusLabel[post.status] || post.status}
            </span>
            {post.published_at && (
              <span className="ml-2">{new Date(post.published_at).toLocaleString("pl-PL")}</span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {post.status === "draft" && (
            <>
              <Button variant="secondary" size="sm" type="button" onClick={() => onEdit(post)}>
                Edytuj
              </Button>
              <Button size="sm" type="button" loading={publishing} onClick={handlePublish}>
                Opublikuj
              </Button>
            </>
          )}
          {post.status === "published" && (
            <Button variant="secondary" size="sm" type="button" onClick={toggleMatches}>
              {showMatches ? "Ukryj soczewki" : "Soczewki dopasowania"}
            </Button>
          )}
        </div>
      </div>
      {post.content && (
        <p className="mt-3 text-sm text-[var(--zp-app-text-muted)] line-clamp-4 whitespace-pre-wrap">
          {post.content}
        </p>
      )}
      {showMatches && post.status === "published" && (
        <div className="mt-4 border-t border-[var(--zp-app-border)] pt-3">
          {loadingMatches && <p className="text-xs text-[var(--zp-app-text-muted)]">Wczytywanie…</p>}
          {!loadingMatches && matches && matches.length === 0 && (
            <p className="text-xs text-[var(--zp-app-text-muted)]">
              Brak dopasowań — worker może jeszcze przetwarzać post. Użyj ponownie za moment.
            </p>
          )}
          {!loadingMatches && matches && matches.length > 0 && (
            <ul className="space-y-2">
              {matches.map((m) => (
                <li
                  key={m.lens_id}
                  className="flex items-center justify-between gap-2 text-sm rounded-lg bg-[var(--zp-app-bg)] px-3 py-2"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    {m.lens_emoji && <span>{m.lens_emoji}</span>}
                    <span className="truncate text-slate-800 dark:text-slate-100">{m.lens_name}</span>
                  </span>
                  <MatchBadge score={m.match_score} />
                </li>
              ))}
            </ul>
          )}
          {matches && matches.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              type="button"
              className="mt-2 !text-xs"
              onClick={() => loadMatches()}
            >
              Odśwież listę
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
