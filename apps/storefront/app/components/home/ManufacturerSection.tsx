import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Type, ImageUp, Eye, Palette, ArrowRight } from "lucide-react";

const PRODUCT_IMAGE = "/images/home/customization-workspace.jpg";

const FEATURE_ICONS = [Type, ImageUp, Eye, Palette];

export function CustomizationFeatureSection() {
  const { t } = useTranslation("home");
  const features = t("customization_features", { returnObjects: true }) as {
    title: string; desc: string;
  }[];

  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface-container-low">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 xl:gap-16 items-center">
          <div className="reveal active">
            <div className="relative w-full aspect-[4/3] overflow-hidden rounded-xl bg-surface-base">
              <img
                className="w-full h-full object-cover"
                src={PRODUCT_IMAGE}
                alt={t("customization_title")}
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-xl ring-1 ring-black/[0.06] pointer-events-none" />
            </div>
          </div>

          <div className="reveal active">
            <p className="mb-4 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
              {t("customization_eyebrow")}
            </p>
            <h2 className="font-heading text-[32px] md:text-[40px] uppercase leading-10 text-on-surface mb-4">
              {t("customization_title")}
            </h2>
            <div className="mb-6 h-[3px] w-16 bg-brand-support" />
            <p className="font-body-lg text-body-lg text-on-surface-variant mb-10 leading-relaxed">
              {t("customization_desc")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
              {features.map(({ title, desc }, i) => {
                const Icon = FEATURE_ICONS[i];
                return (
                  <div
                    key={title}
                    className="rounded-xl border border-border-subtle bg-surface-base p-4"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-action-support/10">
                        <Icon className="w-[18px] h-[18px] text-action-support" />
                      </div>
                      <span className="font-semibold text-[15px] text-brand-strong">
                        {title}
                      </span>
                    </div>
                    <p className="font-body-md text-[14px] text-text-muted leading-relaxed">
                      {desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <Link
              to="/categories/san-pham-tuy-chinh"
              className="inline-flex items-center gap-2 rounded-lg bg-action-support px-8 py-4 font-label-md text-label-md uppercase tracking-widest text-white transition-all duration-300 hover:bg-action-support-hover"
            >
              {t("customization_cta")}
              <ArrowRight className="w-[18px] h-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
