const REACTIONS = [
  { key: "heart", emoji: "❤️" },
  { key: "sad", emoji: "😢" },
  { key: "strong", emoji: "💪" },
  { key: "pray", emoji: "🙏" },
  { key: "think", emoji: "🤔" },
  { key: "thumbsup", emoji: "👍" },
  { key: "target", emoji: "🎯" },
];

export function ReactionBar({ reactions = {}, userReaction, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {REACTIONS.map(({ key, emoji }) => {
        const count = reactions[key] || 0;
        const active = userReaction === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onToggle(key)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
              active
                ? "bg-blue-100 border-blue-300 text-blue-700 dark:bg-teal-900/40 dark:border-teal-600 dark:text-teal-200"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
