import { Link } from "react-router-dom";

const CARDS = [
  {
    emoji: "👩‍👧",
    title: "Rodzice",
    subtitle: "Szukasz innych rodziców dzieci z podobnymi objawami",
    points: [
      "Podziel się doświadczeniami z drogi do diagnozy",
      "Dowiedz się, jakich specjalistów warto odwiedzić",
      "Znajdź wsparcie emocjonalne od osób, które rozumieją",
    ],
    color: "border-zebra-200 hover:border-zebra-400",
  },
  {
    emoji: "🧑‍🤝‍🧑",
    title: "Opiekunowie",
    subtitle: "Opiekujesz się dorosłą osobą z niezdiagnozowaną chorobą",
    points: [
      "Skontaktuj się z innymi opiekunami w podobnej sytuacji",
      "Wymień się wiedzą o dostępnych formach pomocy",
      "Uniknij wypalenia — rozmawiaj z tymi, co rozumieją",
    ],
    color: "border-amber-200 hover:border-amber-400",
  },
  {
    emoji: "🧬",
    title: "Dorośli pacjenci",
    subtitle: "Sam zmagasz się z niezdiagnozowaną lub rzadką chorobą",
    points: [
      "Znajdź osoby z identycznymi lub podobnymi objawami",
      "Dziel się tym, co pomogło — i co nie pomogło",
      "Buduj sieć wsparcia na własnych warunkach",
    ],
    color: "border-violet-200 hover:border-violet-400",
  },
];

export default function ForWhom() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="text-zebra-600 font-semibold text-sm uppercase tracking-widest mb-3">
            Dla kogo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
            ZebraPoint jest dla Ciebie, jeśli...
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {CARDS.map((card, i) => (
            <div
              key={i}
              className={`bg-white rounded-2xl border-2 p-8 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${card.color}`}
            >
              <div className="text-5xl mb-4">{card.emoji}</div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {card.title}
              </h3>
              <p className="text-slate-500 text-sm mb-6">{card.subtitle}</p>
              <ul className="space-y-2">
                {card.points.map((point, j) => (
                  <li
                    key={j}
                    className="flex gap-2 text-sm text-slate-600"
                  >
                    <span className="text-zebra-500 mt-0.5 flex-shrink-0">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-zebra-600 hover:bg-zebra-700 text-white font-semibold px-8 py-3.5 rounded-xl transition shadow-lg shadow-zebra-200"
          >
            Dołącz bezpłatnie →
          </Link>
        </div>
      </div>
    </section>
  );
}

