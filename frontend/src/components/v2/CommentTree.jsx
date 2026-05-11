import { useState } from "react";
import { ReactionBar } from "./ReactionBar";
import { postsApi } from "../../api/v2/posts";

export function CommentTree({ comments, onRefresh }) {
  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem key={comment.id} comment={comment} onRefresh={onRefresh} />
      ))}
    </div>
  );
}

function CommentItem({ comment, onRefresh }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");

  async function handleReply() {
    if (!replyText.trim()) return;
    await postsApi.addReply(comment.id, replyText.trim());
    setReplyText("");
    setShowReplyForm(false);
    onRefresh();
  }

  async function handleReaction(reaction) {
    await postsApi.toggleCommentReaction(comment.id, reaction);
    onRefresh();
  }

  return (
    <div className={`${comment.depth === 1 ? "ml-8 border-l-2 border-gray-100 dark:border-slate-700 pl-4" : ""}`}>
      <div className="bg-gray-50 dark:bg-slate-800/80 rounded-lg p-3">
        <p className="text-sm text-gray-800 dark:text-slate-200">{comment.content}</p>
        <ReactionBar
          reactions={comment.reactions}
          userReaction={comment.reactions?.user_reaction}
          onToggle={handleReaction}
        />
        {comment.depth === 0 && (
          <button
            type="button"
            onClick={() => setShowReplyForm(!showReplyForm)}
            className="mt-1 text-xs text-blue-600 hover:underline dark:text-teal-400"
          >
            Odpowiedz
          </button>
        )}
      </div>

      {showReplyForm && (
        <div className="mt-2 ml-4 flex gap-2">
          <input
            className="flex-1 border border-slate-200 dark:border-slate-600 rounded px-3 py-1 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
            placeholder="Napisz odpowiedź..."
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <button
            type="button"
            onClick={handleReply}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm dark:bg-teal-600"
          >
            Wyślij
          </button>
        </div>
      )}

      {comment.replies?.length > 0 && (
        <div className="mt-2 space-y-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} onRefresh={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}
