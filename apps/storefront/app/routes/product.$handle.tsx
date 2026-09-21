import { useLoaderData, useSearchParams } from "react-router";
import { ProductDetailLayout } from "../components/product/ProductDetailLayout";
import { useProductDetailState } from "../hooks/use-product-detail-state";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  fetchStorefrontProducts,
  type StorefrontCategory,
  type StorefrontCollection,
  type StorefrontDynamicFont,
} from "../lib/api";
import { getLocalized } from "../lib/translation";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getLocale } from "../i18n.server";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import { getCategoryPath, getCollectionPath } from "../lib/storefront-paths";
import { CART_LINE_REVISION_PARAM } from "../lib/cart-revision";
import type { Route } from "./+types/product.$handle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("product-detail", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const product = await fetchStorefrontProduct(params.handle, locale, backendFetch);

    const url = new URL(request.url);
    const categoryParam = url.searchParams.get("category");
    const collectionParam = url.searchParams.get("collection");

    const activeCategory =
      (categoryParam ? product.categories.find((c) => c.handle === categoryParam) : null) ??
      product.categories[0] ??
      null;

    const [dynamicFonts, collectionsData, categoriesData, suggestionsData] = await Promise.all([
      product.customization
        ? fetchStorefrontDynamicFonts(backendFetch)
        : Promise.resolve<StorefrontDynamicFont[]>([]),
      collectionParam
        ? fetchStorefrontCollections(locale, backendFetch).catch(() => [] as StorefrontCollection[])
        : Promise.resolve<StorefrontCollection[]>([]),
      categoryParam && !product.categories.some((c) => c.handle === categoryParam)
        ? fetchStorefrontCategories(locale, backendFetch).catch(() => [] as StorefrontCategory[])
        : Promise.resolve<StorefrontCategory[]>([]),
      fetchStorefrontProducts({
        category: activeCategory?.handle,
        limit: 8,
        locale,
      }, backendFetch).catch(() => ({ items: [], page: 1, limit: 8, total: 0 })),
    ]);

    const matchedCategory =
      (categoryParam ? product.categories.find((c) => c.handle === categoryParam) : null) ??
      (categoryParam ? categoriesData.find((c) => c.handle === categoryParam) : null);

    const matchedCollection = collectionParam
      ? collectionsData.find((col) => col.handle === collectionParam) ?? null
      : null;

    const breadcrumbItems: Array<{ title: string; path: string }> = [];

    const keys = Array.from(url.searchParams.keys());
    const isCollectionFirst =
      keys.indexOf("collection") !== -1 &&
      (keys.indexOf("category") === -1 || keys.indexOf("collection") < keys.indexOf("category"));

    if (isCollectionFirst) {
      if (matchedCollection) {
        breadcrumbItems.push({
          title: getLocalized(matchedCollection.title, locale),
          path: getCollectionPath(matchedCollection.handle),
        });
      }
      if (matchedCategory) {
        breadcrumbItems.push({
          title: getLocalized(matchedCategory.name, locale),
          path: matchedCollection
            ? `${getCollectionPath(matchedCollection.handle)}?category=${encodeURIComponent(matchedCategory.handle)}`
            : getCategoryPath(matchedCategory.handle),
        });
      }
    } else {
      if (matchedCategory) {
        breadcrumbItems.push({
          title: getLocalized(matchedCategory.name, locale),
          path: getCategoryPath(matchedCategory.handle),
        });
      }
      if (matchedCollection) {
        breadcrumbItems.push({
          title: getLocalized(matchedCollection.title, locale),
          path: matchedCategory
            ? `${getCategoryPath(matchedCategory.handle)}?collection=${encodeURIComponent(matchedCollection.handle)}`
            : getCollectionPath(matchedCollection.handle),
        });
      }
    }

    if (breadcrumbItems.length === 0) {
      if (product.categories[0]) {
        breadcrumbItems.push({
          title: getLocalized(product.categories[0].name, locale),
          path: getCategoryPath(product.categories[0].handle),
        });
      } else {
        breadcrumbItems.push({
          title: locale === "en" ? "Collections" : "Bộ sưu tập",
          path: "/products",
        });
      }
    }

    let suggestedProducts = suggestionsData.items
      .filter((item) => item.handle !== product.handle)
      .slice(0, 6);

    // No other product in the same category — fall back to the general catalog.
    if (suggestedProducts.length === 0) {
      const allData = await fetchStorefrontProducts({
        limit: 8,
        locale,
      }, backendFetch).catch(() => ({ items: [], page: 1, limit: 8, total: 0 }));
      suggestedProducts = allData.items
        .filter((item) => item.handle !== product.handle)
        .slice(0, 6);
    }

    return {
      product,
      dynamicFonts,
      suggestedProducts,
      locale,
      activeCategory,
      breadcrumbItems,
    };
  }, { productHandle: params.handle });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = getLocalized(loaderData?.product?.title, loaderData?.locale || "vi") || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, suggestedProducts, locale, activeCategory, breadcrumbItems } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const state = useProductDetailState({
    product,
    dynamicFonts,
    locale: locale as "vi" | "en",
    activeCategory,
    cartLineRevisionId: searchParams.get(CART_LINE_REVISION_PARAM),
  });
  return (
    <ProductDetailLayout
      state={state}
      suggestedProducts={suggestedProducts}
      breadcrumbItems={breadcrumbItems}
    />
  );
}
