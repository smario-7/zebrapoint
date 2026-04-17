import { MatchBadge } from "./MatchBadge";

const TYPE_COLORS = {
  diagnostic: "border-l-purple-400",
  symptomatic: "border-l-blue-400",
  topical: "border-l-green-400",
};

export function LensCard({ lens, onClick, isSelected }) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        ${onClick ? "cursor-pointer" : ""}
        border-l-4 ${TYPE_COLORS[lens.type] || "border-l-gray-300"}
        bg-white dark:bg-slate-800 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow
        ${isSelected ? "ring-2 ring-blue-500 dark:ring-teal-500" : ""}
      `}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {lens.emoji && <span className="text-lg shrink-0">{lens.emoji}</span>}
          <span className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
            {lens.name}
          </span>
        </div>
        {lens.user_score != null && <MatchBadge score={lens.user_score} />}
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        {lens.post_count} {lens.post_count === 1 ? "post" : "postów"}
      </div>
    </div>
  );
}
