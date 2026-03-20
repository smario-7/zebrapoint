import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("app");
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
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-widest">
          {t("symptomEditor.title")}
        </p>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-zebra-600 dark:text-teal-300 font-medium hover:underline"
          >
            {t("symptomEditor.edit")}
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
            className="w-full border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-sm leading-relaxed resize-none
                       bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100
                       placeholder:text-slate-400 dark:placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-zebra-500"
            placeholder={t("symptomEditor.placeholder")}
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
                ? t("symptomEditor.minCharsText", {
                    min: MIN_LENGTH,
                    remaining: MIN_LENGTH - value.trim().length,
                  })
                : t("symptomEditor.minOk")}
            </span>
            <span
              className={
                remaining < 50 ? "text-red-400" : "text-slate-400"
              }
            >
              {t("symptomEditor.remaining", { count: remaining })}
            </span>
          </div>
          {isChanged && isValid && (
            <div className="flex items-start gap-2 bg-zebra-50 dark:bg-teal-900/20 border border-zebra-200 dark:border-teal-800/60 rounded-xl px-3 py-2 text-xs text-zebra-700 dark:text-teal-200">
              <span className="text-base leading-none flex-shrink-0">🔍</span>
              <p>
                {t("symptomEditor.recalcNote")}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || !isChanged || saving}
              className="flex-1 bg-zebra-600 hover:bg-zebra-700
                         disabled:bg-slate-200 dark:disabled:bg-slate-700/50
                         disabled:text-slate-400 dark:disabled:text-slate-500
                         text-white font-semibold text-sm py-2 rounded-xl transition"
            >
              {saving
                ? t("symptomEditor.recalculating")
                : t("symptomEditor.saveAndRecalculate")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="px-4 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold text-sm py-2 rounded-xl
                         hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
            >
              {t("symptomEditor.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div
          className="bg-slate-50 dark:bg-slate-700/30 rounded-xl px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
          onClick={() => setEditing(true)}
          onKeyDown={(e) => e.key === "Enter" && setEditing(true)}
          role="button"
          tabIndex={0}
        >
          {description ? (
            <p className="text-sm text-slate-600 dark:text-slate-200 leading-relaxed line-clamp-3">
              {description}
            </p>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500 italic">
              {t("symptomEditor.noDescription")}
            </p>
          )}
          {description && description.length > 200 && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {t("symptomEditor.expandHint")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
