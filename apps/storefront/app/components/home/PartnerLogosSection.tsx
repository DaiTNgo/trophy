import { useTranslation } from "react-i18next";

const PARTNER_LOGOS: { src: string; alt: string }[] = [
  { src: "/images/home/partners/abbot.jpg", alt: "Abbot" },
  { src: "/images/home/partners/astra.jpg", alt: "AstraZeneca" },
  { src: "/images/home/partners/bosch.jpg", alt: "Bosch" },
  { src: "/images/home/partners/cj.jpg", alt: "CJ" },
  { src: "/images/home/partners/coca.jpg", alt: "Coca-Cola" },
  { src: "/images/home/partners/daichi.jpg", alt: "Daichi" },
  { src: "/images/home/partners/fpt.jpg", alt: "FPT" },
  { src: "/images/home/partners/ftu.jpg", alt: "FTU" },
  { src: "/images/home/partners/ghtk.jpg", alt: "GHTK" },
  { src: "/images/home/partners/lavie.jpg", alt: "Lavie" },
  { src: "/images/home/partners/manulife.jpg", alt: "Manulife" },
  { src: "/images/home/partners/mb.jpg", alt: "MB Bank" },
  { src: "/images/home/partners/napas.jpg", alt: "Napas" },
  { src: "/images/home/partners/sony.jpg", alt: "Sony" },
  { src: "/images/home/partners/tddd.jpg", alt: "TDDD" },
  { src: "/images/home/partners/toyota.jpg", alt: "Toyota" },
  { src: "/images/home/partners/vib.jpg", alt: "VIB" },
  { src: "/images/home/partners/vietcombank.jpg", alt: "Vietcombank" },
  { src: "/images/home/partners/viettel.jpg", alt: "Viettel" },
  { src: "/images/home/partners/vin.jpg", alt: "Vingroup" },
  { src: "/images/home/partners/vng.jpg", alt: "VNG" },
  { src: "/images/home/partners/vps.jpg", alt: "VPS" },
  { src: "/images/home/partners/vsip.jpg", alt: "VSIP" },
];

export function PartnerLogosSection() {
  const { t } = useTranslation();
  const slides = [...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS];

  return (
    <section className="py-16 md:py-24 bg-surface overflow-hidden">
      <div className="mx-auto max-w-container-max px-margin-mobile md:px-margin-desktop">
        <div className="mb-10 text-center reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            {t("home.partners.eyebrow", "Đối tác")}
          </p>
          <h2 className="font-heading text-[30px] md:text-[40px] uppercase leading-none text-on-surface">
            {t("home.partners.title", "Đối tác của chúng tôi")}
          </h2>
          <p className="mt-3 font-body-md text-body-md text-on-surface-variant max-w-xl mx-auto">
            {t("home.partners.subtitle", "Đồng hành cùng các doanh nghiệp, tổ chức hàng đầu")}
          </p>
        </div>
      </div>

      <div className="marquee-fade-wrapper group">
        <div className="marquee-scroll flex items-center gap-5">
          {slides.map((logo, i) => (
            <div
              key={`${logo.alt}-${i}`}
              className="flex w-[180px] shrink-0 items-center justify-center rounded-lg bg-white shadow-md border border-black/[0.06] transition-shadow duration-300 hover:shadow-lg"
            >
              <div className="flex w-full items-center justify-center px-5 py-5 transition-transform duration-300 hover:scale-[1.2]">
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className="max-h-14 max-w-full object-contain"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        .marquee-fade-wrapper {
          mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        }
        .marquee-fade-wrapper:hover .marquee-scroll {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        .marquee-scroll {
          width: fit-content;
          animation: marquee-scroll 40s linear infinite;
        }
      `}</style>
    </section>
  );
}
