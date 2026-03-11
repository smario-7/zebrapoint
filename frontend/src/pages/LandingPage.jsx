import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <div className="text-7xl mb-6">🦓</div>
        <h1 className="text-5xl font-bold text-slate-800 mb-4">
          Zebra<span className="text-zebra-600">Point</span>
        </h1>
        <p className="text-xl text-slate-500 mb-10">
          Nie jesteś sam. Znajdź grupę wsparcia dla opiekunów osób z rzadkimi chorobami.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            to="/register"
            className="bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-8 py-3 rounded-xl transition"
          >
            Dołącz bezpłatnie
          </Link>
          <Link
            to="/login"
            className="border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-8 py-3 rounded-xl transition"
          >
            Zaloguj się
          </Link>
        </div>
      </div>
    </div>
  );
}
