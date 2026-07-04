import type { Route } from "./+types/home";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { HeroSection } from "../components/home/HeroSection";
import { BestSellersSection } from "../components/home/BestSellersSection";
import { ManufacturerSection } from "../components/home/ManufacturerSection";
import { CategoriesSection } from "../components/home/CategoriesSection";
import { TrustedBrandsSection } from "../components/home/TrustedBrandsSection";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollectionProducts,
  fetchStorefrontProducts,
} from "../lib/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "PHÙNG THỊ - Cúp Vinh Danh & Kỷ Niệm Chương Cao Cấp" },
    { name: "description", content: "Xưởng sản xuất kỷ niệm chương và cúp vinh danh cao cấp hàng đầu Việt Nam." },
  ];
}

export async function loader({}: Route.LoaderArgs) {
  const [categories, bestSellersData, featuredData] = await Promise.all([
    fetchStorefrontCategories().catch(() => []),
    fetchStorefrontCollectionProducts("best-sellers", { limit: 4 }).catch(() => ({ items: [], page: 1, limit: 4, total: 0 })),
    fetchStorefrontCollectionProducts("featured", { limit: 1 }).catch(() => ({ items: [], page: 1, limit: 1, total: 0 })),
  ]);

  // If no best-sellers collection products, fallback to latest products
  const bestSellers = bestSellersData.items.length > 0
    ? bestSellersData.items
    : await fetchStorefrontProducts({ limit: 4 }).then((d) => d.items).catch(() => []);

  const featuredProduct = featuredData.items[0] ?? bestSellers[0] ?? null;

  return {
    categories,
    bestSellers,
    featuredProduct,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { categories, bestSellers, featuredProduct } = loaderData;
  useScrollReveal();

  return (
    <div className="overflow-x-hidden">
      <HeroSection product={featuredProduct} />
      <BestSellersSection products={bestSellers} />
      <ManufacturerSection />
      <CategoriesSection categories={categories} />
      <TrustedBrandsSection />
    </div>
  );
}
