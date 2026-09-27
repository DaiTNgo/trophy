import { useEffect } from "react";
import { Outlet, useLoaderData, useLocation, useNavigation, type RouterContextProvider } from "react-router";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { ContactButtons } from "./contact-buttons";
import { ProductDetailSkeleton } from "../product/ProductDetailSkeleton";
import { CategoryListingSkeleton } from "../categories/CategoryListingSkeleton";
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
  const isNavigating = navigation.state === "loading" && Boolean(targetPathname);

  const isNavigatingToProduct =
    isNavigating &&
    Boolean(
      targetPathname &&
        (targetPathname.startsWith("/product/") ||
          /^\/categories\/[^/]+\/products\/[^/]+\/?$/.test(targetPathname)),
    );

  const isCurrentCategoryListing =
    location.pathname === "/products" ||
    location.pathname.startsWith("/collections/") ||
    /^\/categories\/[^/]+\/?$/.test(location.pathname);

  const isTargetCategoryListing = Boolean(
    targetPathname &&
      (targetPathname === "/products" ||
        targetPathname.startsWith("/collections/") ||
        /^\/categories\/[^/]+\/?$/.test(targetPathname)),
  );

  const isNavigatingToCategory =
    isNavigating && isTargetCategoryListing && !isCurrentCategoryListing;

  useEffect(() => {
    if (
      (isNavigatingToProduct || isNavigatingToCategory) &&
      typeof window !== "undefined"
    ) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [isNavigatingToProduct, isNavigatingToCategory]);

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
        {isNavigatingToProduct ? (
          <ProductDetailSkeleton />
        ) : isNavigatingToCategory ? (
          <CategoryListingSkeleton />
        ) : (
          <Outlet />
        )}
      </div>
      <Footer />
      <ContactButtons />
    </div>
  );
}
