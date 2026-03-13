export default function FaqSection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-zebra-600 font-semibold text-sm uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
            Najczęstsze pytania
          </h2>
        </div>
        <div className="space-y-4 text-slate-600 text-sm leading-relaxed">
          <p>
            Masz pytania o zasady działania ZebraPoint, prywatność danych
            albo warunki korzystania z platformy? Wszystkie szczegóły
            znajdziesz w regulaminie, polityce prywatności oraz sekcji
            „O nas”, do których linki umieściliśmy w stopce strony.
          </p>
          <p>
            Jeśli coś jest dla Ciebie niejasne lub chcesz zgłosić uwagę,
            skorzystaj z formularza kontaktowego, który udostępnimy razem
            z pełną wersją serwisu. Na tym etapie skupiamy się na tym,
            żeby jak najszybciej pomóc Ci znaleźć grupę wsparcia.
          </p>
        </div>
      </div>
    </section>
  );
}
