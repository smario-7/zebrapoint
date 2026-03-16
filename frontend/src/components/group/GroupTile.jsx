/**
 * Kafel "Zarządzaj grupą" na dashboardzie.
 * Pokazuje: kolor i nazwę grupy, score dopasowania, kategorię, max 3 słowa kluczowe, liczbę członków.
 * Gdy brak grupy/profilu — zachęta do wypełnienia formularza objawów.
 */
export default function GroupTile({ group, profile, onManage }) {
  if (!group || !profile) {
    return (
      <div
        onClick={onManage}
        onKeyDown={(e) => e.key === "Enter" && onManage()}
        role="button"
        tabIndex={0}
        className="bg-white rounded-2xl border-2 border-dashed border-slate-200 hover:border-zebra-300 hover:shadow-sm transition-all cursor-pointer p-5 flex flex-col items-center justify-center text-center min-h-[160px] group"
      >
        <div className="text-4xl mb-3">🔍</div>
        <p className="font-semibold text-slate-600 group-hover:text-zebra-700 transition">
          Znajdź swoją grupę
        </p>
        <p className="text-sm text-slate-400 mt-1">
          Opisz objawy i dołącz do społeczności
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
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all overflow-hidden">
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
              <p className="font-bold text-slate-800 text-base leading-tight">
                {group.name}
              </p>
              {group.symptom_category && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {group.symptom_category}
                </p>
              )}
            </div>
          </div>
          {scorePct != null && (
            <div className="flex-shrink-0 text-center bg-slate-50 rounded-xl px-2.5 py-1.5 min-w-[52px]">
              <p
                className="text-lg font-bold leading-none"
                style={{ color: scoreColor }}
              >
                {scorePct}%
              </p>
              <p className="text-xs text-slate-400">match</p>
            </div>
          )}
        </div>

        {scorePct != null && (
          <div className="mb-3">
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full"
              >
                {kw}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-50">
          <p className="text-xs text-slate-400">
            👥 {group.member_count ?? 0} członków
          </p>
          <button
            type="button"
            onClick={onManage}
            className="text-sm font-semibold text-zebra-600 hover:text-zebra-700 transition flex items-center gap-1"
          >
            Zarządzaj grupą
            <span className="text-base leading-none">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
