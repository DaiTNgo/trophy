import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Building2, Trophy, GraduationCap, PartyPopper, Heart, UserCheck, ArrowRight } from "lucide-react";

const OCCASION_ICONS: Record<string, React.ElementType> = {
  Building2, Trophy, GraduationCap, PartyPopper, Heart, UserCheck,
};

const OCCASION_LINKS = [
  "/categories/cup-vinh-danh",
  "/categories/cup-the-thao",
  "/products",
  "/categories/bang-vinh-danh",
  "/categories/ky-niem-chuong",
  "/products",
];

export function ShopByOccasionSection() {
  const { t } = useTranslation("home");
  const occasions = t("occasions", { returnObjects: true }) as {
    label: string; desc: string; cta: string;
  }[];

  return (
    <section className="py-24 px-4 md:px-margin-desktop bg-surface">
      <div className="max-w-container-max mx-auto">
        <div className="mb-14 reveal active">
          <p className="mb-3 font-label-md text-label-md uppercase tracking-[0.35em] text-brand-accent">
            {t("occasions_eyebrow")}
          </p>
          <h2 className="font-heading text-[36px] md:text-[44px] uppercase leading-none text-on-surface">
            {t("occasions_title")}
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {occasions.map(({ label, desc, cta }, i) => {
            const Icon = OCCASION_ICONS[Object.keys(OCCASION_ICONS)[i]];
            return (
              <Link
                key={label}
                to={OCCASION_LINKS[i]}
                className="reveal active group flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface-container-low p-6 transition-all duration-300 hover:border-brand-strong hover:shadow-md"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-strong/10 transition-colors duration-300 group-hover:bg-brand-strong">
                  {Icon && <Icon className="text-[24px] text-brand-strong transition-colors duration-300 group-hover:text-white" />}
                </div>
                <div>
                  <h3 className="font-label-md text-label-md uppercase tracking-wide text-on-surface mb-1.5">
                    {label}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant text-[14px] leading-snug">
                    {desc}
                  </p>
                </div>
                <span className="mt-auto flex items-center gap-1 font-label-md text-label-md text-[12px] uppercase tracking-widest text-brand-support transition-all duration-300 group-hover:gap-2">
                  {cta}
                  <ArrowRight className="text-[14px]" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
