import { Link } from "react-router-dom";
import { useInView } from "../../hooks/useInView";

export default function CtaFooter() {
  const { ref, inView } = useInView({ once: true });

  return (
    <>
      <section ref={ref} className="py-24 bg-gradient-to-b from-zebra-50 to-white dark:from-slate-900 dark:to-slate-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img
            src="/logo_circle.svg"
            alt=""
            className={`h-20 w-auto mx-auto mb-6 ${inView ? "animate-scale-in" : "opacity-0"}`}
            style={inView ? { animationDelay: "100ms" } : undefined}
            aria-hidden
          />
          <h2
            className={`text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-50 mb-4 ${inView ? "animate-fade-in-up" : "opacity-0"}`}
            style={inView ? { animationDelay: "200ms" } : undefined}
          >
            Gotowy, żeby znaleźć swoją grupę?
          </h2>
          <p
            className={`text-slate-500 dark:text-slate-300 text-lg mb-10 ${inView ? "animate-fade-in-up" : "opacity-0"}`}
            style={inView ? { animationDelay: "200ms" } : undefined}
          >
            Dołącz do ZebraPoint bezpłatnie. Opisz objawy i znajdź osoby, które
            naprawdę rozumieją.
          </p>
          <Link
            to="/register"
            className={`inline-flex items-center gap-2 bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 font-semibold text-lg px-10 py-4 rounded-xl transition shadow-xl shadow-zebra-200 dark:shadow-none ${inView ? "animate-scale-in" : "opacity-0"}`}
            style={inView ? { animationDelay: "300ms" } : undefined}
          >
            Zacznij teraz — to bezpłatne
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <img src="/logo_circle_text_wh.svg" alt="ZebraPoint" className="h-6 w-auto self-start sm:self-center" />
              <p className="text-sm text-slate-400">
                © {new Date().getFullYear()} ZebraPoint · Wsparcie dla opiekunów osób z rzadkimi chorobami
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm" aria-label="Stopka">
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
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}

