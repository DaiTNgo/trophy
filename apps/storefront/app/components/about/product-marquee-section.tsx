const ROW_1 = [
  { src: "/images/about/marquee/cup-c01.png", name: "Cúp Pha Lê C01" },
  { src: "/images/about/marquee/cup-c05.png", name: "Cúp Pha Lê C05" },
  { src: "/images/about/marquee/cup-k7.png", name: "Cúp Độc Lập Pha Lê K7" },
  { src: "/images/about/marquee/cup-kl1.png", name: "Cúp Hợp Kim KL1" },
  { src: "/images/about/marquee/cup-kl04.png", name: "Cúp Hợp Kim KL04" },
  { src: "/images/about/marquee/cup-kl07.png", name: "Cúp Hợp Kim KL07" },
  { src: "/images/about/marquee/cup-kl12.png", name: "Cúp Hợp Kim KL12" },
  { src: "/images/about/marquee/cup-golf-cg01.png", name: "Cúp Golf CG01" },
];

const ROW_2 = [
  {
    src: "/images/about/marquee/cup-pickleball-cpb01.jpg",
    name: "Cúp Pickleball CPB01",
  },
  {
    src: "/images/about/marquee/medal-kcb03.jpg",
    name: "Kỷ Niệm Chương Cánh Buồm KCB03",
  },
  {
    src: "/images/about/marquee/crystal-wood-plg09.png",
    name: "Cúp Pha Lê Gỗ PLG09",
  },
  {
    src: "/images/about/marquee/3d-crystal-3d03.png",
    name: "Pha Lê 3D – 3D03",
  },
  { src: "/images/about/marquee/clock-dh02.png", name: "Đồng Hồ Pha Lê DH02" },
  {
    src: "/images/about/marquee/anniversary-bs01.png",
    name: "Bộ Số Kỷ Niệm BS01",
  },
  { src: "/images/about/marquee/plaque-gd01.jpg", name: "Bảng Vinh Danh GĐ01" },
  { src: "/images/about/marquee/cup-kl15.png", name: "Cúp Hợp Kim KL15" },
];

import { useTranslation } from "react-i18next";

export function ProductMarqueeSection() {
  const { t } = useTranslation("about");
  return (
    <section
      className="relative overflow-hidden bg-white"
      aria-label={t("products_label")}
    >
      <div
        className="bg-surface-dark px-margin-mobile py-20 md:px-margin-desktop"
        style={{
          clipPath:
            "polygon(0 0, 100% 0, 100% calc(100% - tan(2deg) * 100vw), 0 100%)",
        }}
      >
        <div className="mx-auto max-w-container-max text-center">
          <h2 className="mb-4 font-heading text-[36px] uppercase leading-10 text-white md:text-[44px]">
            {t("hero_title")}
          </h2>
          <div className="mx-auto mb-6 h-[3px] w-16 bg-brand-accent" />
          <p className="mx-auto max-w-2xl font-body-lg text-body-lg leading-relaxed text-white/80">
            {t("hero_subtitle")}
          </p>
        </div>
      </div>

      <div className="px-margin-mobile pb-24 pt-16 md:px-margin-desktop relative -top-16.25">
        <div className="marquee-tilt">
          <div className="flex flex-col gap-4">
            <div className="marquee-track overflow-hidden">
              <div className="marquee-content flex shrink-0 gap-6">
                {[...ROW_1, ...ROW_1].map((img, i) => (
                  <div
                    key={`r1-${img.name}-${i}`}
                    className="flex h-[180px] w-[180px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8f8f8] p-3"
                  >
                    <img
                      className="h-full w-full object-contain mix-blend-multiply"
                      src={img.src}
                      alt={img.name}
                      loading={i < 2 ? "eager" : "lazy"}
                      fetchPriority={i < 2 ? "high" : "low"}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="marquee-track overflow-hidden">
              <div className="marquee-content-reverse flex shrink-0 gap-6">
                {[...ROW_2, ...ROW_2].map((img, i) => (
                  <div
                    key={`r2-${img.name}-${i}`}
                    className="flex h-[180px] w-[180px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#f8f8f8] p-3"
                  >
                    <img
                      className="h-full w-full object-contain mix-blend-multiply"
                      src={img.src}
                      alt={img.name}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
      
        .marquee-tilt {
          transform: rotate(-2deg);
        }
        .marquee-track {
          mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0%,
            black 5%,
            black 95%,
            transparent 100%
          );
        }
        .marquee-content {
          animation: marquee-scroll 40s linear infinite;
          will-change: transform;
        }
        .marquee-content-reverse {
          animation: marquee-scroll-reverse 40s linear infinite;
          will-change: transform;
        }
        @keyframes marquee-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-scroll-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}
