import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

const EMOJI_OPTIONS = ["❤️", "👍", "🙏", "💪", "😢", "🤗", "💡"];

export default function ReactionBar({
  groupId,
  postId,
  commentId = null,
  initialSummary = {},
  initialUserReaction = null
}) {
  const { t } = useTranslation("app");
  const [summary, setSummary]           = useState(initialSummary);
  const [userReaction, setUserReaction] = useState(initialUserReaction);
  const [showPicker, setShowPicker]     = useState(false);
  const [loading, setLoading]           = useState(false);

  const endpoint = commentId
    ? `/groups/${groupId}/posts/${postId}/comments/${commentId}/reactions`
    : `/groups/${groupId}/posts/${postId}/reactions`;

  const handleReact = async (emoji) => {
    if (loading) return;
    setLoading(true);
    setShowPicker(false);

    const prevSummary      = { ...summary };
    const prevUserReaction = userReaction;

    const newSummary = { ...summary };

    if (userReaction) {
      newSummary[userReaction] = (newSummary[userReaction] || 1) - 1;
      if (newSummary[userReaction] <= 0) delete newSummary[userReaction];
    }

    const isToggleOff = userReaction === emoji;
    if (!isToggleOff) {
      newSummary[emoji] = (newSummary[emoji] || 0) + 1;
    }

    setSummary(newSummary);
    setUserReaction(isToggleOff ? null : emoji);

    try {
      const { data } = await api.post(endpoint, { emoji });
      setSummary(data.reactions_summary);
      setUserReaction(data.user_reaction);
    } catch {
      setSummary(prevSummary);
      setUserReaction(prevUserReaction);
      toast.error(t("reaction.addError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">

      {Object.entries(summary).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => handleReact(emoji)}
          disabled={loading}
          className={`
            flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm
            border transition-all
            ${userReaction === emoji
              ? "bg-zebra-50 dark:bg-teal-900/30 border-zebra-300 dark:border-teal-600 text-zebra-700 dark:text-teal-300"
              : "bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500"
            }
          `}
        >
          <span>{emoji}</span>
          <span className="font-medium text-xs">{count}</span>
        </button>
      ))}

      <div className="relative">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-sm
                     border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500
                     hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition"
        >
          <span>+</span>
          <span className="text-xs">{t("reaction.label")}</span>
        </button>

        {showPicker && (
          <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-lg p-2 z-10 flex gap-1">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className={`
                  text-xl p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition
                  ${userReaction === emoji ? "bg-zebra-50 dark:bg-teal-900/30" : ""}
                `}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
