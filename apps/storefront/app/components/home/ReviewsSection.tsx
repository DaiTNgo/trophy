import { Container } from "@/components/container";
import { useTranslation } from "react-i18next";

const CARD_GRADIENTS = [
  "bg-gradient-to-b from-[#c8b0a0] to-white",
  "bg-gradient-to-b from-[#a0b8c8] to-white",
  "bg-gradient-to-b from-[#98b8a8] to-white",
];

const BORDER_COLORS = [
  "border-[#c8b0a0]/40",
  "border-[#a0b8c8]/40",
  "border-[#98b8a8]/40",
];

const HOVER_BORDER_COLORS = [
  "group-hover:border-[#c8b0a0]/60",
  "group-hover:border-[#a0b8c8]/60",
  "group-hover:border-[#98b8a8]/60",
];

const SHADOW_COLORS = [
  "shadow-lg shadow-[#c8b0a0]/30 group-hover:shadow-xl group-hover:shadow-[#c8b0a0]/50",
  "shadow-lg shadow-[#a0b8c8]/30 group-hover:shadow-xl group-hover:shadow-[#a0b8c8]/50",
  "shadow-lg shadow-[#98b8a8]/30 group-hover:shadow-xl group-hover:shadow-[#98b8a8]/50",
];

export function ReviewsSection() {
  const { t } = useTranslation("home");
  const guarantees = t("guarantees", { returnObjects: true }) as {
    role: string; quote: string;
  }[];

  return (
    <section className="relative py-16 md:py-20 overflow-hidden bg-surface-base">

      <Container className="relative">
        <div className="text-center mb-16 md:mb-20 reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            {t("reviews_eyebrow")}
          </p>
          <h2 className="font-heading text-[30px] md:text-[40px] uppercase leading-none text-on-surface">
            {t("reviews_title")}
          </h2>
        </div>

        <div className="flex flex-col gap-5 md:flex-row md:items-stretch md:justify-center md:pb-40" style={{ perspective: "1200px" }}>
          {guarantees.map((g, i) => {
            return (
              <div
                key={g.role}
                className="gs-card group"
                data-index={i}
              >
                <div className={`flex h-full w-full flex-col rounded-xl ${CARD_GRADIENTS[i]} border ${BORDER_COLORS[i]} ${HOVER_BORDER_COLORS[i]} ${SHADOW_COLORS[i]} px-6 py-7 transition-all duration-400 group-hover:-translate-y-1 md:w-[280px] md:min-h-[325px] md:px-8 md:py-8`}>
                  <p className="font-bold text-[13px] uppercase tracking-[0.08em] text-on-surface mb-2">
                    {g.role}
                  </p>
                  <p className="font-body-md text-[15px] leading-loose text-on-surface-variant md:text-[16px]">
                    "{g.quote}"
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
      <style>{`
        .gs-card {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          transform-origin: bottom center;
        }
        @media (min-width: 768px) {
          .gs-card {
            margin-bottom: -180px;
          }
          .gs-card[data-index="0"] {
            transform: translateY(-6px) rotate(-18deg);
            z-index: 1;
            margin-right: -160px;
          }
          .gs-card[data-index="1"] {
            transform: rotate(0deg);
            z-index: 3;
          }
          .gs-card[data-index="2"] {
            transform: translateY(-6px) rotate(22deg);
            z-index: 1;
            margin-left: -160px;
          }
          .gs-card[data-index="0"]:hover {
            transform: translateX(-80px) translateY(-6px) rotate(-16deg) scale(1.05) !important;
            z-index: 10 !important;
          }
          .gs-card[data-index="1"]:hover {
            transform: translateY(-28px) scale(1.05) !important;
            z-index: 10 !important;
          }
          .gs-card[data-index="2"]:hover {
            transform: translateX(80px) translateY(-6px) rotate(20deg) scale(1.05) !important;
            z-index: 10 !important;
          }
        }
      `}</style>
    </section>
  );
}
