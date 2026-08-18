import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import i18next from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
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
import enProducts from "./locales/en/products.json";
import viProducts from "./locales/vi/products.json";

const resources = {
  en: { common: enCommon, about: enAbout, home: enHome, contact: enContact, layout: enLayout, orderLookup: enOrderLookup, products: enProducts },
  vi: { common: viCommon, about: viAbout, home: viHome, contact: viContact, layout: viLayout, orderLookup: viOrderLookup, products: viProducts },
};

async function hydrate() {
  await i18next
    .use(initReactI18next)
    .use(LanguageDetector)
    .init({
      ...i18n,
      resources,
      detection: {
        order: ["htmlTag"],
        caches: [],
      },
    });

  startTransition(() => {
    hydrateRoot(
      document,
      <I18nextProvider i18n={i18next}>
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      </I18nextProvider>
    );
  });
}

if (window.requestIdleCallback) {
  window.requestIdleCallback(hydrate);
} else {
  window.setTimeout(hydrate, 1);
}
