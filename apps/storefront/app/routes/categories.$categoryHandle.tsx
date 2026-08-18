import { CategoryProductsPage as CategoryProductsPageView } from "@/components/categories/CategoryProductsPage";
import { fetchStorefrontCategories, fetchStorefrontProducts } from "../lib/api";
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
      const locale = getLocale(context);
      const backendFetch = getBackendServiceFetch(context);
      const url = new URL(request.url);
      const currentPage = Number(url.searchParams.get("page")) || 1;
      const activeCategory = params.categoryHandle;

      const apiCategories = await fetchStorefrontCategories(locale, backendFetch).catch(
        () => [],
      );
      const data = await fetchStorefrontProducts({
        category: activeCategory,
        page: currentPage,
        limit: 24,
        locale,
      }, backendFetch);

      const allCategories = [
        { name: locale === "en" ? "All" : "Tất cả", handle: "" },
        ...apiCategories.map((category) => ({
          name: getLocalized(category.name, locale),
          handle: category.handle,
        })),
      ];
      const selectedCategory =
        apiCategories.find((category) => category.handle === activeCategory) ??
        null;

      if (!selectedCategory) {
        throw new Response("Not Found", { status: 404 });
      }

      const categoryTitle =
        getLocalized(selectedCategory.name, locale) || activeCategory;

      return {
        categories: allCategories,
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
