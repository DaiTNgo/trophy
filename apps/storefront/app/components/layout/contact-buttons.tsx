import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, X } from "lucide-react";

const PHONES = [
  { href: "tel:0816999296", display: "0816 999 296" },
  { href: "tel:0966100050", display: "0966 100 050" },
];

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [onOutside]);

  return ref;
}

export function ContactButtons() {
  const { t } = useTranslation("layout");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const mobileRef = useClickOutside(() => setMobileOpen(false));
  const desktopRef = useClickOutside(() => setDesktopOpen(false));

  return (
    <>
      <div ref={mobileRef} className="fixed bottom-6 left-4 z-50 md:hidden">
        <div className="relative">
          {mobileOpen && (
            <div className="absolute bottom-full left-0 mb-3 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
              {PHONES.map((phone) => (
                <a
                  key={phone.href}
                  href={phone.href}
                  aria-label={t("contact_call_number", { number: phone.display })}
                  className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Phone className="size-4 shrink-0 text-brand-support" />
                  {phone.display}
                </a>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-support shadow-lg transition-transform active:scale-90"
            aria-label={mobileOpen ? t("contact_fab_close") : t("contact_fab_open")}
          >
            {mobileOpen ? (
              <X className="size-5 text-white" />
            ) : (
              <Phone className="size-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <div ref={desktopRef} className="fixed bottom-4 left-4 z-50 hidden md:block">
        <div className="relative">
          {desktopOpen && (
            <div className="absolute bottom-full left-0 mb-3 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-[0_12px_32px_rgba(0,0,0,0.18)]">
              {PHONES.map((phone) => (
                <a
                  key={phone.href}
                  href={phone.href}
                  aria-label={t("contact_call_number", { number: phone.display })}
                  className="flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container-low"
                >
                  <Phone className="size-4 shrink-0 text-brand-support" />
                  {phone.display}
                </a>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setDesktopOpen(!desktopOpen)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-support shadow-lg transition-transform hover:scale-110 active:scale-95"
            aria-label={desktopOpen ? t("contact_fab_close") : t("contact_fab_open")}
          >
            {desktopOpen ? (
              <X className="size-5 text-white" />
            ) : (
              <Phone className="size-5 text-white" />
            )}
            {!desktopOpen && (
              <span className="absolute -right-2 top-1/2 translate-x-full whitespace-nowrap rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 pointer-events-none">
                {t("contact_call")}
              </span>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
