import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function HeroSection() {
  const { t } = useTranslation("landing");
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-zebra-50 to-white dark:from-slate-900 dark:to-slate-900 pt-12 pb-16 md:pt-20 md:pb-28">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-zebra-100 dark:bg-zebra-900/30 rounded-full opacity-40 blur-3xl" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-amber-100 dark:bg-amber-900/20 rounded-full opacity-40 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          <div className="flex-1 text-center lg:text-left order-1">
            <div className="inline-flex items-center gap-2 bg-zebra-100 dark:bg-zebra-900/60 text-zebra-700 dark:text-teal-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 animate-fade-in-up [animation-delay:100ms]">
              <img src="/logo_circle.svg" alt="" className="h-5 w-auto" />
              <span>{t("hero.badge")}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-800 dark:text-slate-50 leading-tight tracking-tight mb-6 animate-fade-in-up [animation-delay:100ms]">
              {t("hero.title")}{" "}
              <span className="text-zebra-600 dark:text-teal-400 relative">
                {t("hero.titleHighlight")}
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 200 8"
                  fill="none"
                >
                  <path
                    d="M0 6 Q50 0 100 4 Q150 8 200 2"
                    stroke="#0d9488"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-300 leading-relaxed mb-6 max-w-xl mx-auto lg:mx-0 animate-fade-in-up [animation-delay:0.4s]">
              {t("hero.subtitle")}
            </p>

            <p className="max-w-xl mx-auto lg:mx-0 text-sm italic text-slate-500 dark:text-slate-400 border-l-4 border-zebra-200 dark:border-zebra-700 pl-4 mb-8 animate-fade-in-up [animation-delay:200ms]">
              “When you hear hoofbeats, think horses, not zebras.”
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start animate-fade-in-up [animation-delay:300ms]">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 bg-zebra-600 dark:bg-teal-400 hover:bg-zebra-700 dark:hover:bg-teal-300 text-white dark:text-slate-900 font-semibold text-base px-7 py-3.5 rounded-xl transition shadow-lg shadow-zebra-200 dark:shadow-none"
              >
                {t("hero.ctaPrimary")}
                <span>→</span>
              </Link>
              <a
                href="#jak-to-dziala"
                className="inline-flex items-center justify-center gap-2 bg-white dark:bg-transparent border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-100 font-semibold text-base px-7 py-3.5 rounded-xl transition"
              >
                {t("hero.ctaSecondary")}
              </a>
            </div>

            <p className="mt-8 text-sm text-slate-400 dark:text-slate-500 animate-fade-in-up [animation-delay:300ms]">
              {t("hero.footerNote")}
            </p>
          </div>

          <div className="flex-1 w-full lg:w-[440px] order-2 animate-fade-in-up lg:animate-slide-in-right [animation-delay:400ms]">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMockup() {
  const { t } = useTranslation("landing");
  const messages = [
    { own: false, name: "Mama Zosi", text: "Czy ktoś słyszał o podobnych objawach?", time: "14:21" },
    { own: false, name: "Tata Kuby", text: "Tak! U nas tak samo. Potrwało 2 lata diagnoza.", time: "14:22" },
    { own: true, name: "Ty", text: "Jak sobie radzicie z kolejkami do specjalistów?", time: "14:23" },
    { own: false, name: "Opiekun123", text: "Mamy tutaj listę sprawdzonych lekarzy 💚", time: "14:24" },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">
      <div className="bg-slate-800 dark:bg-slate-900 px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-amber-400" />
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
        </div>
        <img src="/logo_circle_text.svg" alt="ZebraPoint" className="h-5 w-auto ml-2 opacity-80" />
        <span className="text-slate-400 text-xs ml-2">{t("heroMockup.yourGroup")}</span>
      </div>

      <div className="p-4 space-y-3 bg-slate-50 dark:bg-slate-800/50 min-h-[240px]">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.own ? "flex-row-reverse" : ""}`}>
            {!m.own && (
              <div className="w-7 h-7 rounded-full bg-zebra-100 dark:bg-zebra-800 text-zebra-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {m.name[0]}
              </div>
            )}
            <div className={`max-w-[75%] ${m.own ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
              {!m.own && (
                <span className="text-xs text-zebra-600 dark:text-teal-400 font-semibold">
                  {m.name}
                </span>
              )}
              <div
                className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  m.own
                    ? "bg-zebra-600 dark:bg-teal-900 text-white dark:text-slate-100 rounded-tr-sm"
                    : "bg-white dark:bg-slate-700 border dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-tl-sm shadow-sm"
                }`}
              >
                {m.text}
              </div>
              <span className="text-[10px] text-slate-400">{m.time}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-2">
        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2 text-xs text-slate-400 dark:text-slate-500">
          {t("heroMockup.writeMessage")}
        </div>
        <div className="w-8 h-8 bg-zebra-600 dark:bg-teal-400 rounded-lg flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white dark:text-slate-900"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

