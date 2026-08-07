import { Form, useLocation } from "react-router";
import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { pathname, search } = useLocation();

  const toggleLanguage = i18n.language === "en" ? "vi" : "en";
  const label = i18n.language === "en" ? "VI" : "EN";

  return (
    <Form method="get" action="/api/locale">
      <input type="hidden" name="lng" value={toggleLanguage} />
      <input type="hidden" name="returnTo" value={pathname + search} />
      <button
        type="submit"
        className="relative flex h-10 min-w-10 items-center justify-center rounded-md border border-border-subtle bg-white px-2 text-[12px] font-bold tracking-wide text-brand-strong transition-colors hover:border-brand-strong hover:bg-surface-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-support active:translate-y-px"
        title={t("language_switcher_title")}
      >
        {label}
      </button>
    </Form>
  );
}
