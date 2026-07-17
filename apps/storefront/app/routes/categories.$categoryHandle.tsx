import { useNavigate, useSearchParams } from "react-router";
import { ProductListingShell } from "@/components/products/ProductListingShell";
import { fetchStorefrontCategories, fetchStorefrontProducts } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { getCategoryPath } from "../lib/storefront-paths";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/categories.$categoryHandle";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const url = new URL(request.url);
  const currentPage = Number(url.searchParams.get("page")) || 1;
  const activeCategory = params.categoryHandle;

  const apiCategories = await fetchStorefrontCategories(locale).catch(() => []);
  const data = await fetchStorefrontProducts({
    category: activeCategory,
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

  if (!selectedCategory) {
    throw new Response("Not Found", { status: 404 });
  }

  const categoryTitle = getLocalized(selectedCategory.name, locale) || activeCategory;

  return {
    categories: allCategories,
    selectedCategory,
    categoryTitle,
    products: data.items,
    activeCategory,
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    totalItems: data.total,
    locale,
  };
}

export default function CategoryProductsPage({
  loaderData,
}: Route.ComponentProps) {
  const {
    categories,
    selectedCategory,
    categoryTitle,
    products,
    activeCategory,
    currentPage,
    totalPages,
    totalItems,
    locale,
  } = loaderData;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const listingDescription =
    getLocalized(selectedCategory.description, locale) ||
    (locale === "en"
      ? "Browse products in this category, compare finishes and price points, then open the product detail that matches your event needs."
      : "Xem các sản phẩm trong danh mục này, so sánh hoàn thiện và mức giá, rồi mở chi tiết sản phẩm phù hợp với nhu cầu sự kiện của bạn.");

  const handleCategorySelect = (categoryHandle: string) => {
    if (!categoryHandle) {
      navigate("/products");
      return;
    }

    navigate(getCategoryPath(categoryHandle));
  };

  const handlePageChange = (page: number) => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set("page", page.toString());
    navigate(`${getCategoryPath(activeCategory)}?${nextSearchParams.toString()}`);
  };

  return (
    <ProductListingShell
      breadcrumbs={[
        { label: locale === "en" ? "Home" : "Trang chủ", href: "/" },
        { label: locale === "en" ? "Categories" : "Danh mục" },
        { label: categoryTitle },
      ]}
      eyebrow={locale === "en" ? "Shop by category" : "Mua theo danh mục"}
      title={categoryTitle}
      description={listingDescription}
      featuredImageSrc={selectedCategory.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={categoryTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      categoryHandle={activeCategory}
      filters={{
        categories,
        activeCategory,
        onSelect: handleCategorySelect,
      }}
      emptyState={{
        title: locale === "en" ? "No products found" : "Chưa có sản phẩm phù hợp",
        description:
          locale === "en"
            ? "Try another category or return to the full catalog."
            : "Hãy thử danh mục khác hoặc quay lại toàn bộ catalog sản phẩm.",
        ctaLabel: locale === "en" ? "View all products" : "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
