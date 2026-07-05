import type { Route } from "./+types/home";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { TrustBar } from "../components/home/TrustBar";
import { HeroSection } from "../components/home/HeroSection";
import { ProofRow } from "../components/home/ProofRow";
import { CategoriesSection } from "../components/home/CategoriesSection";
import { BestSellersSection } from "../components/home/BestSellersSection";
import { CustomizationFeatureSection } from "../components/home/ManufacturerSection";
import { ShopByOccasionSection } from "../components/home/ShopByOccasionSection";
import { ReviewsSection } from "../components/home/ReviewsSection";
import { SeoIntroSection } from "../components/home/SeoIntroSection";
import { NewsletterSection } from "../components/home/NewsletterSection";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollectionProducts,
  fetchStorefrontProducts,
} from "../lib/api";

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

export async function loader({}: Route.LoaderArgs) {
  const [categories, bestSellersData] = await Promise.all([
    fetchStorefrontCategories().catch(() => []),
    fetchStorefrontCollectionProducts("best-sellers", { limit: 8 }).catch(
      () => ({ items: [], page: 1, limit: 8, total: 0 })
    ),
  ]);

  // Fallback to latest products when best-sellers collection is empty
  const bestSellers =
    bestSellersData.items.length > 0
      ? bestSellersData.items
      : await fetchStorefrontProducts({ limit: 8 })
          .then((d) => d.items)
          .catch(() => []);

  return {
    categories,
    bestSellers,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { categories, bestSellers } = loaderData;
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      {/* 2. Cinematic full-bleed hero */}
      <HeroSection />

      {/* 3. Production proof claims */}
      <ProofRow />

      {/* 4. Shop by product type */}
      <CategoriesSection categories={categories} />

      {/* 5. Best-selling products (hides if empty) */}
      <BestSellersSection products={bestSellers} />

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
