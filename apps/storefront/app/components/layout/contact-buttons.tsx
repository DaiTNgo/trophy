const CONTACTS = [
  {
    href: "https://www.messenger.com/t/cupphalephungthi",
    src: "/images/contact/messenger.png",
    alt: "Messenger",
    delay: 0,
    btnClass: "h-12 w-12",
  },
  {
    href: "https://zalo.me/352826287636550047",
    src: "/images/contact/zalo.png",
    alt: "Zalo",
    delay: 0.5,
    btnClass: "h-12 w-12",
  },
  {
    href: "tel:0816999296",
    src: "/images/contact/phone.png",
    alt: "Gọi 0816 999 296",
    delay: 1,
    btnClass: "h-12 w-12",
  },
];

export function ContactButtons() {
  return (
    <div className="fixed bottom-4 left-4 z-50 flex flex-col gap-3">
      {CONTACTS.map((contact) => (
        <a
          key={contact.alt}
          href={contact.href}
          target={contact.href.startsWith("tel:") ? undefined : "_blank"}
          rel={contact.href.startsWith("tel:") ? undefined : "noopener noreferrer"}
          aria-label={contact.alt}
          className={`contact-btn group relative block ${contact.btnClass || "h-14 w-14"}`}
          style={{ animationDelay: `${contact.delay}s` }}
        >
          <img
            src={contact.src}
            alt={contact.alt}
            className="h-full w-full rounded-full bg-white shadow-lg transition-transform group-hover:scale-110"
          />
          <span className="absolute -right-2 top-1/2 translate-x-full whitespace-nowrap rounded-md bg-foreground/90 px-3 py-1.5 text-xs font-medium text-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100 pointer-events-none">
            {contact.alt}
          </span>
        </a>
      ))}
    </div>
  );
}
