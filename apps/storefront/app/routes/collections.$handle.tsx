import { useSearchParams } from "react-router";
import { ProductListingShell } from "../components/products/ProductListingShell";
import { fetchStorefrontCollectionProducts, fetchStorefrontCollections } from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/collections.$handle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("collection", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const url = new URL(request.url);
    const currentPage = Number(url.searchParams.get("page")) || 1;
    const currentCategory = url.searchParams.get("category") || "";

    const [data, collections] = await Promise.all([
      fetchStorefrontCollectionProducts(params.handle, {
        page: currentPage,
        limit: 24,
        locale,
        category: currentCategory || undefined,
      }, backendFetch),
      fetchStorefrontCollections(locale, backendFetch).catch(() => []),
    ]);
    const collection = collections.find((item) => item.handle === params.handle) ?? null;

    return {
      collectionHandle: params.handle,
      collection,
      products: data.items,
      availableCategories: data.availableCategories ?? [],
      activeCategory: currentCategory,
      currentPage: data.page,
      totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
      totalItems: data.total,
      locale,
    };
  }, { collectionHandle: params.handle });
}

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const {
    collectionHandle,
    collection,
    products,
    availableCategories,
    activeCategory,
    currentPage,
    totalPages,
    totalItems,
    locale,
  } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const fallbackTitle = collectionHandle.replace(/-/g, " ");
  const collectionTitle = getLocalized(collection?.title, locale) || fallbackTitle;
  const collectionDescription = getLocalized(collection?.description, locale);

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set("page", page.toString());
      return prev;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

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

  const categoryOptions = [
    { name: locale === "en" ? "All" : "Tất cả", handle: "" },
    ...availableCategories.map((c) => ({
      name: getLocalized(c.name, locale),
      handle: c.handle,
    })),
  ];

  return (
    <ProductListingShell
      breadcrumbs={[
        { label: locale === "en" ? "Home" : "Trang chủ", href: "/" },
        { label: locale === "en" ? "Products" : "Sản phẩm", href: "/products" },
        { label: collectionTitle },
      ]}
      eyebrow={locale === "en" ? "Collection" : "Bộ sưu tập"}
      title={collectionTitle}
      description={
        collectionDescription ||
        (locale === "en"
          ? "Browse specialized products and awards in this collection."
          : "Khám phá các mẫu cúp, bảng vinh danh và tặng phẩm vinh danh trong bộ sưu tập này.")
      }
      featuredImageSrc={collection?.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={collectionTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      filters={
        availableCategories.length > 0
          ? {
              categories: categoryOptions,
              activeCategory,
              onSelect: handleCategorySelect,
            }
          : undefined
      }
      emptyState={{
        title: locale === "en" ? "Collection is empty" : "Bộ sưu tập đang trống",
        description:
          locale === "en"
            ? "No products found for the selected category. Check out our other categories or view the full catalog."
            : "Chưa có sản phẩm khả dụng cho mục đã chọn. Hãy chọn danh mục khác hoặc quay lại trang sản phẩm để xem toàn bộ catalog.",
        ctaLabel: locale === "en" ? "View all products" : "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
