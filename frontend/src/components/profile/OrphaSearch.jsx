import { useCallback, useEffect, useState } from "react";
import api, { API_V2_AUTH_BASE } from "../../services/api";
import useDebouncedCallback from "../../hooks/useDebouncedCallback";

/**
 * Wyszukiwarka Orphanet + chip wybranej choroby.
 * `value` — orpha_id lub null; `label` — krótka nazwa do chipa; `onChange(id, name)`.
 */
export default function OrphaSearch({ value, label, onChange, diagnosisConfirmed }) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (query) => {
    const t = query.trim();
    if (t.length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const { data: rows } = await api.get(`${API_V2_AUTH_BASE}/orphanet/search`, {
        params: { q: t },
      });
      setSuggestions(rows || []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const debounced = useDebouncedCallback(runSearch, 320);
  useEffect(() => {
    debounced(q);
  }, [q, debounced]);

  function pick(row) {
    onChange(row.orpha_id, row.name_pl || row.name_en || "");
    setQ("");
    setSuggestions([]);
  }

  if (!diagnosisConfirmed) {
    return null;
  }

  return (
    <div className="space-y-4 text-sm text-[var(--zp-app-text-primary)]">
      <div>
        <label className="block text-[var(--zp-app-text-muted)] mb-1">Szukaj choroby</label>
        <input
          type="text"
          className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-3 py-2"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="nazwa lub kod ORPHA"
        />
        {loading && <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">Szukam…</p>}
        {suggestions.length > 0 && (
          <ul className="mt-2 border border-[var(--zp-app-border)] rounded-xl divide-y max-h-48 overflow-y-auto bg-[var(--zp-app-card)]">
            {suggestions.map((row) => (
              <li key={row.orpha_id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--zp-app-accent-bg)]"
                  onClick={() => pick(row)}
                >
                  {row.name_pl || row.name_en}
                  <span className="text-xs text-[var(--zp-app-text-muted)] ml-2">ORPHA:{row.orpha_id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {value != null && (
        <p className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/40 px-3 py-2 text-sm">
          Wybrano: <strong>{label || `ORPHA:${value}`}</strong> (ORPHA:{value})
          <button
            type="button"
            className="ml-2 text-blue-600 dark:text-teal-400 text-xs underline"
            onClick={() => onChange(null, "")}
          >
            Usuń
          </button>
        </p>
      )}
    </div>
  );
}
