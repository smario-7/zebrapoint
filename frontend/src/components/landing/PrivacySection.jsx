import { useInView } from "../../hooks/useInView";

const POINTS = [
  {
    icon: "🎭",
    title: "Pełna anonimowość",
    desc: "Używasz pseudonimu. Nikt nie widzi Twojego imienia, nazwiska ani emaila.",
  },
  {
    icon: "🔒",
    title: "Szyfrowane dane",
    desc: "Wszystkie dane przechowywane są w zaszyfrowanej bazie danych na europejskich serwerach.",
  },
  {
    icon: "🚫",
    title: "Zero reklam",
    desc: "Nie sprzedajemy danych. Nie wyświetlamy reklam. Nigdy.",
  },
  {
    icon: "🗑️",
    title: "Prawo do usunięcia",
    desc: "Możesz usunąć swoje konto i wszystkie dane w dowolnym momencie, jednym kliknięciem.",
  },
];

export default function PrivacySection() {
  const { ref, inView } = useInView({ once: true });

  return (
    <section ref={ref} className="py-24 bg-slate-800 dark:bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className={`text-center mb-16 ${inView ? "animate-fade-in-up" : "opacity-0"}`} style={inView ? { animationDelay: "0ms" } : undefined}>
          <p className="text-zebra-400 dark:text-teal-400 font-semibold text-sm uppercase tracking-widest mb-3">
            Prywatność i bezpieczeństwo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Twoje dane są Twoje
          </h2>
          <p className="text-slate-400 mt-4 max-w-xl mx-auto">
            Wiemy, że piszesz o rzeczach osobistych. Traktujemy to poważnie.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {POINTS.map((point, i) => (
            <div
              key={i}
              className={`bg-slate-700/50 dark:bg-slate-700 border border-slate-600 rounded-2xl p-6 flex gap-4 items-start hover:bg-slate-700 dark:hover:bg-slate-600/50 transition ${inView ? "animate-scale-in" : "opacity-0"}`}
              style={inView ? { animationDelay: `${100 + i * 80}ms` } : undefined}
            >
              <span className="text-3xl flex-shrink-0">{point.icon}</span>
              <div>
                <h3 className="font-bold text-white mb-1">
                  {point.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {point.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

