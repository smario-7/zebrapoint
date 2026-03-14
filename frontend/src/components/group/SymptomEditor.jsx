import { useState } from "react";

const MIN_LENGTH = 100;
const MAX_LENGTH = 1000;

/**
 * Edytor opisu objawów: tryb podglądu (skrócony opis + Edytuj) lub edycji (textarea + Zapisz/Anuluj).
 * Po zapisaniu wywołuje onSave(newDescription) — hook obsługuje API i przeliczenie TOP 3.
 */
export default function SymptomEditor({
  description,
  onSave,
  saving = false,
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(description || "");

  const handleSave = async () => {
    if (value.trim().length < MIN_LENGTH) return;
    const ok = await onSave(value.trim());
    if (ok) setEditing(false);
  };

  const handleCancel = () => {
    setValue(description || "");
    setEditing(false);
  };

  const remaining = MAX_LENGTH - value.length;
  const isValid = value.trim().length >= MIN_LENGTH;
  const isChanged = value.trim() !== (description || "").trim();

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Twój opis objawów
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zebra-600 font-medium hover:underline"
          >
            Edytuj
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={5}
            maxLength={MAX_LENGTH}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-zebra-500"
            placeholder="Opisz objawy własnymi słowami..."
            autoFocus
          />
          <div className="flex justify-between text-xs">
            <span
              className={
                value.trim().length < MIN_LENGTH
                  ? "text-amber-500"
                  : "text-slate-400"
              }
            >
              {value.trim().length < MIN_LENGTH
                ? `Minimum ${MIN_LENGTH} znaków (jeszcze ${MIN_LENGTH - value.trim().length})`
                : "✓ Minimalna długość spełniona"}
            </span>
            <span
              className={
                remaining < 50 ? "text-red-400" : "text-slate-400"
              }
            >
              {remaining} pozostało
            </span>
          </div>
          {isChanged && isValid && (
            <div className="flex items-start gap-2 bg-zebra-50 border border-zebra-200 rounded-xl px-3 py-2 text-xs text-zebra-700">
              <span className="text-base leading-none flex-shrink-0">🔍</span>
              <p>
                Po zapisaniu automatycznie przeliczymy TOP 3 najlepszych grup
                dla Twojego nowego opisu.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || !isChanged || saving}
              className="flex-1 bg-zebra-600 hover:bg-zebra-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm py-2 rounded-xl transition"
            >
              {saving ? "Przeliczam dopasowania..." : "Zapisz i przelicz"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 border border-slate-200 text-slate-600 font-semibold text-sm py-2 rounded-xl hover:bg-slate-50 transition"
            >
              Anuluj
            </button>
          </div>
        </div>
      ) : (
        <div
          className="bg-slate-50 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 transition"
          onClick={() => setEditing(true)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
          role="button"
          tabIndex={0}
        >
          {description ? (
            <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
              {description}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">
              Brak opisu — kliknij żeby dodać
            </p>
          )}
          {description && description.length > 200 && (
            <p className="text-xs text-slate-400 mt-1">
              Kliknij żeby zobaczyć i edytować cały opis
            </p>
          )}
        </div>
      )}
    </div>
  );
}
