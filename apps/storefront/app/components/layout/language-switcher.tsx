import { Form, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const { pathname, search } = useLocation();

  const toggleLanguage = i18n.language === "en" ? "vi" : "en";
  const label = i18n.language === "en" ? "VI" : "EN";

  return (
    <Form method="get" action="/api/locale">
      <input type="hidden" name="lng" value={toggleLanguage} />
      <input type="hidden" name="returnTo" value={pathname + search} />
      <button
        type="submit"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-brand-strong transition-colors hover:bg-surface-subtle hover:text-primary"
        title="Change Language"
      >
        <div className="flex items-center gap-1 font-bold text-sm">
          <Globe className="w-5 h-5" />
          <span className="hidden sm:inline">{label}</span>
        </div>
      </button>
    </Form>
  );
}
