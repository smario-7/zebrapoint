import { Link } from "react-router-dom";

export default function CtaFooter() {
  return (
    <>
      <section className="py-24 bg-gradient-to-b from-zebra-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img src="/logo_circle.svg" alt="" className="h-20 w-auto mx-auto mb-6" />
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            Gotowy, żeby znaleźć swoją grupę?
          </h2>
          <p className="text-slate-500 text-lg mb-10">
            Dołącz do ZebraPoint bezpłatnie. Opisz objawy i znajdź osoby, które
            naprawdę rozumieją.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-zebra-600 hover:bg-zebra-700 text-white font-semibold text-lg px-10 py-4 rounded-xl transition shadow-xl shadow-zebra-200"
          >
            Zacznij teraz — to bezpłatne
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <img src="/logo_circle_text_wh.svg" alt="ZebraPoint" className="h-6 w-auto" />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span>© {new Date().getFullYear()} ZebraPoint</span>
                <span className="hidden sm:inline-block">•</span>
                <span>Wsparcie dla opiekunów osób z rzadkimi chorobami</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm">
              <a href="#" className="hover:text-slate-200 transition">
                Regulamin
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                O nas
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                Kontakt
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                Polityka prywatności (RODO)
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

