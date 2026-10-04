import { redirect } from "react-router";
import { CategoryProductsPage as CategoryProductsPageView } from "@/components/categories/CategoryProductsPage";
import {
  fetchStorefrontCategories,
  fetchStorefrontCategoryProducts,
} from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import { getLocalized } from "../lib/translation";
import type { Route } from "./+types/categories.$categoryHandle";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog(
    "category-products",
    request,
    async () => {
      const url = new URL(request.url);
      const activeCategory = params.categoryHandle;

      if (activeCategory === "san-pham-tuy-chinh") {
        throw redirect(`/categories/customization${url.search}`, 301);
      }

      const locale = getLocale(context);
      const backendFetch = getBackendServiceFetch(context);
      const currentPage = Number(url.searchParams.get("page")) || 1;
      const activeCollection = url.searchParams.get("collection") || "";

      const apiCategories = await fetchStorefrontCategories(
        locale,
        backendFetch,
      ).catch(() => []);

      const selectedCategory =
        apiCategories.find((category) => category.handle === activeCategory) ??
        null;

      if (!selectedCategory) {
        throw new Response("Not Found", { status: 404 });
      }

      const data = await fetchStorefrontCategoryProducts(
        activeCategory,
        {
          collection: activeCollection || undefined,
          page: currentPage,
          limit: 24,
          locale,
        },
        backendFetch,
      );

      const categoryTitle =
        getLocalized(selectedCategory.name, locale) || activeCategory;

      const availableCollections = data.availableCollections ?? [];
      const collectionFilters = [
        {
          name:
            locale === "en"
              ? `All ${categoryTitle}`
              : `Tất cả ${categoryTitle}`,
          handle: "",
        },
        ...availableCollections.map((col) => ({
          name: getLocalized(col.title, locale) || col.handle,
          handle: col.handle,
        })),
      ];

      return {
        collectionFilters,
        activeCollection,
        selectedCategory,
        categoryTitle,
        products: data.items,
        activeCategory,
        currentPage: data.page,
        totalPages: Math.max(1, Math.ceil(data.total / data.limit)),
        totalItems: data.total,
        locale,
      };
    },
    { categoryHandle: params.categoryHandle },
  );
}

export default function CategoryProductsPage({
  loaderData,
}: Route.ComponentProps) {
  return <CategoryProductsPageView loaderData={loaderData} />;
}
