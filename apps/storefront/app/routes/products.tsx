import { useSearchParams } from "react-router";
import { ProductListingShell } from "@/components/products/ProductListingShell";
import { fetchStorefrontCategories, fetchStorefrontProducts } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/products";

export async function loader({ request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const url = new URL(request.url);
  const activeCategory = url.searchParams.get("category") || "";
  const currentPage = Number(url.searchParams.get("page")) || 1;

  const apiCategories = await fetchStorefrontCategories(locale).catch(() => []);

  const data = await fetchStorefrontProducts({
    category: activeCategory || undefined,
    page: currentPage,
    limit: 24,
    locale,
  });

  const allCategories = [
    { name: locale === "en" ? "All" : "Tất cả", handle: "" },
    ...apiCategories.map((category) => ({
      name: getLocalized(category.name, locale),
      handle: category.handle,
    })),
  ];
  const selectedCategory =
    apiCategories.find((category) => category.handle === activeCategory) ?? null;

  return {
    categories: allCategories,
    selectedCategory,
    products: data.items,
    activeCategory,
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    totalItems: data.total,
    locale,
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const {
    categories,
    selectedCategory,
    products,
    activeCategory,
    currentPage,
    totalPages,
    totalItems,
    locale,
  } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const listingTitle =
    getLocalized(selectedCategory?.name, locale) ||
    (locale === "en" ? "Product Catalog" : "Danh mục sản phẩm");
  const listingDescription =
    getLocalized(selectedCategory?.description, locale) ||
    (locale === "en"
      ? "Browse trophies, plaques, medals, and custom awards by product type. Compare shapes, finishes, and starting prices before opening the product details."
      : "Khám phá cúp, bảng vinh danh, huy chương và quà tặng tùy chỉnh theo từng nhóm sản phẩm. So sánh kiểu dáng, hoàn thiện và giá khởi điểm trước khi xem chi tiết.");

  const handleCategorySelect = (categoryHandle: string) => {
    setSearchParams((prev) => {
      if (categoryHandle) {
        prev.set("category", categoryHandle);
      } else {
        prev.delete("category");
      }
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
    <ProductListingShell
      breadcrumbs={[
        { label: locale === "en" ? "Home" : "Trang chủ", href: "/" },
        { label: locale === "en" ? "Products" : "Sản phẩm" },
      ]}
      eyebrow={locale === "en" ? "Shop by product" : "Mua theo danh mục"}
      title={listingTitle}
      description={listingDescription}
      featuredImageSrc={selectedCategory?.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={listingTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      filters={{
        categories,
        activeCategory,
        onSelect: handleCategorySelect,
      }}
      emptyState={{
        title: locale === "en" ? "No products found" : "Chưa có sản phẩm phù hợp",
        description:
          locale === "en"
            ? "Try another product category or return to the full catalog."
            : "Hãy thử danh mục khác hoặc quay lại toàn bộ catalog sản phẩm.",
        ctaLabel: locale === "en" ? "View all products" : "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
