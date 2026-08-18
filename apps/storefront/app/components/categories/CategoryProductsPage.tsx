import { getLocalized } from "@/lib/translation";
import type { Route } from "../../routes/+types/categories.$categoryHandle";
import { CategoryProductsListing } from "./CategoryProductsListing";
import { useCategoryListingNavigation } from "./useCategoryListingNavigation";

type CategoryProductsPageProps = {
  loaderData: Route.ComponentProps["loaderData"];
};

export function CategoryProductsPage({
  loaderData,
}: CategoryProductsPageProps) {
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
  const { selectCategory, changePage } =
    useCategoryListingNavigation(activeCategory);
  const listingDescription =
    getLocalized(selectedCategory.description, locale) ||
    (locale === "en"
      ? "Browse products in this category, compare finishes and price points, then open the product detail that matches your event needs."
      : "Xem các sản phẩm trong danh mục này, so sánh hoàn thiện và mức giá, rồi mở chi tiết sản phẩm phù hợp với nhu cầu sự kiện của bạn.");
  const editorialDescription =
    getLocalized(selectedCategory.description, locale) || "";

  return (
    <CategoryProductsListing
      categories={categories}
      selectedCategory={selectedCategory}
      categoryTitle={categoryTitle}
      listingDescription={listingDescription}
      editorialDescription={editorialDescription}
      products={products}
      activeCategory={activeCategory}
      currentPage={currentPage}
      totalPages={totalPages}
      totalItems={totalItems}
      locale={locale}
      onCategorySelect={selectCategory}
      onPageChange={changePage}
    />
  );
}
