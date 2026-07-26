import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, X } from "lucide-react";

const CONTACTS = [
  {
    href: "https://www.messenger.com/t/cupphalephungthi",
    src: "/images/contact/messenger.png",
    alt: "Messenger",
  },
  {
    href: "https://zalo.me/352826287636550047",
    src: "/images/contact/zalo.png",
    alt: "Zalo",
  },
  {
    href: "tel:0816999296",
    src: "/images/contact/phone.png",
    altKey: "contact_call",
  },
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

  const getContactAlt = (contact: typeof CONTACTS[number]) => {
    if ("altKey" in contact) return t(contact.altKey!);
    return contact.alt!;
  };

  return (
    <>
      <div ref={ref} className="fixed bottom-6 left-4 z-50 md:hidden">
        <div className="flex flex-col items-center gap-3">
          {CONTACTS.map((contact, i) => (
            <a
              key={contact.alt || contact.altKey}
              href={contact.href}
              target={contact.href.startsWith("tel:") ? undefined : "_blank"}
              rel={contact.href.startsWith("tel:") ? undefined : "noopener noreferrer"}
              aria-label={getContactAlt(contact)}
              className={`h-12 w-12 transition-all duration-200 ${
                open
                  ? "pointer-events-auto scale-100 opacity-100"
                  : "pointer-events-none scale-0 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${(CONTACTS.length - 1 - i) * 0.08}s` : "0s" }}
            >
              <img
                src={contact.src}
                alt={getContactAlt(contact)}
                className="h-full w-full rounded-full bg-white shadow-lg"
              />
            </a>
          ))}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent shadow-lg transition-transform active:scale-90"
            aria-label={open ? t("contact_fab_close") : t("contact_fab_open")}
          >
            {open ? (
              <X className="size-5 text-white" />
            ) : (
              <MessageCircle className="size-5 text-white" />
            )}
          </button>
        </div>
      </div>

      <div className="fixed bottom-4 left-4 z-50 hidden flex-col gap-3 md:flex">
        {CONTACTS.map((contact) => (
          <a
            key={contact.alt || contact.altKey}
            href={contact.href}
            target={contact.href.startsWith("tel:") ? undefined : "_blank"}
            rel={contact.href.startsWith("tel:") ? undefined : "noopener noreferrer"}
            aria-label={getContactAlt(contact)}
            className="group relative block h-12 w-12"
          >
            <img
              src={contact.src}
              alt={getContactAlt(contact)}
              className="h-full w-full rounded-full bg-white shadow-lg transition-transform group-hover:scale-110"
            />
            <span className="absolute -right-2 top-1/2 translate-x-full whitespace-nowrap rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 pointer-events-none">
              {getContactAlt(contact)}
            </span>
          </a>
        ))}
      </div>
    </>
  );
}
