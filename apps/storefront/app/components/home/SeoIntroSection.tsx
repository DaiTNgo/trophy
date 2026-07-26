import { useTranslation } from "react-i18next";

export function SeoIntroSection() {
  const { t } = useTranslation("home");

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-surface-base">
      <div className="absolute inset-0">
        <img
          src="/images/home/seo-bg.jpg"
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/60 to-black/50" />
      </div>

      <div className="relative z-10 px-4 md:px-margin-desktop">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-[28px] md:text-[36px] uppercase leading-tight text-white mb-6">
            {t("seo_heading")}
          </h2>
          <div className="space-y-4 font-body-lg text-body-lg text-white/80 leading-relaxed">
            <p>{t("seo_para_1")}</p>
            <p>{t("seo_para_2")}</p>
            <p>{t("seo_para_3")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
