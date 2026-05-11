export function MatchBadge({ score }) {
  const pct = Math.round(Number(score) * 100);
  const tier = pct >= 70 ? "primary" : pct >= 40 ? "secondary" : "suggested";

  const colors = {
    primary: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
    secondary: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-100",
    suggested: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  };

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[tier]}`}>{pct}%</span>
  );
}
