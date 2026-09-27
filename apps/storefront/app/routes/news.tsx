import { Link, useSearchParams } from "react-router";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  fetchStorefrontArticles,
  fetchStorefrontArticleCategories,
} from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import Container from "../components/container";
import type { Route } from "./+types/news";

export async function loader({ request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("news", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const url = new URL(request.url);
    const currentPage = Number(url.searchParams.get("page")) || 1;
    const category = url.searchParams.get("category") || undefined;
    const q = url.searchParams.get("q") || undefined;

    const [articlesData, categories] = await Promise.all([
      fetchStorefrontArticles({ page: currentPage, limit: 12, category, q, locale }, backendFetch).catch(
        () => ({ items: [], page: 1, limit: 12, total: 0 }),
      ),
      fetchStorefrontArticleCategories(locale, backendFetch).catch(() => []),
    ]);

    const featuredArticle = currentPage === 1 ? articlesData.items[0] ?? null : null;
    const restArticles = featuredArticle ? articlesData.items.slice(1) : articlesData.items;

    return {
      articles: restArticles,
      featuredArticle,
      categories,
      currentPage: articlesData.page,
      totalPages: Math.max(1, Math.ceil(articlesData.total / articlesData.limit)),
      totalItems: articlesData.total,
      activeCategory: category ?? null,
      searchQuery: q ?? null,
      locale,
    };
  });
}

export function meta() {
  return [
    { title: "Tin tức & Bài viết | TROPHY PRESTIGE" },
    { name: "description", content: "Cập nhật tin tức mới nhất, bài viết chuyên sâu về cúp, bảng vinh danh, huy chương và quà tặng Trophy Prestige." },
  ];
}

const PLACEHOLDER_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 250'%3E%3Crect width='400' height='250' fill='%23f3f4f6'/%3E%3Ctext x='200' y='130' text-anchor='middle' fill='%239ca3af' font-size='14' font-family='sans-serif'%3ETin tức Trophy%3C/text%3E%3C/svg%3E";

function ArticleCard({
  article,
  locale,
}: {
  article: {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImageUrl: string | null;
    featuredImageAlt: string | null;
    publishedAt: number | null;
    featured: boolean;
    categories: Array<{ id: string; name: string; slug: string }>;
    authorName: string | null;
    readingTimeMinutes: number;
  };
  locale: string;
}) {
  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <Link
      to={`/news/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-50">
        <img
          src={article.featuredImageUrl || PLACEHOLDER_IMG}
          alt={article.featuredImageAlt || article.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {article.featured && (
          <span className="inline-block w-fit rounded-full bg-brand-support/10 px-3 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-support">
            {locale === "en" ? "Featured" : "Nổi bật"}
          </span>
        )}
        {article.categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {article.categories.slice(0, 2).map((cat) => (
              <span
                key={cat.id}
                className="inline-block rounded-full bg-gray-100 px-3 py-0.5 text-xs font-medium text-gray-600"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        <h3 className="text-lg font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand-support">
          {article.title}
        </h3>

        {article.excerpt && (
          <p className="line-clamp-2 text-sm leading-relaxed text-gray-500">
            {article.excerpt}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs text-gray-400">
          {article.authorName && (
            <span className="font-medium text-gray-600">{article.authorName}</span>
          )}
          {publishedDate && <time dateTime={new Date(article.publishedAt!).toISOString()}>{publishedDate}</time>}
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {article.readingTimeMinutes} {locale === "en" ? "min read" : "phút đọc"}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function NewsPage({ loaderData }: Route.ComponentProps) {
  const {
    articles,
    featuredArticle,
    categories,
    currentPage,
    totalPages,
    activeCategory,
    locale,
  } = loaderData;

  const [, setSearchParams] = useSearchParams();

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set("page", page.toString());
      return prev;
    });
  };

  const handleCategoryFilter = (catSlug: string) => {
    setSearchParams((prev) => {
      if (catSlug) {
        prev.set("category", catSlug);
      } else {
        prev.delete("category");
      }
      prev.set("page", "1");
      return prev;
    });
  };

  return (
    <div className="bg-gray-50/50">
      <Container className="py-10">

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCategoryFilter("")}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                !activeCategory
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {locale === "en" ? "All" : "Tất cả"}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => handleCategoryFilter(cat.slug)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCategory === cat.slug
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Featured story */}
        {featuredArticle && (
          <Link
            to={`/news/${featuredArticle.slug}`}
            className="group mb-10 grid overflow-hidden rounded-2xl border border-gray-100 bg-white transition-shadow hover:shadow-lg lg:grid-cols-2"
          >
            <div className="relative aspect-[16/9] overflow-hidden bg-gray-50 lg:aspect-auto lg:min-h-[360px]">
              <img
                src={featuredArticle.featuredImageUrl || PLACEHOLDER_IMG}
                alt={featuredArticle.featuredImageAlt || featuredArticle.title}
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col gap-4 p-8 lg:p-10">
              <span className="inline-block w-fit rounded-full bg-brand-support/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-brand-support">
                {locale === "en" ? "Latest" : "Mới nhất"}
              </span>
              <h2 className="font-heading text-3xl uppercase leading-tight tracking-wide text-gray-900 lg:text-4xl">
                {featuredArticle.title}
              </h2>
              {featuredArticle.excerpt && (
                <p className="line-clamp-3 leading-relaxed text-gray-500">{featuredArticle.excerpt}</p>
              )}
              <div className="mt-auto flex items-center gap-4 text-xs text-gray-400">
                {featuredArticle.authorName && (
                  <span className="font-medium text-gray-600">{featuredArticle.authorName}</span>
                )}
                {featuredArticle.publishedAt && (
                  <time dateTime={new Date(featuredArticle.publishedAt).toISOString()}>
                    {new Date(featuredArticle.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </time>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {featuredArticle.readingTimeMinutes} {locale === "en" ? "min read" : "phút đọc"}
                </span>
              </div>
            </div>
          </Link>
        )}

        {/* Articles grid */}
        {!featuredArticle && articles.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {locale === "en" ? "No articles yet" : "Chưa có bài viết"}
            </h2>
            <p className="mt-2 text-gray-500">
              {locale === "en"
                ? "Check back soon for the latest news and updates."
                : "Hãy quay lại sau để xem tin tức mới nhất."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} locale={locale} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true;
                    if (p === 1 || p === totalPages) return true;
                    return Math.abs(p - currentPage) <= 1;
                  })
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => handlePageChange(p as number)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          currentPage === p
                            ? "border border-gray-900 bg-gray-900 text-white"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {p}
                      </button>
                    ),
                  )}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </Container>
    </div>
  );
}
