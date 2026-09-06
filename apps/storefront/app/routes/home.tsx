import { useTranslation } from "react-i18next";
import { BestSellersSection } from "../components/home/BestSellersSection";
import { BrandShowcaseSection } from "../components/home/BrandShowcaseSection";
import { CategoriesSection } from "../components/home/CategoriesSection";
import { HeroSection } from "../components/home/HeroSection";
import { QuoteTicker } from "../components/home/QuoteTicker";
import { CustomizationFeatureSection } from "../components/home/ManufacturerSection";
import { NewsletterSection } from "../components/home/NewsletterSection";
import { PartnerLogosSection } from "../components/home/PartnerLogosSection";
import { ProofRow } from "../components/home/ProofRow";
import { ReviewsSection } from "../components/home/ReviewsSection";
import { SeoIntroSection } from "../components/home/SeoIntroSection";
import { ShopByOccasionSection } from "../components/home/ShopByOccasionSection";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
    fetchStorefrontCategories,
    fetchStorefrontCollectionProducts,
} from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import type { Route } from "./+types/home";

export function meta({ loaderData }: Route.MetaArgs) {
  const isEn = loaderData?.locale === "en";
  return [
    { title: isEn ? "PHÙNG THỊ - Premium Crystal Trophies & Commemorative Medals" : "PHÙNG THỊ - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp" },
    {
      name: "description",
      content: isEn
        ? "Vietnam's leading manufacturer of custom commemorative medals and honor trophies. Engrave name, logo as requested. Nationwide delivery."
        : "Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam. Khắc tên, logo theo yêu cầu. Giao hàng toàn quốc.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("home", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const [categories, customizableBestSellersData, standardBestSellersData] = await Promise.all([
      fetchStorefrontCategories(locale, backendFetch).catch(() => []),
      fetchStorefrontCollectionProducts("best-sellers", {
        limit: 8,
        locale,
        customizable: "true",
      }, backendFetch).catch(
        () => ({ items: [], page: 1, limit: 8, total: 0 })
      ),
      fetchStorefrontCollectionProducts("best-sellers", {
        limit: 8,
        locale,
        customizable: "false",
      }, backendFetch).catch(
        () => ({ items: [], page: 1, limit: 8, total: 0 })
      ),
    ]);

    return {
      categories: categories.slice(0, 4),
      customizableBestSellers: customizableBestSellersData.items,
      standardBestSellers: standardBestSellersData.items,
      locale,
    };
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { categories, customizableBestSellers, standardBestSellers, locale } = loaderData;
  const { t } = useTranslation("home");
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      <HeroSection />

      <QuoteTicker />

      {/*<ProofRow />*/}

      <CategoriesSection categories={categories} locale={locale} />

      <BrandShowcaseSection />

      <BestSellersSection
        products={standardBestSellers}
        locale={locale}
        title={t("best_sellers_standard_title")}
        subtitle={t("best_sellers_standard_subtitle")}
      />

      <CustomizationFeatureSection />

      <BestSellersSection
        products={customizableBestSellers}
        locale={locale}
        title={t("best_sellers_customizable_title")}
        subtitle={t("best_sellers_customizable_subtitle")}
      />

      {/*<ShopByOccasionSection />*/}

      <ReviewsSection />

      <SeoIntroSection />

      <PartnerLogosSection />

      <NewsletterSection />
    </div>
  );
}
