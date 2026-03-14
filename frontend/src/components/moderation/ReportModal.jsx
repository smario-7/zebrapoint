import { useState } from "react";
import api from "../../services/api";
import toast from "react-hot-toast";

const REASONS = [
  { value: "spam", label: "Spam", icon: "📢" },
  { value: "abuse", label: "Obraźliwe lub agresywne", icon: "🚫" },
  { value: "misinformation", label: "Dezinformacja medyczna", icon: "⚠️" },
  { value: "hate_speech", label: "Mowa nienawiści", icon: "🛑" },
  { value: "other", label: "Inne", icon: "📝" },
];

const TARGET_LABELS = {
  post: "post",
  comment: "komentarz",
  message: "wiadomość",
  user: "użytkownika",
};

export default function ReportModal({ targetType, targetId, onClose }) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason || loading) return;
    setLoading(true);
    try {
      await api.post("/reports/", {
        target_type: targetType,
        target_id: targetId,
        reason,
        description: description.trim() || null,
      });
      setSubmitted(true);
    } catch (err) {
      if (err.response?.status !== 201) {
        toast.error("Nie udało się wysłać zgłoszenia");
      } else {
        setSubmitted(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center
                 z-50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-5xl mb-3">✅</div>
            <h3 id="report-modal-title" className="font-bold text-slate-800 text-lg mb-2">
              Dziękujemy za zgłoszenie
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-5">
              Nasz zespół przejrzy {TARGET_LABELS[targetType] || targetType} i podejmie
              odpowiednie działania zgodnie z zasadami społeczności.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-zebra-600 text-white font-semibold px-6 py-2.5
                         rounded-xl hover:bg-zebra-700 transition"
            >
              Zamknij
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <h3 id="report-modal-title" className="font-bold text-slate-800">
                Zgłoś {TARGET_LABELS[targetType] || targetType}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Zamknij"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-3 font-medium">
              Powód zgłoszenia:
            </p>
            <div className="space-y-2 mb-4">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer
                    transition-all
                    ${reason === r.value
                      ? "border-red-300 bg-red-50"
                      : "border-slate-200 hover:border-slate-300"
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-red-500"
                  />
                  <span className="text-lg">{r.icon}</span>
                  <span className="text-sm font-medium text-slate-700">
                    {r.label}
                  </span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Dodatkowe informacje{" "}
                <span className="text-slate-400 font-normal">(opcjonalnie)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opisz problem krótko..."
                rows={2}
                maxLength={500}
                className="w-full border border-slate-200 rounded-xl px-3 py-2
                           text-sm resize-none focus:outline-none
                           focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!reason || loading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-slate-200
                           disabled:text-slate-400 text-white font-semibold
                           py-2.5 rounded-xl transition text-sm"
              >
                {loading ? "Wysyłanie..." : "Wyślij zgłoszenie"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-slate-200 text-slate-600
                           font-semibold py-2.5 rounded-xl hover:bg-slate-50
                           transition text-sm"
              >
                Anuluj
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-3">
              Fałszywe zgłoszenia mogą skutkować ostrzeżeniem konta
            </p>
          </>
        )}
      </div>
    </div>
  );
}
