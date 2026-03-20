import { useTranslation } from "react-i18next";
import { useInView } from "../../hooks/useInView";

const STATS = [
  { value: "100%", labelKey: "freeLabel", icon: "💚" },
  { value: "RODO", labelKey: "gdprLabel", icon: "🇪🇺" },
  { value: "24/7", labelKey: "availabilityLabel", icon: "🌙" },
  { value: "<5min", labelKey: "firstGroupLabel", icon: "⚡" },
];

export default function StatsSection() {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView({ once: true });

  return (
    <section ref={ref} className="py-20 bg-zebra-600 dark:bg-teal-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map((stat, i) => (
            <div
              key={stat.labelKey}
              className="text-center"
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div
                className={`text-4xl font-bold text-white mb-1 ${inView ? "animate-count-up" : "opacity-0"}`}
                style={inView ? { animationDelay: `${120 + i * 100}ms` } : undefined}
              >
                {stat.value}
              </div>
              <div className="text-zebra-200 dark:text-teal-200 text-sm">
                {t(`stats.${stat.labelKey}`)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
