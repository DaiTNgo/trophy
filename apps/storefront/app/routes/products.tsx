import { useSearchParams } from "react-router";
import { ProductListingShell } from "../components/products/ProductListingShell";
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
    limit: 12,
    locale,
  });

  const allCategories = [
    { name: "Tất cả", handle: "" },
    ...apiCategories.map((c) => ({ name: getLocalized(c.name, locale), handle: c.handle })),
  ];

  return {
    categories: allCategories,
    products: data.items,
    activeCategory,
    currentPage: data.page,
    totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
    totalItems: data.total,
    locale,
  };
}

export default function Products({ loaderData }: Route.ComponentProps) {
  const { categories, products, activeCategory, currentPage, totalPages, totalItems, locale } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();

  const handleCategorySelect = (category: string) => {
    setSearchParams((prev) => {
      if (category) {
        prev.set("category", category);
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
        { label: "Trang chủ", href: "/" },
        { label: "Sản phẩm" },
      ]}
      eyebrow="Danh mục nổi bật"
      title="Danh sách sản phẩm"
      description="Khám phá các mẫu cúp, bảng vinh danh và quà tặng cá nhân hóa theo đúng tinh thần storefront reference: tiêu đề đậm, bộ lọc rõ ràng và lưới sản phẩm ưu tiên khả năng quét nhanh."
      featuredImageSrc={products[0]?.thumbnail}
      featuredImageAlt={products[0] ? getLocalized(products[0].title, locale) : "Sản phẩm nổi bật"}
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
        title: "Chưa có sản phẩm phù hợp",
        description: "Hiện chưa có sản phẩm cho bộ lọc này. Hãy quay lại toàn bộ danh mục để xem các mẫu đang mở bán.",
        ctaLabel: "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
