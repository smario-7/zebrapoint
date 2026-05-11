import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { postsApi } from "../../api/v2/posts";
import { MatchBadge } from "./MatchBadge";
import Button from "../ui/Button";

export default function LensPostDetail({ postId, matchScore, onBack }) {
  const [post, setPost] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    postsApi
      .get(postId)
      .then((p) => {
        if (!cancelled) setPost(p);
      })
      .catch((e) => {
        if (!cancelled) setErr(e.message || "Nie udało się wczytać posta");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  return (
    <div className="rounded-2xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] p-4 sm:p-6 min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" type="button" onClick={onBack} className="!gap-1">
          <ArrowLeft className="w-4 h-4 shrink-0" aria-hidden />
          Wróć
        </Button>
      </div>
      {loading && <p className="text-sm text-[var(--zp-app-text-muted)]">Wczytywanie…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}
      {!loading && post && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{post.title}</h2>
            {matchScore != null && <MatchBadge score={matchScore} />}
          </div>
          <p className="text-xs text-[var(--zp-app-text-muted)] mb-4">
            {post.status === "published" && post.published_at
              ? new Date(post.published_at).toLocaleString("pl-PL")
              : post.status}
          </p>
          <article className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-[var(--zp-app-text-primary)]">
            {post.content}
          </article>
        </>
      )}
    </div>
  );
}
