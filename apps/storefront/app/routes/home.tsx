import { BestSellersSection } from "../components/home/BestSellersSection";
import { CategoriesSection } from "../components/home/CategoriesSection";
import { HeroSection } from "../components/home/HeroSection";
import { QuoteTicker } from "../components/home/QuoteTicker";
import { CustomizationFeatureSection } from "../components/home/ManufacturerSection";
import { NewsletterSection } from "../components/home/NewsletterSection";
import { ProofRow } from "../components/home/ProofRow";
import { ReviewsSection } from "../components/home/ReviewsSection";
import { SeoIntroSection } from "../components/home/SeoIntroSection";
import { ShopByOccasionSection } from "../components/home/ShopByOccasionSection";
import { useScrollReveal } from "../hooks/useScrollReveal";
import {
    fetchStorefrontCategories,
    fetchStorefrontCollectionProducts,
    fetchStorefrontProducts,
} from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
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

export async function loader({ request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const [categories, bestSellersData] = await Promise.all([
    fetchStorefrontCategories(locale).catch(() => []),
    fetchStorefrontCollectionProducts("best-sellers", { limit: 8, locale }).catch(
      () => ({ items: [], page: 1, limit: 8, total: 0 })
    ),
  ]);

  // Fallback to latest products when best-sellers collection is empty
  const bestSellers =
    bestSellersData.items.length > 0
      ? bestSellersData.items
      : await fetchStorefrontProducts({ limit: 8, locale })
          .then((d) => d.items)
          .catch(() => []);

  return {
    categories,
    bestSellers,
    locale,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { categories, bestSellers, locale } = loaderData;
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      {/* 2. Cinematic full-bleed hero */}
      <HeroSection />

      <QuoteTicker />

      {/* 3. Production proof claims */}
      <ProofRow />

      {/* 4. Shop by product type */}
      <CategoriesSection categories={categories} locale={locale} />

      {/* 5. Best-selling products (hides if empty) */}
      <BestSellersSection products={bestSellers} locale={locale} />

      {/* 6. Customization story */}
      <CustomizationFeatureSection />

      {/* 7. Shop by occasion */}
      <ShopByOccasionSection />

      {/* 8. Guarantees (scaffolded for real reviews) */}
      <ReviewsSection />

      {/* 9. SEO intro text */}
      <SeoIntroSection />

      {/* 10. Newsletter */}
      <NewsletterSection />
    </div>
  );
}
