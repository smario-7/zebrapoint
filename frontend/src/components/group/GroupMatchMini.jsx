/**
 * Kompaktowa karta grupy w drawerze zarządzania grupą.
 * Pokazuje: kolor, nazwę, score, słowa kluczowe, meta (kategoria, wiek, członkowie), notę admina, przycisk Dołącz/Twoja.
 */
import { useTranslation } from "react-i18next";

export default function GroupMatchMini({
  match,
  isCurrentGroup = false,
  isChanging = false,
  onSelect,
}) {
  const { t } = useTranslation("app");

  const {
    name,
    accent_color,
    score_pct,
    member_count,
    keywords,
    age_range,
    symptom_category,
    admin_note,
    is_new_group,
    avg_match_score,
  } = match;

  const scoreLabel =
    score_pct >= 85
      ? {
          text: t("groupMatchMini.scoreGreat"),
          color: "text-emerald-600 dark:text-emerald-400",
        }
      : score_pct >= 70
        ? {
            text: t("groupMatchMini.scoreGood"),
            color: "text-amber-600 dark:text-amber-300",
          }
        : score_pct > 0
          ? {
              text: t("groupMatchMini.scorePossible"),
              color: "text-slate-500 dark:text-slate-400",
            }
          : {
              text: t("groupMatchMini.newGroup"),
              color: "text-slate-400 dark:text-slate-500",
            };

  const barColor =
    score_pct >= 85 ? "#10b981" : score_pct >= 70 ? "#f59e0b" : "#94a3b8";
  const accentColor = accent_color || "#0d9488";

  return (
    <div
      className={
        isCurrentGroup
          ? "rounded-2xl border-2 p-4 transition-all duration-200 border-zebra-400 bg-zebra-50/50 dark:border-teal-600 dark:bg-teal-900/30"
          : "rounded-2xl border-2 p-4 transition-all duration-200 border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:hover:border-teal-600"
      }
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
            style={{ backgroundColor: accentColor }}
          />
          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
            {name}
          </p>
          {isCurrentGroup && (
            <span className="text-xs bg-zebra-500 text-white font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">
              ✓
            </span>
          )}
        </div>
        {score_pct > 0 && (
          <span
            className="text-base font-bold flex-shrink-0"
            style={{ color: barColor }}
          >
            {score_pct}%
          </span>
        )}
      </div>

      {score_pct > 0 && (
        <div className="mb-2">
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${score_pct}%`, backgroundColor: barColor }}
            />
          </div>
          <p className={`text-xs mt-0.5 ${scoreLabel.color}`}>
            {scoreLabel.text}
          </p>
        </div>
      )}

      {keywords?.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-1">
            {t("groupMatchMini.keywordsLabel")}
          </p>
          <div className="flex flex-wrap gap-1">
            {keywords.slice(0, 4).map((kw, i) => (
              <span
                key={i}
                className="text-xs bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-100 px-2 py-0.5 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-xs text-slate-400 dark:text-slate-300 mb-3">
        {symptom_category && symptom_category !== "Inne" && (
          <span>🏥 {symptom_category}</span>
        )}
        {age_range && <span>👶 {age_range}</span>}
        <span>
          👥 {is_new_group ? t("groupMatchMini.new") : t("groupMatchMini.membersCount", { count: member_count })}
        </span>
        {avg_match_score != null && (
          <span>
            {t("groupMatchMini.avgLabel", {
              percent: Math.round(avg_match_score * 100),
            })}
          </span>
        )}
      </div>

      {admin_note && (
        <div className="bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/60 rounded-xl px-3 py-2 mb-3">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">
            {t("groupMatchMini.moderatorLabel")}
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
            {admin_note}
          </p>
        </div>
      )}

      {is_new_group && (
        <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
          {t("groupMatchMini.newGroupNote")}
        </p>
      )}

      <button
        type="button"
        onClick={() => !isCurrentGroup && onSelect(match)}
        disabled={isCurrentGroup || isChanging}
        className={
          isCurrentGroup
            ? "w-full py-2 rounded-xl font-semibold text-sm transition bg-zebra-100 text-zebra-600 cursor-default dark:bg-teal-900/30 dark:text-teal-300"
            : "w-full py-2 rounded-xl font-semibold text-sm transition bg-zebra-600 hover:bg-zebra-700 text-white shadow-sm disabled:opacity-60"
        }
      >
        {isCurrentGroup
          ? t("groupMatchMini.yourCurrentGroup")
          : isChanging
            ? t("groupMatchMini.moving")
            : is_new_group
              ? t("groupMatchMini.createGroup")
              : t("groupMatchMini.joinGroup")}
      </button>
    </div>
  );
}
