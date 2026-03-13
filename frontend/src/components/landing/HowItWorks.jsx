const STEPS = [
  {
    number: "01",
    icon: "📝",
    title: "Opisz objawy",
    desc: "Napisz własnymi słowami — bez medycznego żargonu. Opisz co widzisz, kiedy się zaczęło i co już sprawdzono.",
    color: "bg-zebra-50 text-zebra-600",
  },
  {
    number: "02",
    icon: "🔍",
    title: "System Cię dopasuje",
    desc: "Nasz algorytm przeszukuje bazę opisów i łączy Cię z osobami, których doświadczenia są najbliższe Twoim.",
    color: "bg-amber-50 text-amber-600",
  },
  {
    number: "03",
    icon: "💬",
    title: "Rozmawiaj z grupą",
    desc: "Dołącz do prywatnej grupy wsparcia. Wymieniaj doświadczenia, zadawaj pytania i wspieraj innych.",
    color: "bg-violet-50 text-violet-600",
  },
];

export default function HowItWorks() {
  return (
    <section id="jak-to-dziala" className="py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-zebra-600 font-semibold text-sm uppercase tracking-widest mb-3">
            Jak to działa
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
            Trzy kroki do grupy wsparcia
          </h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto">
            Od opisu do pierwszej rozmowy — cały proces zajmuje mniej niż 5
            minut.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-1/3 right-1/3 h-0.5 bg-slate-100 -translate-y-1/2" />

          {STEPS.map((step, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center md:items-start text-center md:text-left"
            >
              <div className="relative mb-6">
                <div
                  className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${step.color}`}
                >
                  {step.icon}
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 bg-slate-800 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-3">
                {step.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

