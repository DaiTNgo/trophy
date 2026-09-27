import { ProductListingShell } from "@/components/products/ProductListingShell";
import type { StorefrontProductItem } from "@/lib/api";
import type { CategoryOption } from "@/components/products/FilterChips";

type CategoryProductsListingProps = {
  collectionFilters: CategoryOption[];
  activeCollection?: string;
  selectedCategory: {
    name: unknown;
    description: unknown;
    imageUrl?: string | null;
  };
  categoryTitle: string;
  listingDescription: string;
  editorialDescription?: string;
  products: StorefrontProductItem[];
  activeCategory: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  locale: string;
  onCollectionSelect: (collectionHandle: string) => void;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

export function CategoryProductsListing({
  collectionFilters,
  activeCollection,
  selectedCategory,
  categoryTitle,
  listingDescription,
  editorialDescription,
  products,
  activeCategory,
  currentPage,
  totalPages,
  totalItems,
  locale,
  onCollectionSelect,
  onPageChange,
  isLoading = false,
}: CategoryProductsListingProps) {
  const isEnglish = locale === "en";

  return (
    <ProductListingShell
      breadcrumbs={[
        { label: isEnglish ? "Home" : "Trang chủ", href: "/" },
        { label: isEnglish ? "Categories" : "Danh mục" },
        { label: categoryTitle },
      ]}
      eyebrow={isEnglish ? "Shop by category" : "Mua theo danh mục"}
      title={categoryTitle}
      description={listingDescription}
      editorialDescription={editorialDescription}
      featuredImageSrc={selectedCategory.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={categoryTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      categoryHandle={activeCategory}
      collectionHandle={activeCollection}
      sourceContext="category"
      filters={{
        title: isEnglish ? "Filter By Interest" : "Lọc theo dịp / sở thích",
        categories: collectionFilters,
        activeCategory: activeCollection,
        onSelect: onCollectionSelect,
      }}
      emptyState={{
        title: isEnglish ? "No products found" : "Chưa có sản phẩm phù hợp",
        description: isEnglish
          ? "Try another collection or clear the filter to view all products in this category."
          : "Hãy thử bộ sưu tập khác hoặc xóa bộ lọc để xem tất cả sản phẩm trong danh mục này.",
        ctaLabel: isEnglish
          ? "View all in this category"
          : "Xem tất cả trong danh mục này",
        ctaHref: `/categories/${activeCategory}`,
      }}
      isLoading={isLoading}
      hideHero={true}
      showResultCount={false}
    />
  );
}
