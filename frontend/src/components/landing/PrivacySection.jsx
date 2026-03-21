import { useTranslation } from "react-i18next";
import { useInView } from "../../hooks/useInView";

const POINT_KEYS = [
  { icon: "🎭", titleKey: "anonTitle", descKey: "anonDesc" },
  { icon: "🔒", titleKey: "encryptedTitle", descKey: "encryptedDesc" },
  { icon: "🚫", titleKey: "noAdsTitle", descKey: "noAdsDesc" },
  { icon: "🗑️", titleKey: "deletionTitle", descKey: "deletionDesc" },
];

export default function PrivacySection() {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView({ once: true });

  return (
    <section ref={ref} className="py-24 bg-slate-800 dark:bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`} style={inView ? { animationDelay: "0ms" } : undefined}>
          <p className="text-zebra-400 dark:text-teal-400 font-semibold text-sm uppercase tracking-widest mb-3">
            {t("privacy.sectionLabel")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("privacy.title")}
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            {t("privacy.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {POINT_KEYS.map((point, i) => (
            <div
              key={point.titleKey}
              className={`bg-slate-700/50 dark:bg-slate-700 border border-slate-600 rounded-2xl p-6 flex gap-4 items-start hover:bg-slate-700 dark:hover:bg-slate-600/50 transition ${inView ? "animate-scale-in" : "opacity-0"}`}
              style={inView ? { animationDelay: `${100 + i * 80}ms` } : undefined}
            >
              <span className="text-3xl flex-shrink-0">{point.icon}</span>
              <div>
                <h3 className="font-bold text-white mb-1">
                  {t(`privacy.${point.titleKey}`)}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t(`privacy.${point.descKey}`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
