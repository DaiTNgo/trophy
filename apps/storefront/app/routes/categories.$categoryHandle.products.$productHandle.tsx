import { useLoaderData, useSearchParams } from "react-router";
import { ProductDetailLayout } from "../components/product/ProductDetailLayout";
import { useProductDetailState } from "../hooks/use-product-detail-state";
import {
  fetchStorefrontDynamicFonts,
  fetchStorefrontProduct,
} from "../lib/api";
import { getLocalized } from "../lib/translation";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getLocale } from "../i18n.server";
import { CART_LINE_REVISION_PARAM } from "../lib/cart-revision";
import type { Route } from "./+types/categories.$categoryHandle.products.$productHandle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog(
    "category-product-detail",
    request,
    async () => {
      const locale = getLocale(context);
      const product = await fetchStorefrontProduct(
        params.productHandle,
        locale,
      );
      const activeCategory = product.categories.find(
        (category) => category.handle === params.categoryHandle,
      );

      if (!activeCategory) {
        throw new Response("Not Found", { status: 404 });
      }

      const dynamicFonts = product.customization
        ? await fetchStorefrontDynamicFonts()
        : [];
      return { product, dynamicFonts, locale, activeCategory };
    },
    {
      categoryHandle: params.categoryHandle,
      productHandle: params.productHandle,
    },
  );
}

export function meta({ loaderData }: Route.MetaArgs) {
  const title =
    getLocalized(loaderData?.product?.title, loaderData?.locale || "vi") ||
    "Sản Phẩm";
  return [{ title: `${title} | TROPHY PRESTIGE` }];
}

export default function ProductDetail() {
  const { product, dynamicFonts, locale, activeCategory } =
    useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const state = useProductDetailState({
    product,
    dynamicFonts,
    locale: locale as "vi" | "en",
    activeCategory,
    cartLineRevisionId: searchParams.get(CART_LINE_REVISION_PARAM),
  });

  return <ProductDetailLayout state={state} />;
}
