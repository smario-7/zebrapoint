import { useState } from "react";
import Avatar from "../ui/Avatar";
import ReactionBar from "./ReactionBar";
import ReportButton from "../moderation/ReportButton";
import api from "../../services/api";
import toast from "react-hot-toast";
import useAuthStore from "../../store/authStore";

export default function CommentItem({ comment, groupId, postId, onDelete }) {
  const { user }          = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [saving, setSaving]   = useState(false);

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
      toast.success("Komentarz zaktualizowany");
    } catch {
      toast.error("Nie udało się zapisać");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Usunąć komentarz?")) return;
    try {
      await api.delete(
        `/groups/${groupId}/posts/${postId}/comments/${comment.id}`
      );
      onDelete(comment.id);
    } catch {
      toast.error("Nie udało się usunąć");
    }
  };

  return (
    <div className="flex gap-3 group">
      <Avatar name={comment.display_name} size="sm"
              className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-zebra-700">
              {comment.display_name}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(comment.created_at).toLocaleDateString("pl-PL")}
            </span>
          </div>

          {editing ? (
            <div className="space-y-2">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={3}
                className="w-full text-sm border rounded-xl px-3 py-2
                           focus:outline-none focus:ring-2 focus:ring-zebra-500 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs bg-zebra-600 text-white px-3 py-1.5
                             rounded-lg hover:bg-zebra-700 transition disabled:opacity-50"
                >
                  {saving ? "Zapisuję..." : "Zapisz"}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditValue(comment.content); }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Anuluj
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
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
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Edytuj
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Usuń
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
