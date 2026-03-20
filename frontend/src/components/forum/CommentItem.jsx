import { useState } from "react";
import Avatar from "../ui/Avatar";
import ReactionBar from "./ReactionBar";
import ReportButton from "../moderation/ReportButton";
import DmModal from "../dm/DmModal";
import api from "../../services/api";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";
import { useTranslation } from "react-i18next";

export default function CommentItem({ comment, groupId, postId, postTitle, onDelete }) {
  const { user } = useAuthStore();
  const { t, i18n } = useTranslation("app");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [saving, setSaving] = useState(false);
  const [showDm, setShowDm] = useState(false);

  const isOwn = user?.id === comment.user_id;

  const handleSave = async () => {
    if (!editValue.trim() || editValue === comment.content) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await api.patch(
        `/groups/${groupId}/posts/${postId}/comments/${comment.id}`,
        { content: editValue }
      );
      comment.content = editValue;
      setEditing(false);
      toast.success(t("comment.saveSuccess"));
    } catch {
      toast.error(t("comment.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t("comment.deleteConfirm"))) return;
    try {
      await api.delete(
        `/groups/${groupId}/posts/${postId}/comments/${comment.id}`
      );
      onDelete(comment.id);
    } catch {
      toast.error(t("comment.deleteError"));
    }
  };

  return (
    <div className="flex gap-3 group">
      <Avatar name={comment.display_name} size="sm"
              className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-zebra-700 dark:text-teal-400">
                {comment.display_name}
              </span>
              {!isOwn && (
                <button
                  type="button"
                  onClick={() => setShowDm(true)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-zebra-600 dark:hover:text-teal-400
                             p-1 rounded-lg hover:bg-zebra-50 dark:hover:bg-teal-900/30 transition"
                  title={t("dm.writeTo", { name: comment.display_name })}
                >
                  ✉️
                </button>
              )}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(comment.created_at).toLocaleDateString(locale)}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={3}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-zebra-500 dark:focus:ring-teal-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs bg-zebra-600 dark:bg-teal-500 text-white dark:text-slate-900 px-3 py-1.5
                             rounded-lg hover:bg-zebra-700 dark:hover:bg-teal-400 transition disabled:opacity-50"
                >
                  {saving ? t("comment.saving") : t("comment.save")}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditValue(comment.content); }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {t("comment.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <ReactionBar
            groupId={groupId}
            postId={postId}
            commentId={comment.id}
            initialSummary={comment.reactions_summary}
            initialUserReaction={comment.user_reaction}
          />
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
            <ReportButton targetType="comment" targetId={comment.id} />
            {isOwn && !editing && (
              <>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {t("comment.edit")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300"
                >
                  {t("comment.delete")}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      {showDm && (
        <DmModal
          targetUserId={comment.user_id}
          targetUserNick={comment.display_name}
          onClose={() => setShowDm(false)}
          forumContext={
            postId && postTitle
              ? {
                  postId,
                  postTitle,
                  postExcerpt: comment.content?.slice(0, 150),
                  groupId,
                }
              : null
          }
        />
      )}
    </div>
  );
}
