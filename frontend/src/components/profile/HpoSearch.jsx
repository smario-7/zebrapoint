import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import api from "../../services/api";
import useDebouncedCallback from "../../hooks/useDebouncedCallback";

/**
 * Wyszukiwarka HPO z debounce + lista wybranych tagów (max maxItems).
 * `terms` — wybrane obiekty { hpo_id, label_pl, label_en } z API /me lub wyników wyszukiwania.
 */
export default function HpoSearch({ terms, onTermsChange, maxItems = 50 }) {
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
      const { data: rows } = await api.get("/api/v2/hpo/search", { params: { q: t } });
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

  function addTerm(term) {
    if (terms.some((x) => x.hpo_id === term.hpo_id)) return;
    if (terms.length >= maxItems) {
      toast.error(`Możesz wybrać maksymalnie ${maxItems} terminów HPO`);
      return;
    }
    onTermsChange([
      ...terms,
      {
        hpo_id: term.hpo_id,
        label_pl: term.label_pl ?? null,
        label_en: term.label_en ?? "",
      },
    ]);
    setQ("");
    setSuggestions([]);
  }

  function removeTerm(id) {
    onTermsChange(terms.filter((x) => x.hpo_id !== id));
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="block text-[var(--zp-app-text-muted)] mb-1">
          Wyszukaj terminy HPO (min. 2 znaki)
        </label>
        <input
          type="text"
          className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-3 py-2 text-[var(--zp-app-text-primary)]"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="np. hipotonia"
        />
        {loading && <p className="text-xs text-[var(--zp-app-text-muted)] mt-1">Szukam…</p>}
        {suggestions.length > 0 && (
          <ul className="mt-2 border border-[var(--zp-app-border)] rounded-xl divide-y divide-[var(--zp-app-border)] max-h-48 overflow-y-auto bg-[var(--zp-app-card)]">
            {suggestions.map((row) => (
              <li key={row.hpo_id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--zp-app-accent-bg)]"
                  onClick={() => addTerm(row)}
                >
                  <span className="font-mono text-xs text-[var(--zp-app-text-muted)]">{row.hpo_id}</span>{" "}
                  {row.label_pl || row.label_en}
                  {row.label_pl && row.label_en && row.label_pl !== row.label_en && (
                    <span className="text-[var(--zp-app-text-muted)]"> — {row.label_en}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {terms.length > 0 && (
        <div>
          <p className="text-xs text-[var(--zp-app-text-muted)] mb-2">Wybrane terminy:</p>
          <div className="flex flex-wrap gap-2">
            {terms.map((t) => (
              <button
                key={t.hpo_id}
                type="button"
                onClick={() => removeTerm(t.hpo_id)}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs text-slate-800 dark:text-slate-100"
              >
                {t.label_pl || t.label_en}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
