import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Phone, X } from "lucide-react";

const PHONES = [
  { href: "tel:0816999296", display: "0816 999 296" },
  { href: "tel:0901234567", display: "0901 234 567" },
];

export function ContactButtons() {
  const { t } = useTranslation("layout");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <div ref={ref} className="fixed bottom-6 left-4 z-50 md:hidden">
        <div className="flex flex-col items-center gap-3">
          {PHONES.map((phone, i) => (
            <a
              key={phone.href}
              href={phone.href}
              aria-label={t("contact_call_number", { number: phone.display })}
              className={`h-12 w-12 transition-all duration-200 ${
                open
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-0 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${(PHONES.length - 1 - i) * 0.08}s` : "0s" }}
            >
              <span className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-lg">
                <Phone className="size-5 text-on-surface" />
              </span>
            </a>
          ))}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-support shadow-lg transition-transform active:scale-90"
            aria-label={open ? t("contact_fab_close") : t("contact_fab_open")}
          >
            {open ? (
              <X className="size-5 text-white" />
            ) : (
              <Phone className="size-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 z-50 hidden md:block" ref={ref}>
        <div className="relative">
          {open && (
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
            onClick={() => setOpen(!open)}
            className="group relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-support shadow-lg transition-transform hover:scale-110 active:scale-95"
            aria-label={open ? t("contact_fab_close") : t("contact_fab_open")}
          >
            {open ? (
              <X className="size-5 text-white" />
            ) : (
              <Phone className="size-5 text-white" />
            )}
            {!open && (
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
