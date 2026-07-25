import { ProductListingShell } from "@/components/products/ProductListingShell";
import type { StorefrontProductItem } from "@/lib/api";
import type { CategoryOption } from "@/components/products/FilterChips";

type CategoryProductsListingProps = {
  categories: CategoryOption[];
  selectedCategory: {
    name: unknown;
    description: unknown;
    imageUrl?: string | null;
  };
  categoryTitle: string;
  listingDescription: string;
  products: StorefrontProductItem[];
  activeCategory: string;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  locale: string;
  onCategorySelect: (categoryHandle: string) => void;
  onPageChange: (page: number) => void;
};

export function CategoryProductsListing({
  categories,
  selectedCategory,
  categoryTitle,
  listingDescription,
  products,
  activeCategory,
  currentPage,
  totalPages,
  totalItems,
  locale,
  onCategorySelect,
  onPageChange,
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
      featuredImageSrc={selectedCategory.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={categoryTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      categoryHandle={activeCategory}
      filters={{
        categories,
        activeCategory,
        onSelect: onCategorySelect,
      }}
      emptyState={{
        title: isEnglish ? "No products found" : "Chưa có sản phẩm phù hợp",
        description: isEnglish
          ? "Try another category or return to the full catalog."
          : "Hãy thử danh mục khác hoặc quay lại toàn bộ catalog sản phẩm.",
        ctaLabel: isEnglish ? "View all products" : "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
