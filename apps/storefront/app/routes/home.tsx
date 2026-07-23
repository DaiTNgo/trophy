import { BestSellersSection } from "../components/home/BestSellersSection";
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
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PHÙNG THỊ - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp" },
    {
      name: "description",
      content:
        "Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam. Khắc tên, logo theo yêu cầu. Giao hàng toàn quốc.",
    },
  ];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("home", request, async () => {
    const locale = getLocale(context);
    const [categories, customizableBestSellersData, standardBestSellersData] = await Promise.all([
      fetchStorefrontCategories(locale).catch(() => []),
      fetchStorefrontCollectionProducts("best-sellers", {
        limit: 8,
        locale,
        customizable: "true",
      }).catch(
        () => ({ items: [], page: 1, limit: 8, total: 0 })
      ),
      fetchStorefrontCollectionProducts("best-sellers", {
        limit: 8,
        locale,
        customizable: "false",
      }).catch(
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
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      {/* 2. Cinematic full-bleed hero */}
      <HeroSection />

      <QuoteTicker />

      {/* 3. Production proof claims */}
      {/*<ProofRow />*/}

      {/* 4. Shop by product type */}
      <CategoriesSection categories={categories} locale={locale} />

      {/* 5. Best-selling customizable products */}
      <BestSellersSection
        products={customizableBestSellers}
        locale={locale}
        title={locale === "en" ? "Top Customizable Products" : "Top sản phẩm tùy chỉnh bán chạy"}
        subtitle={
          locale === "en"
            ? "Personalize names, logos, award titles, and event messages before production."
            : "Cá nhân hóa tên, logo, hạng mục giải thưởng và thông điệp trước khi sản xuất."
        }
      />



      {/* 6. Best-selling standard products */}
      <BestSellersSection
        products={standardBestSellers}
        locale={locale}
        title={locale === "en" ? "Best Selling Products" : "Sản phẩm bán chạy"}
        subtitle={
          locale === "en"
            ? "Fast-moving award products for teams, events, and corporate recognition."
            : "Những mẫu bán tốt cho đội nhóm, sự kiện và vinh danh doanh nghiệp."
        }
      />

      {/* 7. Customization story */}
      <CustomizationFeatureSection />

      {/* 8. Shop by occasion */}
      {/*<ShopByOccasionSection />*/}

      {/* 9. Guarantees (scaffolded for real reviews) */}
      <ReviewsSection />

      {/* 10. SEO intro text */}
      <SeoIntroSection />

      {/* 11. Partner logos */}
      <PartnerLogosSection />

      {/* 12. Newsletter */}
      <NewsletterSection />
    </div>
  );
}
