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
        className="flex items-center justify-center h-10 w-10 rounded-full hover:bg-gray-100 transition-colors relative text-[#1a2e44] hover:text-primary"
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
