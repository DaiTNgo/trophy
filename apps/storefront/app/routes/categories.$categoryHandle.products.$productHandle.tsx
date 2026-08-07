import { redirect } from "react-router";
import { fetchStorefrontProduct } from "../lib/api";
import { getLocale } from "../i18n.server";
import { getGenericProductPath } from "../lib/storefront-paths";
import { withStorefrontLoaderLog } from "../lib/observability";
import type { Route } from "./+types/categories.$categoryHandle.products.$productHandle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("legacy-category-product-redirect", request, async () => {
    const locale = getLocale(context);
    const product = await fetchStorefrontProduct(params.productHandle, locale);
    throw redirect(`${getGenericProductPath(product.handle)}${new URL(request.url).search}`);
  }, { categoryHandle: params.categoryHandle, productHandle: params.productHandle });
}

export default function LegacyCategoryProductRedirect() {
  return null;
}
