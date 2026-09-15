import { useEffect } from "react";
import { Outlet, useLoaderData, useLocation, useNavigation, type RouterContextProvider } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ContactButtons } from "./contact-buttons";
import { ProductDetailSkeleton } from "../product/ProductDetailSkeleton";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  type StorefrontCategory,
  type StorefrontCollection,
} from "../../lib/api";
import { getLocale } from "../../i18n.server";
import { withStorefrontLoaderLog } from "../../lib/observability";
import { getBackendServiceFetch } from "../../lib/backend-fetch.server";
import { TrustBar } from "../home/TrustBar";

export async function loader({ request, context }: { request: Request; context: RouterContextProvider }) {
  return withStorefrontLoaderLog("storefront-layout", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const [categories, collections] = await Promise.all([
      fetchStorefrontCategories(locale, backendFetch).catch(() => [] as StorefrontCategory[]),
      fetchStorefrontCollections(locale, backendFetch).catch(() => [] as StorefrontCollection[]),
    ]);

    return { categories, collections, locale };
  });
}

export default function StorefrontLayout() {
  const { categories, collections, locale } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();

  const targetPathname = navigation.location?.pathname;
  const isNavigatingToProduct =
    navigation.state === "loading" &&
    Boolean(
      targetPathname &&
        (targetPathname.startsWith("/product/") ||
          /^\/categories\/[^/]+\/products\/[^/]+\/?$/.test(targetPathname)),
    );

  useEffect(() => {
    if (isNavigatingToProduct && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isNavigatingToProduct]);

  const effectivePathname =
    isNavigatingToProduct && targetPathname ? targetPathname : location.pathname;
  const isProductDetailRoute =
    effectivePathname.startsWith("/product/") ||
    /^\/categories\/[^/]+\/products\/[^/]+\/?$/.test(effectivePathname);
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
        {isNavigatingToProduct ? <ProductDetailSkeleton /> : <Outlet />}
      </div>
      <Footer />
      <ContactButtons />
    </div>
  );
}
