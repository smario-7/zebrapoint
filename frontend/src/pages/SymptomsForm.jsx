import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import api from "../services/api";

const schema = z.object({
  description: z
    .string()
    .min(100, "Opis musi mieć co najmniej 100 znaków")
    .max(1000, "Opis może mieć maksymalnie 1000 znaków")
});

const HINTS = [
  "Od kiedy trwają objawy?",
  "Jakie części ciała są dotknięte?",
  "Jak objawy wpływają na codzienne życie?",
  "Co już zbadano / wykluczono?",
  "Czy objawy nasilają się w określonych sytuacjach?"
];

export default function SymptomsForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [matchResult, setMatchResult] = useState(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({ resolver: zodResolver(schema) });

  const description = watch("description", "");
  const charCount = description.length;
  const isValid = charCount >= 100 && charCount <= 1000;

  const onSubmit = async (formData) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const { data } = await api.post("/symptoms/", formData);
      setMatchResult(data.match);
      setTimeout(() => {
        navigate(`/groups/${data.match.group_id}`);
      }, 2200);
    } catch (err) {
      const msg = err.response?.data?.detail || "Wystąpił błąd. Spróbuj ponownie.";
      setApiError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (matchResult) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">
            {matchResult.is_new ? "🌱" : "🦓"}
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            {matchResult.is_new
              ? "Tworzymy dla Ciebie nową grupę!"
              : "Znaleziono Twoją grupę!"}
          </h2>
          {!matchResult.is_new && (
            <p className="text-zebra-600 font-medium mb-2">
              {matchResult.group_name}
            </p>
          )}
          {matchResult.score > 0 && (
            <p className="text-slate-400 text-sm mb-4">
              Podobieństwo: {Math.round(matchResult.score * 100)}%
            </p>
          )}
          <p className="text-slate-500 text-sm">
            Przekierowuję do czatu grupowego...
          </p>
          <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-zebra-500 animate-pulse rounded-full w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <a href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600 mb-4 inline-block">
            ← Powrót
          </a>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Opisz objawy
          </h1>
          <p className="text-slate-500">
            Napisz własnymi słowami — nie musisz używać nazw medycznych.
            Im więcej szczegółów, tym lepsze dopasowanie.
          </p>
        </div>

        <div className="bg-zebra-50 border border-zebra-100 rounded-xl p-4 mb-6">
          <p className="text-xs font-semibold text-zebra-700 uppercase tracking-wide mb-2">
            Co warto opisać:
          </p>
          <ul className="space-y-1">
            {HINTS.map((hint, i) => (
              <li key={i} className="text-sm text-zebra-800 flex gap-2">
                <span className="text-zebra-400">•</span>
                {hint}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6">
          {apiError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {apiError}
            </div>
          )}

          <textarea
            {...register("description")}
            placeholder="Np. Moje dziecko od 3 lat ma nawracające bóle stawów i stałe zmęczenie. Lekarze wykluczyli RZS i toczeń, ale objawy nasilają się zimą. Kilka razy pojawiła się też wysypka na twarzy..."
            className={`w-full h-52 p-4 border rounded-xl resize-none focus:outline-none focus:ring-2 transition ${
              errors.description
                ? "border-red-300 focus:ring-red-400"
                : "border-slate-200 focus:ring-zebra-500"
            }`}
          />

          <div className="flex justify-between items-center mt-2 mb-4">
            <span className="text-sm text-red-500 min-h-[20px]">
              {errors.description?.message}
            </span>
            <span className={`text-sm font-mono ${
              charCount > 1000
                ? "text-red-500"
                : charCount >= 100
                ? "text-zebra-600"
                : "text-slate-400"
            }`}>
              {charCount} / 1000
            </span>
          </div>

          <div className="h-1.5 bg-slate-100 rounded-full mb-5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                charCount > 1000
                  ? "bg-red-400"
                  : charCount >= 100
                  ? "bg-zebra-500"
                  : "bg-slate-300"
              }`}
              style={{ width: `${Math.min((charCount / 1000) * 100, 100)}%` }}
            />
          </div>

          <button
            onClick={handleSubmit(onSubmit)}
            disabled={isLoading || !isValid}
            className="w-full bg-zebra-600 hover:bg-zebra-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-3 rounded-xl transition"
          >
            {isLoading
              ? "Szukam dopasowania... (to może potrwać chwilę)"
              : "Znajdź moją grupę →"}
          </button>

          {isLoading && (
            <p className="text-center text-xs text-slate-400 mt-3">
              Analizuję opis i przeszukuję bazę podobnych przypadków...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
