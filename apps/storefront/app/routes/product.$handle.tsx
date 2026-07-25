import { redirect } from "react-router";
import { fetchStorefrontProduct } from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getCategoryProductPath } from "../lib/storefront-paths";
import type { Route } from "./+types/product.$handle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("product-redirect", request, async () => {
    const locale = getLocale(context);
    const product = await fetchStorefrontProduct(params.handle, locale);
    const primaryCategoryHandle = product.categories[0]?.handle;

    if (!primaryCategoryHandle) {
      throw new Response("Not Found", { status: 404 });
    }

    throw redirect(getCategoryProductPath(primaryCategoryHandle, product.handle));
  }, { productHandle: params.handle });
}

export default function ProductRedirectRoute() {
  return null;
}
