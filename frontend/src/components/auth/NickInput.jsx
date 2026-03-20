import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";

/**
 * Pole nicku z walidacją real-time: debounce 500ms, sprawdza API /auth/check-nick.
 * Pokazuje: dostępny / zajęty lub zły format + ewentualne podpowiedzi.
 */
export default function NickInput({ value, onChange, error, currentNick, onStatusChange, label }) {
  const { t } = useTranslation("auth");
  const safeValue = value ?? "";
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const resolvedLabel = label || t("register.nickLabel");

  const checkNick = useCallback(async (nick) => {
    if (!nick || nick.length < 3) {
      setStatus(null);
      setMessage("");
      setSuggestions([]);
      onStatusChange?.(null);
      return;
    }

    if (currentNick && nick.toLowerCase() === currentNick.toLowerCase()) {
      setStatus(null);
      setMessage("");
      setSuggestions([]);
      onStatusChange?.(null);
      return;
    }

    setStatus("checking");
    onStatusChange?.("checking");
    try {
      const { data } = await api.get(
        `/auth/check-nick?nick=${encodeURIComponent(nick)}`
      );
      const nextStatus = data.available ? "available" : data.reason === "taken" ? "taken" : "invalid";
      setStatus(nextStatus);
      setMessage(data.message || "");
      setSuggestions(data.suggestions || []);
      onStatusChange?.(nextStatus);
    } catch {
      setStatus(null);
      setMessage("");
      setSuggestions([]);
      onStatusChange?.(null);
    }
  }, [currentNick, onStatusChange]);

  useEffect(() => {
    const timer = setTimeout(() => checkNick(safeValue), 500);
    return () => clearTimeout(timer);
  }, [safeValue, checkNick]);

  const statusConfig = {
    checking: { icon: "⏳", color: "text-slate-400" },
    available: { icon: "✓", color: "text-emerald-600" },
    taken: { icon: "✗", color: "text-red-500" },
    invalid: { icon: "✗", color: "text-red-500" },
  };

  const cfg = statusConfig[status];
  const isBad = status === "taken" || status === "invalid";

  const inputBorder =
    error || isBad
      ? "border-red-400 dark:border-red-500 focus:ring-red-400 focus:border-red-400"
      : status === "available"
        ? "border-[var(--zp-accent-primary)] focus:ring-[var(--zp-accent-primary)] focus:border-[var(--zp-accent-primary)]"
        : "border-[var(--zp-app-border)] focus:ring-[var(--zp-accent-primary)] focus:border-[var(--zp-accent-primary)]";

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[var(--zp-app-text-primary)]">
        {resolvedLabel}
      </label>

      <div className="relative">
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("register.placeholderNick")}
          maxLength={30}
          className={`
            w-full h-11 border rounded-[10px] px-3.5 pr-10 text-[var(--zp-app-text-primary)] bg-[var(--zp-app-input-bg)]
            placeholder:text-[var(--zp-app-text-muted)]
            focus:outline-none focus:ring-2 transition
            ${inputBorder}
          `}
        />
        {cfg && (
          <span
            className={`absolute right-3 top-1/2 -translate-y-1/2 font-bold ${cfg.color}`}
          >
            {cfg.icon}
          </span>
        )}
      </div>

      {message && status !== "checking" && (
        <p
          className={`text-xs ${
            status === "available" ? "text-emerald-600 dark:text-teal-400" : "text-red-500 dark:text-red-400"
          }`}
        >
          {message}
        </p>
      )}

      {status === "taken" && suggestions.length > 0 && (
        <div className="mt-1">
          <p className="text-xs text-[var(--zp-app-text-muted)] mb-1">{t("register.alternativesLabel")}</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(s)}
                className="text-xs bg-[var(--zp-app-accent-bg)] text-[var(--zp-accent-primary)] hover:opacity-90 px-2.5 py-1 rounded-full transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!status && safeValue.length === 0 && (
        <p className="text-xs text-[var(--zp-app-text-muted)]">
          {t("nickHint")}
        </p>
      )}

      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
