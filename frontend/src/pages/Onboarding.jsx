import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import api, { API_V2_AUTH_BASE } from "../services/api";
import useAuthStore from "../store/authStore";
import Button from "../components/ui/Button";
import HpoSearch from "../components/profile/HpoSearch";
import OrphaSearch from "../components/profile/OrphaSearch";

const STEPS = ["Zgody", "Objawy + HPO", "Diagnoza + Orphanet", "Wyszukiwanie", "Lokalizacja"];

const initialForm = () => ({
  consent_data_processing: false,
  consent_searchable_info: false,
  symptom_description: "",
  hpo_terms: [],
  diagnosis_confirmed: false,
  orpha_id: null,
  orpha_label: "",
  searchable: false,
  location_city: "",
  location_country: "PL",
});

function StepConsents({ data, onChange }) {
  return (
    <div className="space-y-4 text-sm text-[var(--zp-app-text-primary)]">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 rounded border-[var(--zp-app-border)]"
          checked={data.consent_data_processing}
          onChange={(e) => onChange({ ...data, consent_data_processing: e.target.checked })}
        />
        <span>
          Wyrażam zgodę na przetwarzanie moich danych zdrowotnych w celu działania serwisu ZebraPoint
          (wymagane).
        </span>
      </label>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 rounded border-[var(--zp-app-border)]"
          checked={data.consent_searchable_info}
          onChange={(e) => onChange({ ...data, consent_searchable_info: e.target.checked })}
        />
        <span>
          Wyrażam zgodę na wykorzystanie informacji o moim profilu w funkcjach wyszukiwania i
          dopasowania (opcjonalne, zalecane przy szukaniu wsparcia).
        </span>
      </label>
    </div>
  );
}

function StepSymptoms({ data, onChange }) {
  return (
    <div className="space-y-4 text-sm">
      <div>
        <label className="block text-[var(--zp-app-text-muted)] mb-1">Opisz swoje objawy</label>
        <textarea
          className="w-full min-h-[120px] rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-3 py-2 text-[var(--zp-app-text-primary)]"
          value={data.symptom_description}
          onChange={(e) => onChange({ ...data, symptom_description: e.target.value })}
          placeholder="Np. od kiedy, nasilenie, co już wiadomo od lekarzy…"
          maxLength={20000}
        />
      </div>
      <HpoSearch
        terms={data.hpo_terms}
        onTermsChange={(hpo_terms) => onChange({ ...data, hpo_terms })}
        maxItems={50}
      />
    </div>
  );
}

function StepDiagnosis({ data, onChange }) {
  return (
    <div className="space-y-4 text-sm text-[var(--zp-app-text-primary)]">
      <p className="text-[var(--zp-app-text-muted)]">
        Jeśli masz potwierdzoną diagnozę rzadkiej choroby, możesz ją powiązać z katalogiem Orphanet.
        Możesz też pominąć ten krok.
      </p>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dx"
            checked={!data.diagnosis_confirmed}
            onChange={() =>
              onChange({
                ...data,
                diagnosis_confirmed: false,
                orpha_id: null,
                orpha_label: "",
              })
            }
          />
          Nie mam potwierdzonej diagnozy w katalogu
        </label>
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="dx"
            checked={data.diagnosis_confirmed}
            onChange={() => onChange({ ...data, diagnosis_confirmed: true })}
          />
          Mam potwierdzoną diagnozę — wyszukam chorobę
        </label>
      </div>
      <OrphaSearch
        value={data.orpha_id}
        label={data.orpha_label}
        diagnosisConfirmed={data.diagnosis_confirmed}
        onChange={(id, name) =>
          onChange({
            ...data,
            orpha_id: id,
            orpha_label: name ?? "",
            diagnosis_confirmed: id != null ? true : data.diagnosis_confirmed,
          })
        }
      />
    </div>
  );
}

