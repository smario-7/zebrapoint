import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Avatar from "../components/ui/Avatar";
import Button from "../components/ui/Button";
import ReactionBar from "../components/forum/ReactionBar";
import CommentItem from "../components/forum/CommentItem";
import DmModal from "../components/dm/DmModal";
import api from "../services/api";
import toast from "react-hot-toast";
import useAuthStore from "../store/authStore";
import { useTranslation } from "react-i18next";
import ConfirmModal from "../components/ui/ConfirmModal";

export default function PostDetailPage() {
  const { groupId, postId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation(["app", "common"]);
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";

  const [post, setPost]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [showDm, setShowDm] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);

  const loadPost = useCallback(async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/posts/${postId}`);
      setPost(data);
    } catch {
      toast.error(t("postDetail.loadError"));
      navigate(`/groups/${groupId}/forum`);
    } finally {
      setLoading(false);
    }
  }, [groupId, postId, t, navigate]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

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
      toast.success(t("postDetail.addSuccess"));
    } catch (err) {
      toast.error(
        err.response?.data?.detail || t("postDetail.addError")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    setDeletingPost(true);
    try {
      await api.delete(`/groups/${groupId}/posts/${postId}`);
      toast.success(t("postDetail.deleteSuccess"));
      setDeletePostOpen(false);
      navigate(`/groups/${groupId}/forum`);
    } catch {
      toast.error(t("postDetail.deleteError"));
    } finally {
      setDeletingPost(false);
    }
  };

  const handleDeleteComment = (commentId) => {
    setPost(prev => ({
      ...prev,
      comments: prev.comments.filter(c => c.id !== commentId),
      comment_count: prev.comment_count - 1
    }));
  };

  const handleCommentUpdate = (commentId, content) => {
    setPost(prev => ({
      ...prev,
      comments: prev.comments.map(c =>
        c.id === commentId ? { ...c, content } : c
      ),
    }));
  };

  const isAuthor = user?.id === post?.user_id;
  const isAdmin = user?.role === "admin";

  if (loading) {
    return (
      <AppShell>
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </AppShell>
    );
  }

  if (!post) return null;

  return (
    <AppShell>
      <ConfirmModal
        open={deletePostOpen}
        title={t("postDetail.deletePost")}
        message={t("postDetail.deleteConfirm")}
        confirmLabel={t("common:confirm")}
        cancelLabel={t("common:cancel")}
        onConfirm={handleDeletePost}
        onCancel={() => setDeletePostOpen(false)}
        loading={deletingPost}
      />
      <div className="max-w-3xl mx-auto">

        <Link
          to={`/groups/${groupId}/forum`}
          className="text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          {t("postDetail.backToList")}
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-6 mt-4">
          <div className="flex items-start gap-3 mb-4">
            <Avatar name={post.display_name} size="md" />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {post.is_pinned && (
                  <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold px-2 py-0.5 rounded-full">
                    {t("postDetail.pinned")}
                  </span>
                )}
                {post.is_locked && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold px-2 py-0.5 rounded-full">
                    {t("postDetail.locked")}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{post.title}</h1>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1.5">
                <span>{post.display_name}</span>
                {!isAuthor && (
                  <button
                    type="button"
                    onClick={() => setShowDm(true)}
                    className="text-slate-400 dark:text-slate-500 hover:text-zebra-600 dark:hover:text-teal-400 p-0.5 rounded
                               hover:bg-zebra-50 dark:hover:bg-teal-900/30 transition"
                    title={t("postDetail.writeTo", { name: post.display_name })}
                  >
                    ✉️
                  </button>
                )}
                <span>· {new Date(post.created_at).toLocaleDateString(locale)}</span>
              </p>
            </div>
            {(isAuthor || isAdmin) && (
              <button
                type="button"
                onClick={() => setDeletePostOpen(true)}
                className="text-xs text-red-400 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                {t("postDetail.deletePost")}
              </button>
            )}
          </div>

          <div className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 whitespace-pre-wrap mb-6">
            {post.content}
          </div>

          <div className="flex items-center justify-between py-4 border-t border-slate-100 dark:border-slate-700">
            <div className="text-xs text-slate-400 dark:text-slate-500">
              {t("postDetail.comments", { count: post.comment_count })} ·{" "}
              {t("postDetail.views", { count: post.views })}
            </div>
            <ReactionBar
              groupId={groupId}
              postId={post.id}
              initialSummary={post.reactions_summary}
              initialUserReaction={post.user_reaction}
            />
          </div>
        </div>

        {showDm && (
          <DmModal
            targetUserId={post.user_id}
            targetUserNick={post.display_name}
            onClose={() => setShowDm(false)}
            forumContext={{
              postId: post.id,
              postTitle: post.title,
              postExcerpt: post.content?.slice(0, 150),
              groupId,
            }}
          />
        )}

        <div className="mt-6">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t("postDetail.commentsSection")}
          </h2>

          {!post.is_locked && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 p-4 mb-6">
              <textarea
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder={t("postDetail.writeComment")}
                rows={3}
                maxLength={3000}
                className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-zebra-500 dark:focus:ring-teal-400
                           text-sm resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {newComment.length}/3000
                </p>
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submitting}
                  loading={submitting}
                  variant="primary"
                >
                  {t("postDetail.addComment")}
                </Button>
              </div>
            </div>
          )}

          {post.is_locked && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-center">
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                {t("postDetail.lockedNotice")}
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
                postTitle={post.title}
                onDelete={handleDeleteComment}
                onCommentUpdate={handleCommentUpdate}
              />
            ))}
          </div>

          {(!post.comments || post.comments.length === 0) && (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                {t("postDetail.noComments")}
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
