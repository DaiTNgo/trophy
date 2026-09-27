import { and, asc, desc, eq, inArray, like, lte, or, sql, count as drizzleCount } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import {
  articleCategories,
  articleCategoryLinks,
  articleProductLinks,
  articles,
  catalogTranslations,
  products,
  productVariants,
  users,
} from "../../db/schema";
import {
  flipDueScheduledArticles,
  markRowsPublished,
} from "../../lib/article-publish";
import { hydrateAndResolveTranslations } from "../../lib/catalog-translation";
import type { AppEnv } from "../../lib/env";
import { DEFAULT_LOCALE, localeSchema, type Locale } from "../../lib/locale";
import { toAbsoluteAssetUrl } from "../../lib/url";

// ─── Validation Schemas ────────────────────────────────────────────────────────

const listQuerySchema = v.object({
  page: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
    "1",
  ),
  limit: v.optional(
    v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1), v.maxValue(50)),
    "12",
  ),
  category: v.optional(v.pipe(v.string(), v.trim())),
  q: v.optional(v.pipe(v.string(), v.trim())),
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
});

const detailQuerySchema = v.object({
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
});

// ─── Shared DTO ────────────────────────────────────────────────────────────────

type ArticleListItem = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  status: string;
  featured: boolean;
  publishedAt: number | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  authorName: string | null;
  readingTimeMinutes: number;
};

