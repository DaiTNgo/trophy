import { useNavigation } from "react-router";
import { getLocalized } from "@/lib/translation";
import { getActiveCategoryHandle } from "@/lib/storefront-paths";
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

  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";
  const targetPathname = navigation.location?.pathname;
  const targetCategoryHandle = targetPathname
    ? targetPathname === "/products"
      ? ""
      : getActiveCategoryHandle(targetPathname)
    : null;

  const isCategoryTransition =
    isNavigating &&
    targetCategoryHandle !== null &&
    targetCategoryHandle !== activeCategory;
  const isPageTransition =
    isNavigating && Boolean(navigation.location?.search);

  const isLoading =
    isNavigating &&
    (isCategoryTransition ||
      isPageTransition ||
      Boolean(targetPathname?.startsWith("/categories")));

  const targetCategory =
    targetCategoryHandle !== null
      ? categories.find((cat) => cat.handle === targetCategoryHandle)
      : null;

  const displayCategoryTitle =
    isCategoryTransition && targetCategory
      ? targetCategory.name
      : categoryTitle;

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
      categoryTitle={displayCategoryTitle}
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
      isLoading={isLoading}
    />
  );
}
