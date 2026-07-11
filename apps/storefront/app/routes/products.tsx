import { useSearchParams } from "react-router";
import { FilterChips } from "../components/products/FilterChips";
import { ProductCard } from "../components/shared/ProductCard";
import { Pagination } from "../components/shared/Pagination";
import { fetchStorefrontCategories, fetchStorefrontProducts } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const url = new URL(request.url);
  const activeCategory = url.searchParams.get("category") || "";
  const currentPage = Number(url.searchParams.get("page")) || 1;

  // Fetch categories first to resolve the handle
  const apiCategories = await fetchStorefrontCategories().catch(() => []);
  const categoryHandle = activeCategory
    ? apiCategories.find((c) => c.name === activeCategory)?.handle || ""
    : "";

  const data = await fetchStorefrontProducts({
    category: categoryHandle || undefined,
    page: currentPage,
    limit: 12,
  });

  const allCategories = [
    { name: "Tất cả", handle: "" },
    ...apiCategories.map((c) => ({ name: c.name, handle: c.handle })),
  ];

  return {
    categories: allCategories,
    products: data.items,
    activeCategory,
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    locale,
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { categories, products, activeCategory, currentPage, totalPages, locale } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategorySelect = (category: string) => {
    setSearchParams((prev) => {
      prev.set("category", category);
      prev.set("page", "1");
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set("page", page.toString());
      return prev;
    });
  };

  return (
    <div className="bg-background min-h-screen font-body-md text-on-background">
      <main className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-12">
        <div className="mb-12">
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-8">
            DANH MỤC SẢN PHẨM
          </h1>
          <div className="sticky top-[125px] z-30 bg-background/95 backdrop-blur-sm py-2 -mx-margin-mobile md:mx-0">
            <FilterChips 
              categories={categories} 
              activeCategory={activeCategory} 
              onSelect={handleCategorySelect}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-gutter gap-y-16">
          {products.map((product, index) => (
            <ProductCard key={index} {...product} title={getLocalized(product.title, locale)} />
          ))}
        </div>

        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      </main>
    </div>
  );
}