/** Rough estimate: ~200 words per minute reading speed from plain HTML */
function estimateReadingTime(html: string): number {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  const words = text.trim().split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export const storefrontArticlesRoute = new Hono<AppEnv>()

  // GET /api/storefront/articles/categories
  .get("/categories", async (c) => {
    const db = getDb(c.env);
    const now = new Date();
    const parsedQuery = v.safeParse(v.object({ locale: v.optional(localeSchema, DEFAULT_LOCALE) }), c.req.query());
    const locale = parsedQuery.success ? parsedQuery.output.locale : DEFAULT_LOCALE;

    // Only categories that have at least one published article
    const rows = await db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        description: articleCategories.description,
        displayOrder: articleCategories.displayOrder,
        articleCount: drizzleCount(articles.id),
      })
      .from(articleCategories)
      .leftJoin(
        articleCategoryLinks,
        eq(articleCategories.id, articleCategoryLinks.categoryId),
      )
      .leftJoin(
        articles,
        and(
          eq(articleCategoryLinks.articleId, articles.id),
          inArray(articles.status, ["published", "scheduled"]),
          lte(articles.publishedAt, now),
        ),
      )
      .groupBy(articleCategories.id, articleCategories.name, articleCategories.slug, articleCategories.description, articleCategories.displayOrder)
      .having(({ articleCount }) => sql`${articleCount} > 0`)
      .orderBy(asc(articleCategories.displayOrder), asc(articleCategories.name))
      .all();

    const items = rows.map((r) => ({ id: r.id, name: r.name, slug: r.slug, description: r.description, displayOrder: r.displayOrder, articleCount: r.articleCount }));

    await hydrateAndResolveTranslations(
      db,
      "article_category",
      items,
      (item) => item.id,
      [
        { fieldName: "name", objectKey: "name" },
        { fieldName: "description", objectKey: "description" },
      ],
      [
        { fieldName: "name", objectKey: "name" },
        { fieldName: "description", objectKey: "description" },
      ],
      locale,
    );

    return c.json({ items }, 200);
  })

  // GET /api/storefront/articles
  .get("/", async (c) => {
    const db = getDb(c.env);
    const parsedQuery = v.safeParse(listQuerySchema, c.req.query());
    const query = parsedQuery.success
      ? parsedQuery.output
      : { page: 1, limit: 12, category: undefined, q: undefined, locale: DEFAULT_LOCALE };
    const locale: Locale = query.locale ?? DEFAULT_LOCALE;

    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 12);
    const offset = (page - 1) * limit;
    const now = new Date();

    // Only show live articles (published, or scheduled whose time has arrived) where publishedAt <= now
    const baseConditions = [
      inArray(articles.status, ["published", "scheduled"]),
      lte(articles.publishedAt, now),
    ];

    if (query.q) {
      const translatedIds = await db
        .select({ articleId: catalogTranslations.ownerKey })
        .from(catalogTranslations)
        .where(
          and(
            eq(catalogTranslations.ownerType, "article"),
            like(catalogTranslations.value, `%${query.q}%`),
          ),
        )
        .all();
      baseConditions.push(
        (translatedIds.length
          ? or(
              like(articles.title, `%${query.q}%`),
              like(articles.excerpt, `%${query.q}%`),
              inArray(articles.id, translatedIds.map((t) => t.articleId)),
            )
          : or(
              like(articles.title, `%${query.q}%`),
              like(articles.excerpt, `%${query.q}%`),
            )) as any,
      );
    }

    if (query.category) {
      const cat = await db
        .select({ id: articleCategories.id })
        .from(articleCategories)
        .where(eq(articleCategories.slug, query.category))
        .get();
      if (cat) {
        const articleIdsInCat = await db
          .select({ articleId: articleCategoryLinks.articleId })
          .from(articleCategoryLinks)
          .where(eq(articleCategoryLinks.categoryId, cat.id))
          .all();
        if (articleIdsInCat.length === 0) {
          return c.json({ items: [], page, limit, total: 0 }, 200);
        }
        baseConditions.push(
          inArray(articles.id, articleIdsInCat.map((r) => r.articleId)),
        );
      } else {
        return c.json({ items: [], page, limit, total: 0 }, 200);
      }
    }

    const where = and(...baseConditions);

    const [rows, countRow] = await Promise.all([
      db
        .select({
          article: articles,
          authorName: users.name,
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(where)
        .orderBy(desc(articles.featured), desc(articles.publishedAt), asc(articles.id))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(where)
        .get(),
    ]);

    const total = countRow?.count ?? 0;

    // Auto-publish scheduled articles whose time has arrived (cron only runs in prod)
    const flippedIds = await flipDueScheduledArticles(
      db,
      rows.map((r) => ({
        id: r.article.id,
        status: r.article.status,
        publishedAt: r.article.publishedAt,
      })),
      now,
    );
    markRowsPublished(rows, flippedIds);

    // Fetch category tags for the listed articles
    const articleIds = rows.map((r) => r.article.id);
    const catLinks = articleIds.length
      ? await db
          .select({
            articleId: articleCategoryLinks.articleId,
            catId: articleCategories.id,
            catName: articleCategories.name,
            catSlug: articleCategories.slug,
          })
          .from(articleCategoryLinks)
          .innerJoin(articleCategories, eq(articleCategoryLinks.categoryId, articleCategories.id))
          .where(inArray(articleCategoryLinks.articleId, articleIds))
          .all()
      : [];

    const catsByArticle = new Map<string, Array<{ id: string; name: string; slug: string }>>();
    for (const cl of catLinks) {
      if (!catsByArticle.has(cl.articleId)) catsByArticle.set(cl.articleId, []);
      catsByArticle.get(cl.articleId)!.push({ id: cl.catId, name: cl.catName, slug: cl.catSlug });
    }

    const items: ArticleListItem[] = rows.map((r) => ({
      id: r.article.id,
      title: r.article.title,
      slug: r.article.slug,
      excerpt: r.article.excerpt,
      featuredImageUrl: r.article.featuredImageUrl,
      featuredImageAlt: r.article.featuredImageAlt,
      status: r.article.status,
      featured: r.article.featured,
      publishedAt: r.article.publishedAt ? r.article.publishedAt.getTime() : null,
      categories: catsByArticle.get(r.article.id) ?? [],
      authorName: r.authorName,
      readingTimeMinutes: estimateReadingTime(r.article.contentHtml),
    }));

    if (items.length > 0) {
      // Resolve article title/excerpt per locale
      await hydrateAndResolveTranslations(
        db,
        "article",
        items,
        (item) => item.id,
        [
          { fieldName: "title", objectKey: "title" },
          { fieldName: "excerpt", objectKey: "excerpt" },
        ],
        [
          { fieldName: "title", objectKey: "title" },
          { fieldName: "excerpt", objectKey: "excerpt" },
        ],
        locale,
      );

      // Resolve category names per locale
      for (const item of items) {
        if (item.categories.length === 0) continue;
        await hydrateAndResolveTranslations(
          db,
          "article_category",
          item.categories,
          (category) => category.id,
          [{ fieldName: "name", objectKey: "name" }],
          [{ fieldName: "name", objectKey: "name" }],
          locale,
        );
      }
    }

    return c.json({ items, page, limit, total }, 200);
  })

  // GET /api/storefront/articles/:slug
  .get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const db = getDb(c.env);
    const now = new Date();
    const parsedQuery = v.safeParse(detailQuerySchema, c.req.query());
    const locale: Locale = parsedQuery.success ? parsedQuery.output.locale : DEFAULT_LOCALE;

    const row = await db
      .select({
        article: articles,
        authorName: users.name,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(
        and(
          eq(articles.slug, slug),
          inArray(articles.status, ["published", "scheduled"]),
          lte(articles.publishedAt, now),
        ),
      )
      .get();

    if (!row) return c.json({ error: "Not found" }, 404);

    // Auto-publish a scheduled article whose time has arrived (cron only runs in prod)
    const flippedIds = await flipDueScheduledArticles(
      db,
      [
        {
          id: row.article.id,
          status: row.article.status,
          publishedAt: row.article.publishedAt,
        },
      ],
      now,
    );
    markRowsPublished([row], flippedIds);

    // Increment view count (fire-and-forget, non-blocking)
    const updateViewPromise = db
      .update(articles)
      .set({ viewCount: sql`${articles.viewCount} + 1` })
      .where(eq(articles.id, row.article.id))
      .run()
      .catch(() => {});

    try {
      if (c.executionCtx?.waitUntil) {
        c.executionCtx.waitUntil(updateViewPromise);
      }
    } catch {
      // Ignore execution context errors
    }

    // Fetch categories and linked products in parallel
    const [catLinks, prodLinks] = await Promise.all([
      db
        .select({
          catId: articleCategories.id,
          catName: articleCategories.name,
          catSlug: articleCategories.slug,
        })
        .from(articleCategoryLinks)
        .innerJoin(articleCategories, eq(articleCategoryLinks.categoryId, articleCategories.id))
        .where(eq(articleCategoryLinks.articleId, row.article.id))
        .all(),
      db
        .select({
          productId: articleProductLinks.productId,
          displayOrder: articleProductLinks.displayOrder,
          productTitle: products.title,
          productHandle: products.handle,
          productThumbnailAssetId: products.thumbnailAssetId,
          productStatus: products.status,
        })
        .from(articleProductLinks)
        .innerJoin(products, eq(articleProductLinks.productId, products.id))
        .where(
          and(
            eq(articleProductLinks.articleId, row.article.id),
            eq(products.status, "published"),
          ),
        )
        .orderBy(asc(articleProductLinks.displayOrder))
        .all(),
    ]);

    // Fetch cheapest active variant price for each linked product
    const linkedProductIds = prodLinks.map((p) => p.productId);
    const variantPrices = linkedProductIds.length
      ? await db
          .select({
            productId: productVariants.productId,
            priceAmount: productVariants.priceAmount,
          })
          .from(productVariants)
          .where(inArray(productVariants.productId, linkedProductIds))
          .all()
      : [];

    const minPriceByProduct = new Map<number, number | null>();
    for (const vp of variantPrices) {
      const current = minPriceByProduct.get(vp.productId);
      if (
        vp.priceAmount !== null &&
        (current === undefined || current === null || vp.priceAmount < current)
      ) {
        minPriceByProduct.set(vp.productId, vp.priceAmount);
      }
    }

    const linkedProducts = prodLinks.map((p) => ({
      id: p.productId,
      title: p.productTitle,
      handle: p.productHandle,
      thumbnailUrl: p.productThumbnailAssetId
        ? (toAbsoluteAssetUrl(c, `/api/assets/products/${p.productThumbnailAssetId}/content`) as string)
        : null,
      minPrice: minPriceByProduct.get(p.productId) ?? null,
    }));

    const dto = {
      id: row.article.id,
      title: row.article.title,
      slug: row.article.slug,
      excerpt: row.article.excerpt,
      contentHtml: row.article.contentHtml,
      featuredImageUrl: row.article.featuredImageUrl,
      featuredImageAlt: row.article.featuredImageAlt,
      status: row.article.status,
      featured: row.article.featured,
      publishedAt: row.article.publishedAt ? row.article.publishedAt.getTime() : null,
      metaTitle: row.article.metaTitle,
      metaDescription: row.article.metaDescription,
      ogImageUrl: row.article.ogImageUrl,
      canonicalUrl: row.article.canonicalUrl,
      viewCount: row.article.viewCount,
      authorName: row.authorName,
      categories: catLinks.map((cl) => ({ id: cl.catId, name: cl.catName, slug: cl.catSlug })),
      linkedProducts,
      readingTimeMinutes: 0,
      createdAt: row.article.createdAt.getTime(),
      updatedAt: row.article.updatedAt.getTime(),
    };

    // Resolve localized article fields per locale
    const [resolved] = await hydrateAndResolveTranslations(
      db,
      "article",
      [dto],
      (item) => item.id,
      [
        { fieldName: "title", objectKey: "title" },
        { fieldName: "excerpt", objectKey: "excerpt" },
        { fieldName: "contentHtml", objectKey: "contentHtml" },
        { fieldName: "featuredImageAlt", objectKey: "featuredImageAlt" },
        { fieldName: "metaTitle", objectKey: "metaTitle" },
        { fieldName: "metaDescription", objectKey: "metaDescription" },
      ],
      [
        { fieldName: "title", objectKey: "title" },
        { fieldName: "excerpt", objectKey: "excerpt" },
        { fieldName: "contentHtml", objectKey: "contentHtml" },
        { fieldName: "featuredImageAlt", objectKey: "featuredImageAlt" },
        { fieldName: "metaTitle", objectKey: "metaTitle" },
        { fieldName: "metaDescription", objectKey: "metaDescription" },
      ],
      locale,
    );

    // Resolve category names per locale
    if (resolved.categories.length > 0) {
      await hydrateAndResolveTranslations(
        db,
        "article_category",
        resolved.categories,
        (category) => category.id,
        [{ fieldName: "name", objectKey: "name" }],
        [{ fieldName: "name", objectKey: "name" }],
        locale,
      );
    }

    resolved.readingTimeMinutes = estimateReadingTime(resolved.contentHtml ?? "");

    return c.json(resolved, 200);
  });
