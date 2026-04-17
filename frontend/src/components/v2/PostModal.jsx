import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { postsApi } from "../../api/v2/posts";
import Button from "../ui/Button";

export default function PostModal({ post, onClose, onSaved }) {
  const [title, setTitle] = useState(post?.title || "");
  const [content, setContent] = useState(post?.content || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(post?.title || "");
    setContent(post?.content || "");
  }, [post]);

  async function handleSave() {
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      toast.error("Uzupełnij tytuł i treść");
      return;
    }
    setSaving(true);
    try {
      if (post?.id) {
        await postsApi.update(post.id, { title: t, content: c });
        toast.success("Zapisano wersję roboczą");
      } else {
        await postsApi.create({ title: t, content: c });
        toast.success("Utworzono szkic posta");
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast.error(e.message || "Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="post-modal-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[var(--zp-app-card)] border border-[var(--zp-app-border)] shadow-xl max-h-[90dvh] flex flex-col">
        <div className="p-4 border-b border-[var(--zp-app-border)] flex items-center justify-between">
          <h2 id="post-modal-title" className="font-semibold text-slate-900 dark:text-slate-100">
            {post ? "Edycja posta" : "Nowy post"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--zp-app-text-muted)] hover:text-slate-900 dark:hover:text-white text-sm"
          >
            Zamknij
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          <div>
            <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">Tytuł</label>
            <input
              className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-bg)] px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">Treść</label>
            <textarea
              className="w-full min-h-[200px] rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-bg)] px-3 py-2 text-sm"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>
        <div className="p-4 border-t border-[var(--zp-app-border)] flex justify-end gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Anuluj
          </Button>
          <Button size="sm" type="button" loading={saving} onClick={handleSave}>
            Zapisz szkic
          </Button>
        </div>
      </div>
    </div>
  );
}
