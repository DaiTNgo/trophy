import { Outlet, useLoaderData, useLocation } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  type StorefrontCategory,
  type StorefrontCollection,
} from "../../lib/api";
import { getLocaleFromRequest } from "../../lib/locale";
import { withStorefrontLoaderLog } from "../../lib/observability";
import { TrustBar } from "../home/TrustBar";

export async function loader({ request }: { request: Request }) {
  return withStorefrontLoaderLog("storefront-layout", request, async () => {
    const locale = getLocaleFromRequest(request);
    const [categories, collections] = await Promise.all([
      fetchStorefrontCategories(locale).catch(() => [] as StorefrontCategory[]),
      fetchStorefrontCollections(locale).catch(() => [] as StorefrontCollection[]),
    ]);

    return { categories, collections, locale };
  });
}

export default function StorefrontLayout() {
  const { categories, collections, locale } = useLoaderData<typeof loader>();
  const location = useLocation();
  const isProductDetailRoute =
    location.pathname.startsWith("/product/") ||
    /^\/categories\/[^/]+\/products\/[^/]+\/?$/.test(location.pathname);
  const hideCategoryStripOnMobile = isProductDetailRoute;

  return (
    <div className="flex min-h-screen flex-col">
      <TrustBar />
      <Navbar
        categories={categories}
        collections={collections}
        locale={locale}
        hideCategoryStripOnMobile={hideCategoryStripOnMobile}
        disableStickyOnMobile={isProductDetailRoute}
      />
      <div className="flex-1">
        <Outlet />
      </div>
      <Footer />
    </div>
  );
}
