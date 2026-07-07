import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next";
import i18n from "./i18n";

import enCommon from "./locales/en/common.json";
import viCommon from "./locales/vi/common.json";

const resources = {
  en: { common: enCommon },
  vi: { common: viCommon },
};

export const localeCookie = createCookie("lng", {
  path: "/",
  sameSite: "lax",
  secure: import.meta.env.PROD,
  httpOnly: true,
});

export const [i18nextMiddleware, getLocale, getInstance] =
  createI18nextMiddleware({
    i18next: {
      ...i18n,
      resources,
    },
    detection: {
      supportedLanguages: i18n.supportedLngs,
      fallbackLanguage: i18n.fallbackLng,
      cookie: localeCookie,
    },
  });
