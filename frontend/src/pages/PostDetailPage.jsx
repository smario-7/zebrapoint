import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import ReactionBar from "../components/forum/ReactionBar";
import CommentItem from "../components/forum/CommentItem";
import api from "../services/api";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";

export default function PostDetailPage() {
  const { groupId, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [post, setPost]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadPost();
  }, [groupId, postId]);

  const loadPost = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/posts/${postId}`);
      setPost(data);
    } catch {
      toast.error("Nie udało się pobrać posta");
      navigate(`/groups/${groupId}/forum`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post(
        `/groups/${groupId}/posts/${postId}/comments`,
        { content: newComment }
      );
      setPost(prev => ({
        ...prev,
        comments: [...prev.comments, data],
        comment_count: prev.comment_count + 1
      }));
      setNewComment("");
      toast.success("Komentarz dodany!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Błąd dodawania komentarza");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Na pewno usunąć post? To usunie też wszystkie komentarze.")) return;
    try {
      await api.delete(`/groups/${groupId}/posts/${postId}`);
      toast.success("Post usunięty");
      navigate(`/groups/${groupId}/forum`);
    } catch {
      toast.error("Nie udało się usunąć posta");
    }
  };

  const handleDeleteComment = (commentId) => {
    setPost(prev => ({
      ...prev,
      comments: prev.comments.filter(c => c.id !== commentId),
      comment_count: prev.comment_count - 1
    }));
  };

  const isAuthor = user?.id === post?.user_id;
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-slate-200 rounded"></div>
        </div>
      </AppShell>
    );
  }

  if (!post) return null;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">

        <Link
          to={`/groups/${groupId}/forum`}
          className="text-sm text-slate-400 hover:text-slate-600 transition"
        >
          ← Forum grupy
        </Link>

        <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 mt-4">
          <div className="flex items-start gap-3 mb-4">
            <Avatar name={post.display_name} size="md" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.is_pinned && (
                  <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                    📌 Przypięty
                  </span>
                )}
                {post.is_locked && (
                  <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                    🔒 Zamknięty
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-800">{post.title}</h1>
              <p className="text-xs text-slate-400 mt-1">
                {post.display_name} · {new Date(post.created_at).toLocaleDateString("pl-PL")}
              </p>
            </div>
            {(isAuthor || isAdmin) && (
              <button
                onClick={handleDeletePost}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Usuń post
              </button>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap mb-6">
            {post.content}
          </div>

          <div className="flex items-center justify-between py-4 border-t border-slate-100">
            <div className="text-xs text-slate-400">
              💬 {post.comment_count} komentarzy · 👁 {post.views} wyświetleń
            </div>
            <ReactionBar
              groupId={groupId}
              postId={post.id}
              initialSummary={post.reactions_summary}
              initialUserReaction={post.user_reaction}
            />
          </div>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-slate-800 mb-4">Komentarze</h2>

          {!post.is_locked && (
            <div className="bg-white rounded-2xl border-2 border-slate-100 p-4 mb-6">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Napisz komentarz..."
                rows={3}
                maxLength={3000}
                className="w-full border border-slate-200 rounded-xl px-4 py-2
                           focus:outline-none focus:ring-2 focus:ring-zebra-500
                           text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-400">
                  {newComment.length}/3000
                </p>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  loading={submitting}
                  variant="primary"
                >
                  Dodaj komentarz
                </Button>
              </div>
            </div>
          )}

          {post.is_locked && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-amber-700 text-sm">
                🔒 Ten post jest zamknięty — komentowanie wyłączone
              </p>
            </div>
          )}

          <div className="space-y-4">
            {post.comments?.map(comment => (
              <CommentItem
                key={comment.id}
                comment={comment}
                groupId={groupId}
                postId={post.id}
                onDelete={handleDeleteComment}
              />
            ))}
          </div>

          {(!post.comments || post.comments.length === 0) && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-slate-500 text-sm">
                Brak komentarzy. Bądź pierwszym który skomentuje!
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
