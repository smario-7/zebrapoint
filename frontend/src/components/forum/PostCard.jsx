import { useState } from "react";
import { Link } from "react-router-dom";
import Avatar from "../ui/Avatar";
import ReportButton from "../moderation/ReportButton";
import DmModal from "../dm/DmModal";
import useAuthStore from "../../store/authStore";
import { useTranslation } from "react-i18next";

export default function PostCard({ post, groupId }) {
  const { user } = useAuthStore();
  const [showDm, setShowDm] = useState(false);
  const { t, i18n } = useTranslation("app");
  const locale = i18n.language === "en" ? "en-US" : "pl-PL";

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString(locale);
  };

  const isOwn = user?.id === post.user_id;

  const handleDmClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDm(true);
  };

  const content = post.content || "";
  const excerpt =
    content.length > 180
      ? content.slice(0, 180) + "..."
      : content;

  return (
    <Link
      to={`/groups/${groupId}/posts/${post.id}`}
      className="group block bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700
                 hover:border-zebra-200 dark:hover:border-teal-600 hover:shadow-sm transition-all p-4 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <Avatar name={post.display_name} size="sm" className="mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {post.is_pinned && (
              <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300
                               font-semibold px-2 py-0.5 rounded-full">
                {t("postDetail.pinned")}
              </span>
            )}
            {post.is_locked && (
              <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400
                               font-semibold px-2 py-0.5 rounded-full">
                {t("postDetail.locked")}
              </span>
            )}
          </div>

          <h3 className="font-semibold text-slate-800 dark:text-slate-100
                         text-[16px] sm:text-[20px] leading-snug line-clamp-2">
            {post.title}
          </h3>

          <p className="text-[13px] leading-relaxed text-slate-900 dark:text-slate-100 mt-2 line-clamp-2">
            {excerpt}
          </p>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1.5">
            <span>{post.display_name}</span>
            {!isOwn && (
              <button
                type="button"
                onClick={handleDmClick}
                className="text-slate-400 dark:text-slate-500 hover:text-zebra-600 dark:hover:text-teal-400 p-0.5
                           rounded hover:bg-zebra-50 dark:hover:bg-teal-900/30 transition"
                title={t("postDetail.writeTo", { name: post.display_name })}
              >
                ✉️
              </button>
            )}
            <span>· {formatDate(post.created_at)}</span>
          </p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition flex-shrink-0">
              <ReportButton targetType="post" targetId={post.id} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {Object.keys(post.reactions_summary || {}).length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.entries(post.reactions_summary).slice(0, 3).map(([emoji, count]) => (
              <span
                key={emoji}
                className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300
                           px-2 py-1 rounded-xl"
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500">
          💬 {t("postDetail.comments", { count: post.comment_count })}
        </span>
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
    </Link>
  );
}
