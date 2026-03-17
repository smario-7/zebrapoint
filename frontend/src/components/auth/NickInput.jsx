import { useState, useEffect, useCallback } from "react";
import api from "../../services/api";

/**
 * Pole nicku z walidacją real-time: debounce 500ms, sprawdza API /auth/check-nick.
 * Pokazuje: dostępny / zajęty lub zły format + ewentualne podpowiedzi.
 */
export default function NickInput({ value, onChange, error, currentNick, onStatusChange, label = "Pseudonim (nick)" }) {
  const safeValue = value ?? "";
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [suggestions, setSuggestions] = useState([]);

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

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>

      <div className="relative">
        <input
          type="text"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="np. Mama_Zosi"
          maxLength={30}
          className={`
            w-full border rounded-xl px-4 py-2.5 pr-10 text-sm
            focus:outline-none focus:ring-2 transition
            ${status === "available"
              ? "border-emerald-300 focus:ring-emerald-400"
              : isBad
              ? "border-red-300 focus:ring-red-400"
              : "border-slate-200 focus:ring-zebra-500"
            }
            ${error ? "border-red-300" : ""}
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
          className={`text-xs mt-1 ${
            status === "available" ? "text-emerald-600" : "text-red-500"
          }`}
        >
          {message}
        </p>
      )}

      {status === "taken" && suggestions.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-slate-500 mb-1">Dostępne alternatywy:</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onChange(s)}
                className="text-xs bg-slate-100 hover:bg-zebra-100 hover:text-zebra-700 text-slate-600 px-2.5 py-1 rounded-full transition"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!status && safeValue.length === 0 && (
        <p className="text-xs text-slate-400 mt-1">
          3–30 znaków: litery, cyfry, _ i -
        </p>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
