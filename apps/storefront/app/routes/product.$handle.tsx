import { useLoaderData, useSearchParams } from "react-router";
import { ProductDetailLayout } from "../components/product/ProductDetailLayout";
import { useProductDetailState } from "../hooks/use-product-detail-state";
import {
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
  fetchStorefrontProducts,
  type StorefrontDynamicFont,
} from "../lib/api";
import { getLocalized } from "../lib/translation";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getLocale } from "../i18n.server";
import { CART_LINE_REVISION_PARAM } from "../lib/cart-revision";
import type { Route } from "./+types/product.$handle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("product-detail", request, async () => {
    const locale = getLocale(context);
    const product = await fetchStorefrontProduct(params.handle, locale);

    const [dynamicFonts, suggestionsData] = await Promise.all([
      product.customization
        ? fetchStorefrontDynamicFonts()
        : Promise.resolve<StorefrontDynamicFont[]>([]),
      fetchStorefrontProducts({
        category: product.categories[0]?.handle,
        limit: 8,
        locale,
      }).catch(() => ({ items: [], page: 1, limit: 8, total: 0 })),
    ]);

    let suggestedProducts = suggestionsData.items
      .filter((item) => item.handle !== product.handle)
      .slice(0, 6);

    // No other product in the same category — fall back to the general catalog.
    if (suggestedProducts.length === 0) {
      const allData = await fetchStorefrontProducts({
        limit: 8,
        locale,
      }).catch(() => ({ items: [], page: 1, limit: 8, total: 0 }));
      suggestedProducts = allData.items
        .filter((item) => item.handle !== product.handle)
        .slice(0, 6);
    }

    return {
      product,
      dynamicFonts,
      suggestedProducts,
      locale,
      activeCategory: product.categories[0] ?? null,
    };
  }, { productHandle: params.handle });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title = getLocalized(loaderData?.product?.title, loaderData?.locale || "vi") || "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, suggestedProducts, locale, activeCategory } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const state = useProductDetailState({
    product,
    dynamicFonts,
    locale: locale as "vi" | "en",
    activeCategory,
    cartLineRevisionId: searchParams.get(CART_LINE_REVISION_PARAM),
  });
  return <ProductDetailLayout state={state} suggestedProducts={suggestedProducts} />;
}
