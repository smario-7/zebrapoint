import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { postsApi } from "../api/v2/posts";
import AppShell from "../components/layout/AppShell";
import PostCard from "../components/v2/PostCard";
import PostModal from "../components/v2/PostModal";
import LensProposalModal from "../components/v2/LensProposalModal";
import Button from "../components/ui/Button";

export default function MyPosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await postsApi.list();
      setPosts(rows || []);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Moje posty</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setShowProposalModal(true)}>
              Zaproponuj soczewkę
            </Button>
            <Button
              size="sm"
              type="button"
              onClick={() => {
                setEditingPost(null);
                setShowPostModal(true);
              }}
            >
              Nowy post
            </Button>
          </div>
        </div>

        {loading && <p className="text-sm text-[var(--zp-app-text-muted)]">Wczytywanie…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-sm text-[var(--zp-app-text-muted)]">Nie masz jeszcze żadnych postów.</p>
        )}
        {!loading &&
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onEdit={(p) => {
                setEditingPost(p);
                setShowPostModal(true);
              }}
              onChanged={loadPosts}
            />
          ))}

        {showPostModal && (
          <PostModal
            post={editingPost}
            onClose={() => {
              setShowPostModal(false);
              setEditingPost(null);
            }}
            onSaved={loadPosts}
          />
        )}
        {showProposalModal && (
          <LensProposalModal onClose={() => setShowProposalModal(false)} />
        )}
      </div>
    </AppShell>
  );
}
