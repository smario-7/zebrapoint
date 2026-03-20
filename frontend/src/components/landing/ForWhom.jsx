import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useInView } from "../../hooks/useInView";

const CARDS = [
  {
    emoji: "👩‍👧",
    prefix: "parents",
    color: "border-zebra-200 hover:border-zebra-400",
  },
  {
    emoji: "🧑‍🤝‍🧑",
    prefix: "caregivers",
    color: "border-amber-200 hover:border-amber-400",
  },
  {
    emoji: "🧬",
    prefix: "patients",
    color: "border-violet-200 hover:border-violet-400",
  },
];

export default function ForWhom() {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView({ once: true });

  return (
    <section ref={ref} className="py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`} style={inView ? { animationDelay: "0ms" } : undefined}>
          <p className="text-zebra-600 dark:text-teal-400 font-semibold text-sm uppercase tracking-widest mb-3">
            {t("forWhom.sectionLabel")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">
            {t("forWhom.title")}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {CARDS.map((card, i) => {
            const p = card.prefix;
            const points = [1, 2, 3].map((n) => t(`forWhom.${p}${n}`));
            return (
              <div
                key={card.prefix}
                className={`bg-white dark:bg-slate-800 rounded-2xl border-2 p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${card.color} dark:border-slate-700 ${inView ? "animate-scale-in" : "opacity-0"}`}
                style={inView ? { animationDelay: `${100 + i * 100}ms` } : undefined}
              >
                <div className="text-5xl mb-4">{card.emoji}</div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {t(`forWhom.${p}Title`)}
                </h3>
                <p className="text-slate-500 dark:text-slate-300 text-sm mb-6">
                  {t(`forWhom.${p}Subtitle`)}
                </p>
                <ul className="space-y-2">
                  {points.map((point, j) => (
                    <li
                      key={j}
                      className="flex gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span className="text-zebra-500 dark:text-teal-400 mt-0.5 flex-shrink-0 font-bold">
                        ✓
                      </span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className={`text-center mt-12 ${inView ? "animate-fade-in-up" : "opacity-0"}`} style={inView ? { animationDelay: "0.7s" } : undefined}>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 font-semibold px-8 py-3.5 rounded-xl transition shadow-lg shadow-zebra-200 dark:shadow-none"
          >
            {t("forWhom.cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
