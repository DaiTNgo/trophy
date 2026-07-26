import { useTranslation } from "react-i18next";

export function QuoteTicker() {
  const { t } = useTranslation("home");
  const quotes = [t("quote_1"), t("quote_2"), t("quote_3")];

  const items = quotes.flatMap((q, i) => {
    const elements: React.ReactNode[] = [<span key={`q-${i}`}>{q}</span>];
    elements.push(
      <span key={`s-${i}`} className="text-on-surface-variant/40">✦</span>,
    );
    return elements;
  });

  return (
    <div className="w-full overflow-hidden bg-surface py-3 mt-8">
      <div className="marquee-wrapper">
        <div className="marquee-track flex items-center gap-16 whitespace-nowrap text-[18px] font-bold uppercase tracking-[0.15em] text-on-surface-variant">
          {items}
          {items}
        </div>
      </div>
      <style>{`
        .marquee-wrapper {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track {
          width: fit-content;
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
