import { useEffect } from "react";
import { Link } from "react-router-dom";
import GroupMatchMini from "./GroupMatchMini";
import SymptomEditor from "./SymptomEditor";
import { SkeletonCard } from "../ui/Skeleton";

/**
 * Duże okno modalne zarządzania grupą (wyśrodkowane).
 * Sekcje: aktualna grupa, opis objawów (edytor), TOP 3 dopasowań.
 */
export default function GroupDrawer({
  isOpen,
  onClose,
  group,
  profile,
  matches,
  loadingMatches,
  updatingDesc,
  changingGroup,
  onUpdateDescription,
  onChangeGroup,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const accentColor = group?.accent_color || "#0d9488";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4 transition-opacity"
      onClick={onClose}
      aria-hidden="true"
    >
      <div
        className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl shadow-2xl bg-white z-50 animate-modal-enter"
        role="dialog"
        aria-modal="true"
        aria-label="Zarządzanie grupą"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
          <h2 className="font-bold text-slate-800 text-lg">
            Zarządzanie grupą
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition text-xl leading-none"
            aria-label="Zamknij"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 border-b">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Twoja aktualna grupa
            </p>
            {group ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0"
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
                    <p className="font-bold text-slate-800">{group.name}</p>
                    <p className="text-xs text-slate-400">
                      {group.symptom_category || "Ogólna"} ·{" "}
                      {group.member_count ?? 0} członków
                    </p>
                  </div>
                </div>
                <Link
                  to={`/groups/${group.id}`}
                  onClick={onClose}
                  className="text-sm font-semibold text-zebra-600 hover:text-zebra-700 transition flex-shrink-0 flex items-center gap-1"
                >
                  Czat →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">
                Nie jesteś przypisany do żadnej grupy
              </p>
            )}
          </div>

          <div className="px-6 py-5 border-b">
            <SymptomEditor
              description={profile?.description}
              onSave={onUpdateDescription}
              saving={updatingDesc}
            />
          </div>

          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Najbliższe grupy
              </p>
              {!loadingMatches && matches.length > 0 && (
                <p className="text-xs text-slate-400">
                  na podstawie Twojego opisu
                </p>
              )}
            </div>

            {loadingMatches ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : matches.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-2xl">
                <p className="text-4xl mb-2">🔍</p>
                <p className="text-sm text-slate-500 font-medium">
                  {profile
                    ? "Brak dopasowań"
                    : "Najpierw wypełnij formularz objawów"}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {profile
                    ? "Dodaj lub rozbuduj opis objawów żeby znaleźć grupę"
                    : "Opisz objawy, a system dopasuje Cię do grupy"}
                </p>
                {!profile && (
                  <Link
                    to="/symptoms/new"
                    onClick={onClose}
                    className="inline-block mt-3 text-sm font-semibold text-zebra-600 hover:text-zebra-700"
                  >
                    Przejdź do formularza →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <GroupMatchMini
                    key={match.group_id}
                    match={match}
                    isCurrentGroup={match.group_id === group?.id}
                    isChanging={changingGroup}
                    onSelect={(m) => onChangeGroup(m, profile?.id)}
                  />
                ))}
              </div>
            )}

            <div className="mt-4 bg-slate-50 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                💡 Dopasowanie obliczane jest przez analizę podobieństwa
                opisów. Grupy automatycznie reklasyfikują się gdy w bazie
                pojawi się więcej opisów.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
