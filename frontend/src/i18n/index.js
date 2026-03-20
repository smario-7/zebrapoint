import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import plCommon from "./locales/pl/common.json";
import plLanding from "./locales/pl/landing.json";
import plAuth from "./locales/pl/auth.json";
import plApp from "./locales/pl/app.json";
import plAdmin from "./locales/pl/admin.json";

import enCommon from "./locales/en/common.json";
import enLanding from "./locales/en/landing.json";
import enAuth from "./locales/en/auth.json";
import enApp from "./locales/en/app.json";
import enAdmin from "./locales/en/admin.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "pl",
    supportedLngs: ["pl", "en"],
    defaultNS: "common",
    resources: {
      pl: {
        common: plCommon,
        landing: plLanding,
        auth: plAuth,
        app: plApp,
        admin: plAdmin
      },
      en: {
        common: enCommon,
        landing: enLanding,
        auth: enAuth,
        app: enApp,
        admin: enAdmin
      }
    },
    detection: {
      order: ["localStorage"],
      lookupLocalStorage: "zp_lang"
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
