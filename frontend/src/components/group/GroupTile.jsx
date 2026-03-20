/**
 * Kafel "Zarządzaj grupą" na dashboardzie.
 * Pokazuje: kolor i nazwę grupy, score dopasowania, kategorię, max 3 słowa kluczowe, liczbę członków.
 * Gdy brak grupy/profilu — zachęta do wypełnienia formularza objawów.
 */
import { useTranslation } from "react-i18next";

export default function GroupTile({ group, profile, onManage }) {
  const { t } = useTranslation("app");

  if (!group || !profile) {
    return (
      <div
        onClick={onManage}
        onKeyDown={(e) => e.key === "Enter" && onManage()}
        role="button"
        tabIndex={0}
        className="bg-[var(--zp-app-card)] rounded-2xl border-2 border-dashed border-[var(--zp-app-border)] hover:border-zebra-300 dark:hover:border-teal-600 hover:shadow-sm transition-all cursor-pointer p-5 flex flex-col items-center justify-center text-center min-h-[160px] group"
      >
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-semibold text-slate-600 dark:text-slate-300 group-hover:text-zebra-700 dark:group-hover:text-teal-400 transition">
          {t("groupTile.findGroup")}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          {t("groupTile.findGroupHint")}
        </p>
      </div>
    );
  }

  const accentColor = group.accent_color || "#0d9488";
  const scorePct =
    profile.match_score != null
      ? Math.round(profile.match_score * 100)
      : null;
  const keywords = (group.keywords || []).slice(0, 3);

  const scoreColor =
    scorePct >= 85
      ? "#10b981"
      : scorePct >= 70
        ? "#f59e0b"
        : "#94a3b8";

  return (
    <div className="bg-[var(--zp-app-card)] rounded-2xl border border-[var(--zp-app-border)] hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all overflow-hidden">
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accentColor }}
      />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex-shrink-0"
              style={{
                backgroundColor: `${accentColor}22`,
                border: `2px solid ${accentColor}44`,
              }}
            >
              <div
                className="w-full h-full rounded-xl opacity-60"
                style={{ backgroundColor: accentColor }}
              />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100 text-base leading-tight">
                {group.name}
              </p>
              {group.symptom_category && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {group.symptom_category}
                </p>
              )}
            </div>
          </div>
          {scorePct != null && (
            <div className="flex-shrink-0 text-center bg-slate-50 dark:bg-slate-700/50 rounded-xl px-2.5 py-1.5 min-w-[52px]">
              <p
                className="text-lg font-bold leading-none"
                style={{ color: scoreColor }}
              >
                {scorePct}%
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t("groupTile.match")}
              </p>
            </div>
          )}
        </div>

        {scorePct != null && (
          <div className="mb-3">
            <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${scorePct}%`,
                  backgroundColor: scoreColor,
                }}
              />
            </div>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {keywords.map((kw, i) => (
              <span
                key={i}
                className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            👥 {t("groupTile.members", { count: group.member_count ?? 0 })}
          </p>
          <button
            type="button"
            onClick={onManage}
            className="text-sm font-semibold text-zebra-600 dark:text-teal-400 hover:text-zebra-700 dark:hover:text-teal-300 transition flex items-center gap-1"
          >
            {t("groupTile.manageGroup")}
            <span className="text-base leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
