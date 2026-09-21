import { useLoaderData, useSearchParams } from "react-router";
import { ProductDetailLayout } from "../components/product/ProductDetailLayout";
import { useProductDetailState } from "../hooks/use-product-detail-state";
import {
  fetchStorefrontCollections,
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  fetchStorefrontProducts,
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

    const [dynamicFonts, collectionsData, suggestionsData] = await Promise.all([
      product.customization
        ? fetchStorefrontDynamicFonts(backendFetch)
        : Promise.resolve<StorefrontDynamicFont[]>([]),
      collectionParam
        ? fetchStorefrontCollections(locale, backendFetch).catch(() => [] as StorefrontCollection[])
        : Promise.resolve<StorefrontCollection[]>([]),
      fetchStorefrontProducts({
        category: activeCategory?.handle,
        limit: 8,
        locale,
      }, backendFetch).catch(() => ({ items: [], page: 1, limit: 8, total: 0 })),
    ]);

    let parentCrumb: { title: string; path: string } | null = null;
    if (collectionParam) {
      const matchedCollection = collectionsData.find((col) => col.handle === collectionParam);
      if (matchedCollection) {
        parentCrumb = {
          title: getLocalized(matchedCollection.title, locale),
          path: getCollectionPath(matchedCollection.handle),
        };
      }
    }

    if (!parentCrumb && activeCategory) {
      parentCrumb = {
        title: getLocalized(activeCategory.name, locale),
        path: getCategoryPath(activeCategory.handle),
      };
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
      parentCrumb,
    };
  }, { productHandle: params.handle });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = getLocalized(loaderData?.product?.title, loaderData?.locale || "vi") || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, suggestedProducts, locale, activeCategory, parentCrumb } =
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
      parentCrumb={parentCrumb}
    />
  );
}
