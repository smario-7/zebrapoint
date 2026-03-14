import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Button from "../components/ui/Button";
import PostCard from "../components/forum/PostCard";
import { SkeletonCard } from "../components/ui/Skeleton";
import api from "../services/api";
import toast from "react-hot-toast";

export default function ForumPage() {
  const { groupId } = useParams();

  const [posts, setPosts]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPost, setNewPost]     = useState({ title: "", content: "" });

  const loadPosts = async (p = 1) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/groups/${groupId}/posts?page=${p}&limit=20`
      );
      if (p === 1) {
        setPosts(data);
      } else {
        setPosts(prev => [...prev, ...data]);
      }
      setHasMore(data.length === 20);
      setPage(p);
    } catch {
      toast.error("Nie udało się pobrać postów");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPosts(1); }, [groupId]);

  const handleCreate = async () => {
    if (!newPost.title.trim() || !newPost.content.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(`/groups/${groupId}/posts`, newPost);
      setPosts(prev => [data, ...prev]);
      setNewPost({ title: "", content: "" });
      setShowForm(false);
      toast.success("Post opublikowany!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd tworzenia posta");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              to={`/groups/${groupId}`}
              className="text-sm text-slate-400 hover:text-slate-600 transition"
            >
              ← Czat grupy
            </Link>
            <h1 className="text-2xl font-bold text-slate-800 mt-1">
              📋 Forum grupy
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Trwała wiedza i doświadczenia członków
            </p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant="primary">
            {showForm ? "Anuluj" : "+ Nowy post"}
          </Button>
        </div>

        {showForm && (
          <div className="bg-white rounded-2xl border-2 border-zebra-200 p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-slate-800">Nowy post</h2>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Tytuł
              </label>
              <input
                value={newPost.title}
                onChange={e => setNewPost(p => ({ ...p, title: e.target.value }))}
                placeholder="Np. Lista sprawdzonych neurologów dziecięcych..."
                maxLength={200}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-zebra-500
                           text-sm"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {newPost.title.length}/200
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Treść
              </label>
              <textarea
                value={newPost.content}
                onChange={e => setNewPost(p => ({ ...p, content: e.target.value }))}
                placeholder="Opisz swoje doświadczenia, podziel się wiedzą, zadaj pytanie..."
                rows={6}
                maxLength={10000}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5
                           resize-none focus:outline-none focus:ring-2
                           focus:ring-zebra-500 text-sm leading-relaxed"
              />
              <p className="text-xs text-slate-400 mt-1 text-right">
                {newPost.content.length}/10 000
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Post będzie widoczny dla wszystkich członków grupy
              </p>
              <Button
                onClick={handleCreate}
                disabled={
                  !newPost.title.trim() ||
                  newPost.content.trim().length < 20 ||
                  submitting
                }
                loading={submitting}
              >
                Opublikuj
              </Button>
            </div>
          </div>
        )}

        {loading && posts.length === 0 ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📝</div>
            <p className="text-slate-600 font-semibold text-lg">
              Brak postów
            </p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              Bądź pierwszą osobą która podzieli się wiedzą lub doświadczeniem
              z grupą.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-6 text-zebra-600 font-semibold hover:underline text-sm"
            >
              Napisz pierwszy post →
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {posts.map(post => (
                <PostCard key={post.id} post={post} groupId={groupId} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={() => loadPosts(page + 1)}
                  disabled={loading}
                  className="text-zebra-600 font-medium hover:underline
                             text-sm disabled:opacity-50"
                >
                  {loading ? "Ładowanie..." : "Pokaż starsze posty"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