function StepSearchable({ data, onChange }) {
  return (
    <div className="space-y-4 text-sm text-[var(--zp-app-text-primary)]">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 rounded border-[var(--zp-app-border)]"
          checked={data.searchable}
          onChange={(e) => {
            const v = e.target.checked;
            onChange({
              ...data,
              searchable: v,
              consent_searchable_info: v ? true : false,
            });
          }}
        />
        <span>
          Chcę, żeby inni użytkownicy mogli mnie znaleźć w wyszukiwarce i dopasowaniach (profil
          „widoczny”).
        </span>
      </label>
      <p className="text-xs text-[var(--zp-app-text-muted)]">
        Zawsze możesz to zmienić później w ustawieniach profilu.
      </p>
    </div>
  );
}

function StepLocation({ data, onChange }) {
  return (
    <div className="space-y-4 text-sm">
      <p className="text-[var(--zp-app-text-muted)]">
        Lokalizacja jest opcjonalna i pomaga przy treściach regionalnych. Możesz zostawić puste.
      </p>
      <div>
        <label className="block text-[var(--zp-app-text-muted)] mb-1">Miasto</label>
        <input
          type="text"
          className="w-full rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-3 py-2 text-[var(--zp-app-text-primary)]"
          value={data.location_city}
          onChange={(e) => onChange({ ...data, location_city: e.target.value })}
        />
      </div>
      <div>
        <label className="block text-[var(--zp-app-text-muted)] mb-1">Kraj (kod)</label>
        <input
          type="text"
          className="w-full max-w-[120px] rounded-xl border border-[var(--zp-app-border)] bg-[var(--zp-app-card)] px-3 py-2 uppercase"
          value={data.location_country}
          maxLength={8}
          onChange={(e) => onChange({ ...data, location_country: e.target.value.toUpperCase() || "PL" })}
        />
      </div>
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  function canGoNext() {
    if (step === 0) return formData.consent_data_processing;
    if (step === 2 && formData.diagnosis_confirmed) return formData.orpha_id != null;
    return true;
  }

  async function handleFinish() {
    setSaving(true);
    const payload = {
      symptom_description: formData.symptom_description.trim(),
      hpo_ids: formData.hpo_terms.map((t) => t.hpo_id),
      diagnosis_confirmed: formData.diagnosis_confirmed,
      orpha_id: formData.diagnosis_confirmed ? formData.orpha_id : null,
      consent_data_processing: formData.consent_data_processing,
      consent_searchable_info: formData.consent_searchable_info,
      searchable: formData.searchable,
      location_city: formData.location_city.trim() || null,
      location_country: formData.location_country.trim() || "PL",
    };
    try {
      await api.post(`${API_V2_AUTH_BASE}/onboarding`, payload);
      await fetchMe();
      toast.success("Profil skonfigurowany — witaj w ZebraPoint!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const d = err.response?.data?.detail;
      const msg = Array.isArray(d)
        ? d.map((x) => x.msg || JSON.stringify(x)).join("; ")
        : typeof d === "string"
          ? d
          : d?.message || "Nie udało się zapisać profilu";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-12 bg-[var(--zp-app-bg)] text-[var(--zp-app-text-primary)]">
      <div className="w-full max-w-lg">
        <div className="flex mb-6 gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              title={s}
              className={`flex-1 h-2 rounded ${i <= step ? "bg-[var(--zp-accent-primary)]" : "bg-[var(--zp-app-border)]"}`}
            />
          ))}
        </div>
        <h1 className="text-xl font-semibold mb-1">{STEPS[step]}</h1>
        <p className="text-xs text-[var(--zp-app-text-muted)] mb-6">
          Krok {step + 1} z {STEPS.length}
        </p>

        {step === 0 && <StepConsents data={formData} onChange={setFormData} />}
        {step === 1 && <StepSymptoms data={formData} onChange={setFormData} />}
        {step === 2 && <StepDiagnosis data={formData} onChange={setFormData} />}
        {step === 3 && <StepSearchable data={formData} onChange={setFormData} />}
        {step === 4 && <StepLocation data={formData} onChange={setFormData} />}

        <div className="flex justify-between mt-10 gap-3">
          {step > 0 ? (
            <Button variant="secondary" size="sm" type="button" onClick={() => setStep((x) => x - 1)}>
              Wstecz
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              size="sm"
              type="button"
              disabled={!canGoNext()}
              onClick={() => setStep((x) => x + 1)}
            >
              Dalej
            </Button>
          ) : (
            <Button size="sm" type="button" loading={saving} onClick={handleFinish}>
              Zakończ
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
