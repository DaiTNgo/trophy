import { createCookie } from "react-router";
import { createI18nextMiddleware } from "remix-i18next";
import i18n from "./i18n";

import enCommon from "./locales/en/common.json";
import viCommon from "./locales/vi/common.json";
import enAbout from "./locales/en/about.json";
import viAbout from "./locales/vi/about.json";
import enHome from "./locales/en/home.json";
import viHome from "./locales/vi/home.json";
import enContact from "./locales/en/contact.json";
import viContact from "./locales/vi/contact.json";
import enLayout from "./locales/en/layout.json";
import viLayout from "./locales/vi/layout.json";
import enOrderLookup from "./locales/en/order-lookup.json";
import viOrderLookup from "./locales/vi/order-lookup.json";

const resources = {
  en: { common: enCommon, about: enAbout, home: enHome, contact: enContact, layout: enLayout, orderLookup: enOrderLookup },
  vi: { common: viCommon, about: viAbout, home: viHome, contact: viContact, layout: viLayout, orderLookup: viOrderLookup },
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
