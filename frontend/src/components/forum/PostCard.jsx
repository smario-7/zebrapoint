import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import ReportButton from "../moderation/ReportButton";

export default function PostCard({ post, groupId }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("pl-PL");
  };

  return (
    <Link
      to={`/groups/${groupId}/posts/${post.id}`}
      className="group block bg-white rounded-2xl border-2 border-slate-100
                 hover:border-zebra-200 hover:shadow-sm transition-all p-5"
    >
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={post.display_name} size="sm" className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {post.is_pinned && (
              <span className="text-xs bg-amber-100 text-amber-700
                               font-semibold px-2 py-0.5 rounded-full">
                📌 Przypięty
              </span>
            )}
            {post.is_locked && (
              <span className="text-xs bg-slate-100 text-slate-500
                               font-semibold px-2 py-0.5 rounded-full">
                🔒 Zamknięty
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-800 leading-snug line-clamp-2">
            {post.title}
          </h3>

          <p className="text-xs text-slate-400 mt-1">
            {post.display_name} · {formatDate(post.created_at)}
          </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
              <ReportButton targetType="post" targetId={post.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>💬 {post.comment_count}</span>
          <span>👁 {post.views}</span>
        </div>

        {Object.keys(post.reactions_summary || {}).length > 0 && (
          <div className="flex gap-1">
            {Object.entries(post.reactions_summary).map(([emoji, count]) => (
              <span key={emoji} className="text-xs bg-slate-100 px-1.5 py-0.5 rounded-lg">
                {emoji} {count}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
