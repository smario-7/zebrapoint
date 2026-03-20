import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInView } from "../../hooks/useInView";

export default function CtaFooter() {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView({ once: true });
  const year = new Date().getFullYear();

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
            {t("ctaFooter.title")}
          </h2>
          <p
            className={`text-slate-500 dark:text-slate-300 text-lg mb-10 ${inView ? "animate-fade-in-up" : "opacity-0"}`}
            style={inView ? { animationDelay: "200ms" } : undefined}
          >
            {t("ctaFooter.subtitle")}
          </p>
          <Link
            to="/register"
            className={`inline-flex items-center gap-2 bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 font-semibold text-lg px-10 py-4 rounded-xl transition shadow-xl shadow-zebra-200 dark:shadow-none ${inView ? "animate-scale-in" : "opacity-0"}`}
            style={inView ? { animationDelay: "300ms" } : undefined}
          >
            {t("ctaFooter.button")}
          </Link>
        </div>
      </section>

      <footer className="bg-slate-900 text-slate-400 py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <img src="/logo_circle_text_wh.svg" alt="ZebraPoint" className="h-6 w-auto self-start sm:self-center" />
              <p className="text-sm text-slate-400">
                {t("ctaFooter.copyright", { year })}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm" aria-label="Stopka">
              <a href="#" className="hover:text-slate-200 transition">
                {t("ctaFooter.terms")}
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                {t("ctaFooter.about")}
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                {t("ctaFooter.contact")}
              </a>
              <a href="#" className="hover:text-slate-200 transition">
                {t("ctaFooter.privacyPolicy")}
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </>
  );
}
