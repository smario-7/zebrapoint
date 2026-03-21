import { useTranslation } from "react-i18next";

export default function FaqSection() {
  const { t } = useTranslation("landing");

  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <p className="text-zebra-600 dark:text-teal-400 font-semibold text-sm uppercase tracking-widest mb-3">
            {t("faq.sectionLabel")}
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100">
            {t("faq.title")}
          </h2>
        </div>
        <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
          <p>{t("faq.intro1")}</p>
          <p>{t("faq.intro2")}</p>
        </div>
      </div>
    </section>
  );
}
