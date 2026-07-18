import { useSearchParams } from "react-router";
import { ProductListingShell } from "../components/products/ProductListingShell";
import { fetchStorefrontCollectionProducts, fetchStorefrontCollections } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/collections.$handle";

export async function loader({ params, request }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("collection", request, async () => {
    const locale = getLocaleFromRequest(request);
    const url = new URL(request.url);
    const currentPage = Number(url.searchParams.get("page")) || 1;

    const [data, collections] = await Promise.all([
      fetchStorefrontCollectionProducts(params.handle, {
        page: currentPage,
        limit: 24,
        locale,
      }),
      fetchStorefrontCollections(locale).catch(() => []),
    ]);
    const collection = collections.find((item) => item.handle === params.handle) ?? null;

    return {
      collectionHandle: params.handle,
      collection,
      products: data.items,
      currentPage: data.page,
      totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
      totalItems: data.total,
      locale,
    };
  }, { collectionHandle: params.handle });
}

export default function CollectionPage({ loaderData }: Route.ComponentProps) {
  const { collectionHandle, collection, products, currentPage, totalPages, totalItems, locale } = loaderData;
  const [, setSearchParams] = useSearchParams();
  const fallbackTitle = collectionHandle.replace(/-/g, " ");
  const collectionTitle = getLocalized(collection?.title, locale) || fallbackTitle;
  const collectionDescription = getLocalized(collection?.description, locale);

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
        { label: "Sản phẩm", href: "/products" },
        { label: collectionTitle },
      ]}
      eyebrow="Bộ sưu tập"
      title={collectionTitle}
      description={
        collectionDescription ||
        "Trang bộ sưu tập dùng cùng listing UI với danh mục sản phẩm, nhưng tập trung vào nhóm sản phẩm theo chủ đề hoặc chiến dịch merch cụ thể."
      }
      featuredImageSrc={collection?.imageUrl ?? products[0]?.thumbnail}
      featuredImageAlt={collectionTitle}
      products={products}
      locale={locale}
      totalItems={totalItems}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
      emptyState={{
        title: "Bộ sưu tập đang trống",
        description: "Chưa có sản phẩm khả dụng trong bộ sưu tập này. Hãy quay lại trang sản phẩm để xem toàn bộ catalog đang mở bán.",
        ctaLabel: "Xem tất cả sản phẩm",
        ctaHref: "/products",
      }}
    />
  );
}
