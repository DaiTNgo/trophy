import { useNavigation } from "react-router";
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
    collectionFilters,
    activeCollection,
    selectedCategory,
    categoryTitle,
    products,
    activeCategory,
    currentPage,
    totalPages,
    totalItems,
    locale,
  } = loaderData;
  const { selectCollection, changePage } =
    useCategoryListingNavigation(activeCategory);

  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const isLoading =
    isNavigating &&
    Boolean(navigation.location?.pathname.startsWith("/categories"));

  const listingDescription =
    getLocalized(selectedCategory.description, locale) ||
    (locale === "en"
      ? "Browse products in this category, compare finishes and price points, then open the product detail that matches your event needs."
      : "Xem các sản phẩm trong danh mục này, so sánh hoàn thiện và mức giá, rồi mở chi tiết sản phẩm phù hợp với nhu cầu sự kiện của bạn.");
  const editorialDescription =
    getLocalized(selectedCategory.description, locale) || "";

  return (
    <CategoryProductsListing
      collectionFilters={collectionFilters}
      activeCollection={activeCollection}
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
      onCollectionSelect={selectCollection}
      onPageChange={changePage}
      isLoading={isLoading}
    />
  );
}
