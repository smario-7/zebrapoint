import { Link } from "react-router-dom";

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <Link
          to="/"
          className="font-bold text-xl text-slate-800 hover:text-zebra-600 transition"
        >
          🦓 Zebra<span className="text-zebra-600">Point</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-slate-600 hover:text-slate-800 font-medium transition"
          >
            Zaloguj się
          </Link>
          <Link
            to="/register"
            className="text-sm bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-4 py-2 rounded-xl transition"
          >
            Dołącz
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="text-center py-6 text-xs text-slate-400">
        © 2026 ZebraPoint · Platforma wsparcia dla opiekunów
      </footer>
    </div>
  );
}
