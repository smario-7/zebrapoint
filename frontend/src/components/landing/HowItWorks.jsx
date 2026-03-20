import { useTranslation } from "react-i18next";
import { useInView } from "../../hooks/useInView";

const STEP_META = [
  { number: "01", icon: "📝", color: "bg-zebra-50 text-zebra-600" },
  { number: "02", icon: "🔍", color: "bg-amber-50 text-amber-600" },
  { number: "03", icon: "💬", color: "bg-violet-50 text-violet-600" },
];

const stepDarkColors = [
  "dark:bg-slate-700 dark:text-slate-100",
  "dark:bg-slate-700 dark:text-slate-100",
  "dark:bg-slate-700 dark:text-slate-100",
];

export default function HowItWorks() {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView({ once: true });

  const steps = [1, 2, 3].map((n, i) => ({
    ...STEP_META[i],
    title: t(`howItWorks.step${n}Title`),
    desc: t(`howItWorks.step${n}Desc`),
  }));

  return (
    <section id="jak-to-dziala" ref={ref} className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`} style={inView ? { animationDelay: "0ms" } : undefined}>
          <p className="text-zebra-600 dark:text-teal-400 font-semibold text-sm uppercase tracking-widest mb-3">
            {t("howItWorks.sectionLabel")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">
            {t("howItWorks.title")}
          </h2>
          <p className="text-slate-500 dark:text-slate-300 mt-4 max-w-xl mx-auto">
            {t("howItWorks.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-slate-100 dark:bg-slate-700 -translate-y-1/2" />
          <div className="absolute left-6 top-12 bottom-12 w-0.5 bg-slate-100 dark:bg-slate-700 md:hidden" />

          {steps.map((step, i) => (
            <div
              key={step.number}
              className={`relative flex flex-col items-center md:items-start text-center md:text-left pl-12 md:pl-0 ${inView ? "animate-fade-in-up md:animate-slide-in-left" : "opacity-0"}`}
              style={inView ? { animationDelay: `${100 + i * 100}ms` } : undefined}
            >
              <div className="relative mb-6">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${step.color} ${stepDarkColors[i]}`}
                >
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-slate-800 dark:bg-slate-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                {step.title}
              </h3>
              <p className="text-slate-500 dark:text-slate-300 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
