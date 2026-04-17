import { useState } from "react";
import toast from "react-hot-toast";

import { postsApi } from "../../api/v2/posts";
import Button from "../ui/Button";

export default function LensProposalModal({ onClose }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("symptomatic");
  const [justification, setJustification] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const n = name.trim();
    const j = justification.trim();
    if (!n || !j) {
      toast.error("Uzupełnij nazwę i uzasadnienie");
      return;
    }
    setSaving(true);
    try {
      await postsApi.createProposal({ name: n, type, justification: j });
      toast.success("Propozycja wysłana do moderacji");
      onClose();
    } catch (e) {
      toast.error(e.message || "Nie udało się wysłać propozycji");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="proposal-modal-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[var(--zp-app-card)] border border-[var(--zp-app-border)] shadow-xl">
        <div className="p-4 border-b border-[var(--zp-app-border)] flex items-center justify-between">
          <h2 id="proposal-modal-title" className="font-semibold text-slate-900 dark:text-slate-100">
            Zaproponuj soczewkę
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--zp-app-text-muted)] hover:text-slate-900 dark:hover:text-white text-sm"
          >
            Zamknij
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">Nazwa tematu</label>
            <input
              className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-bg)] px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">Typ</label>
            <select
              className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-bg)] px-3 py-2 text-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="symptomatic">Objawowa</option>
              <option value="topical">Tematyczna</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-[var(--zp-app-text-muted)] mb-1">Uzasadnienie</label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-bg)] px-3 py-2 text-sm"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Dlaczego ta soczewka jest potrzebna społeczności?"
            />
          </div>
        </div>
        <div className="p-4 border-t border-[var(--zp-app-border)] flex justify-end gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Anuluj
          </Button>
          <Button size="sm" type="button" loading={saving} onClick={handleSubmit}>
            Wyślij
          </Button>
        </div>
      </div>
    </div>
  );
}
