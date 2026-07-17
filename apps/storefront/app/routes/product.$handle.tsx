import { redirect } from "react-router";
import { fetchStorefrontProduct } from "../lib/api";
import { getLocaleFromRequest } from "../lib/locale";
import { getCategoryProductPath } from "../lib/storefront-paths";
import type { Route } from "./+types/product.$handle";

export async function loader({ params, request }: Route.LoaderArgs) {
  const locale = getLocaleFromRequest(request);
  const product = await fetchStorefrontProduct(params.handle, locale);
  const primaryCategoryHandle = product.categories[0]?.handle;

  if (!primaryCategoryHandle) {
    throw new Response("Not Found", { status: 404 });
  }

  throw redirect(getCategoryProductPath(primaryCategoryHandle, product.handle));
}

export default function ProductRedirectRoute() {
  return null;
}
