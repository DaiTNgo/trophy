import { Link } from "react-router";
import { Clock, Calendar, ChevronLeft, Package, ArrowRight } from "lucide-react";
import { fetchStorefrontArticle, fetchStorefrontArticles } from "../lib/api";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";
import { getBackendServiceFetch } from "../lib/backend-fetch.server";
import { scanTocFromHtml, type TocEntry } from "../lib/article-toc";
import Container from "../components/container";
import { StickyTableOfContents } from "../components/news/sticky-table-of-contents";
import { SocialShareButtons } from "../components/news/social-share-buttons";
import { useTranslation } from "react-i18next";
import type { Route } from "./+types/news.$slug";

export async function loader({ params, context, request }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("news.$slug", request, async () => {
    const locale = getLocale(context);
    const backendFetch = getBackendServiceFetch(context);
    const article = await fetchStorefrontArticle(params.slug, locale, backendFetch);

    // Related articles: same first category when present, else latest published
    const relatedArticles = await fetchStorefrontArticles(
      article.categories[0]
        ? { category: article.categories[0].slug, limit: 4, locale }
        : { limit: 4, locale },
      backendFetch,
    ).catch(() => ({ items: [] }));

    return {
      article,
      locale,
      tocEntries: scanTocFromHtml(article.contentHtml),
      relatedArticles: relatedArticles.items
        .filter((a) => a.slug !== article.slug)
        .slice(0, 3),
    };
  });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const { article, locale } = loaderData ?? {};
  if (!article) {
    return [{ title: "Article Not Found | TROPHY PRESTIGE" }];
  }
  const _ = locale;

  const title = article.metaTitle || article.title;
  const description = article.metaDescription || article.excerpt || "";
  const ogImage = article.ogImageUrl || article.featuredImageUrl;

  return [
    { title: `${title} | TROPHY PRESTIGE` },
    { name: "description", content: description },
    ogImage ? { property: "og:image", content: ogImage } : null,
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    article.publishedAt ? { property: "article:published_time", content: new Date(article.publishedAt).toISOString() } : null,
    article.updatedAt ? { property: "article:modified_time", content: new Date(article.updatedAt).toISOString() } : null,
    { property: "article:author", content: article.authorName || "TROPHY PRESTIGE" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    ogImage ? { name: "twitter:image", content: ogImage } : null,
    article.canonicalUrl ? { rel: "canonical", href: article.canonicalUrl } : null,
  ].filter(Boolean);
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

export default function NewsDetailPage({ loaderData }: Route.ComponentProps) {
  const { article, locale, tocEntries, relatedArticles } = loaderData;
  const { t } = useTranslation("news");

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt || "",
    datePublished: article.publishedAt ? new Date(article.publishedAt).toISOString() : undefined,
    dateModified: new Date(article.updatedAt).toISOString(),
    author: article.authorName ? { "@type": "Person", name: article.authorName } : undefined,
    image: article.featuredImageUrl || undefined,
    publisher: {
      "@type": "Organization",
      name: "TROPHY PRESTIGE",
    },
    mainEntityOfPage: article.canonicalUrl || "/news/" + article.slug,
  };

  const productLdList = article.linkedProducts.length
    ? article.linkedProducts.map((p) => ({
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.title,
        url: `/product/${p.handle}`,
        image: p.thumbnailUrl || undefined,
        offers:
          p.minPrice !== null
            ? { "@type": "Offer", price: p.minPrice, priceCurrency: "VND", availability: "https://schema.org/InStock" }
            : undefined,
      }))
    : [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {productLdList.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      ))}

      <div className="bg-white">
        <Container className="py-10">
          <div className="flex gap-12">
            {/* Sticky TOC (desktop, only when article has ≥2 headings) */}
            {tocEntries.length >= 2 && (
              <div className="hidden w-60 shrink-0 xl:block">
                <StickyTableOfContents entries={tocEntries} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mx-auto max-w-3xl">
                {/* Article header */}
                <header className="mb-10">
                  {article.categories.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {article.categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/news?category=${cat.slug}`}
                          className="inline-block rounded-full bg-brand-support/10 px-3 py-1 text-xs font-medium text-brand-support transition-colors hover:bg-brand-support/20"
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}

                  <h1 className="text-3xl font-bold leading-tight text-gray-900 lg:text-4xl">
                    {article.title}
                  </h1>

                  {article.excerpt && (
                    <p className="mt-4 text-lg leading-relaxed text-gray-500">
                      {article.excerpt}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-5 border-b border-gray-100 pb-6 text-sm text-gray-400">
                    {article.authorName && (
                      <span className="font-medium text-gray-700">{article.authorName}</span>
                    )}
                    {publishedDate && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        <time dateTime={new Date(article.publishedAt!).toISOString()}>{publishedDate}</time>
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {article.readingTimeMinutes} {locale === "en" ? "min read" : "phút đọc"}
                    </span>
                    <div className="ml-auto">
                      <SocialShareButtons />
                    </div>
                  </div>
                </header>

                {/* Featured image */}
                {article.featuredImageUrl && (
                  <div className="mb-10 overflow-hidden rounded-2xl">
                    <img
                      src={article.featuredImageUrl}
                      alt={article.featuredImageAlt || article.title}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                )}

                {/* Article content */}
                <div
                  className="prose-article overflow-hidden"
                  dangerouslySetInnerHTML={{ __html: article.contentHtml }}
                />

                {/* In-article product callouts */}
                {article.linkedProducts.length > 0 && (
                  <section className="mt-12 border-t border-gray-100 pt-10">
                    <h2 className="mb-6 text-xl font-bold text-gray-900">
                      {t("related_products")}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {article.linkedProducts.map((product) => (
                        <Link
                          key={product.id}
                          to={`/product/${encodeURIComponent(product.handle)}?newsSlug=${encodeURIComponent(article.slug)}`}
                          className="group flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                              {product.thumbnailUrl ? (
                                <img
                                  src={product.thumbnailUrl}
                                  alt={product.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-6 w-6 text-gray-300" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-gray-900 transition-colors group-hover:text-brand-support">
                                {product.title}
                              </p>
                              {product.minPrice !== null && (
                                <p className="mt-0.5 text-sm font-semibold text-brand-support">
                                  {t("from_price")}
                                  {formatPrice(product.minPrice)}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="hidden items-center gap-1 text-sm font-semibold text-brand-support sm:flex">
                            {t("related_products_view")}
                            <ArrowRight className="h-4 w-4" />
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Related articles */}
                {relatedArticles.length > 0 && (
                  <section className="mt-14 border-t border-gray-100 pt-10">
                    <h2 className="mb-6 text-xl font-bold text-gray-900">
                      {locale === "en" ? "Related Articles" : "Bài viết liên quan"}
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {relatedArticles.map((rel) => (
                        <Link
                          key={rel.id}
                          to={`/news/${rel.slug}`}
                          className="group flex flex-col overflow-hidden rounded-xl border border-gray-100 transition-shadow hover:shadow-lg"
                        >
                          <div className="aspect-[16/9] overflow-hidden bg-gray-50">
                            {rel.featuredImageUrl ? (
                              <img
                                src={rel.featuredImageUrl}
                                alt={rel.featuredImageAlt || rel.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                loading="lazy"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package className="h-8 w-8 text-gray-200" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col p-4">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900 transition-colors group-hover:text-brand-support">
                              {rel.title}
                            </h3>
                            <span className="mt-auto pt-3 text-xs text-gray-400">
                              {rel.readingTimeMinutes} {locale === "en" ? "min read" : "phút đọc"}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {/* Back to news */}
                <div className="mt-12 border-t border-gray-100 pt-8">
                  <Link
                    to="/news"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {t("back_to_news")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
    </>
  );
}