import { and, desc, eq, inArray, like, or, sql } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import {
  articleCategories,
  articleCategoryLinks,
  articleProductLinks,
  articles,
  catalogTranslations,
  users,
} from "../../db/schema";
import { getAdminSession } from "../../lib/admin-session";
import { flipDueScheduledArticles, markRowsPublished } from "../../lib/article-publish";
import { hydrateTranslations, upsertTranslations } from "../../lib/catalog-translation";
import type { AppEnv } from "../../lib/env";
import { slugify, uniqueSlug } from "../../lib/slug";
import { jsonError, parseJson, parseParams } from "../../lib/validation";

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function requireSession(c: { env: AppEnv["Bindings"]; req: { raw: Request } }) {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  if (!session?.user) return null;
  return session;
}

// ─── Validation Schemas ────────────────────────────────────────────────────────

const articleStatusValues = ["draft", "published", "scheduled"] as const;

const localizedInputSchema = v.object({
  vi: v.pipe(v.string(), v.trim()),
  en: v.optional(v.pipe(v.string(), v.trim())),
});

const createArticleSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
  titleTranslations: v.optional(localizedInputSchema),
  slug: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500))),
  excerpt: v.optional(v.pipe(v.string(), v.maxLength(1000))),
  excerptTranslations: v.optional(localizedInputSchema),
  contentHtml: v.optional(v.pipe(v.string(), v.maxLength(500_000))),
  contentHtmlTranslations: v.optional(localizedInputSchema),
  contentJson: v.optional(v.string()),
  contentJsonTranslations: v.optional(localizedInputSchema),
  featuredImageUrl: v.optional(v.pipe(v.string(), v.url())),
  featuredImageAlt: v.optional(v.pipe(v.string(), v.maxLength(300))),
  featuredImageAltTranslations: v.optional(localizedInputSchema),
  status: v.optional(v.picklist(articleStatusValues)),
  featured: v.optional(v.boolean()),
  publishedAt: v.optional(v.number()),
  metaTitle: v.optional(v.pipe(v.string(), v.maxLength(200))),
  metaTitleTranslations: v.optional(localizedInputSchema),
  metaDescription: v.optional(v.pipe(v.string(), v.maxLength(500))),
  metaDescriptionTranslations: v.optional(localizedInputSchema),
  ogImageUrl: v.optional(v.pipe(v.string(), v.url())),
  canonicalUrl: v.optional(v.pipe(v.string(), v.url())),
  categoryIds: v.optional(v.array(v.string())),
  productIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))),
});

const updateArticleSchema = v.partial(createArticleSchema);

const idParamSchema = v.object({
  id: v.pipe(v.string(), v.trim(), v.minLength(1)),
});

// ─── Translation helpers ───────────────────────────────────────────────────────

const LOCALIZED_ARTICLE_FIELDS = [
  "title",
  "excerpt",
  "contentHtml",
  "contentJson",
  "featuredImageAlt",
  "metaTitle",
  "metaDescription",
] as const;

type LocalizedArticleBody = Record<string, unknown>;

/** Upserts all provided `*Translations` payloads for an article. */
async function upsertArticleTranslations(
  db: ReturnType<typeof getDb>,
  articleId: string,
  body: LocalizedArticleBody,
) {
  const ops: Promise<void>[] = [];
  for (const field of LOCALIZED_ARTICLE_FIELDS) {
    const value = body[`${field}Translations`] as { vi?: string; en?: string } | undefined;
    if (value && typeof value === "object") {
      ops.push(upsertTranslations(db, "article", articleId, field, value));
    }
  }
  return Promise.all(ops);
}

const LOCALIZED_HYDRATION = [
  { fieldName: "title", objectKey: "titleTranslations" },
  { fieldName: "excerpt", objectKey: "excerptTranslations" },
  { fieldName: "contentHtml", objectKey: "contentHtmlTranslations" },
  { fieldName: "contentJson", objectKey: "contentJsonTranslations" },
  { fieldName: "featuredImageAlt", objectKey: "featuredImageAltTranslations" },
  { fieldName: "metaTitle", objectKey: "metaTitleTranslations" },
  { fieldName: "metaDescription", objectKey: "metaDescriptionTranslations" },
];

const LOCALIZED_FALLBACKS = [
  { fieldName: "title", objectKey: "title" },
  { fieldName: "excerpt", objectKey: "excerpt" },
  { fieldName: "contentHtml", objectKey: "contentHtml" },
  { fieldName: "contentJson", objectKey: "contentJson" },
  { fieldName: "featuredImageAlt", objectKey: "featuredImageAlt" },
  { fieldName: "metaTitle", objectKey: "metaTitle" },
  { fieldName: "metaDescription", objectKey: "metaDescription" },
];

/** Hydrates localized `*Translations` records onto a single article DTO. */
async function hydrateArticleTranslations(db: ReturnType<typeof getDb>, dto: Record<string, unknown>) {
  const [hydrated] = await hydrateTranslations(
    db,
    "article",
    [dto],
    (d) => String((d as { id: string }).id),
    LOCALIZED_HYDRATION,
    LOCALIZED_FALLBACKS,
  );
  return hydrated;
}

// ─── ID Generation ─────────────────────────────────────────────────────────────

function cuid(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `c${ts}${rand}`;
}

// ─── Shared DTO Builder ────────────────────────────────────────────────────────

function articleToDto(
  row: typeof articles.$inferSelect,
  author: { name: string; username: string | null } | null,
  categories: Array<{ id: string; name: string; slug: string }>,
  linkedProductIds: number[],
) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    contentHtml: row.contentHtml,
    contentJson: row.contentJson,
    featuredImageUrl: row.featuredImageUrl,
    featuredImageAlt: row.featuredImageAlt,
    status: row.status,
    featured: row.featured,
    author: author ? { name: author.name, username: author.username } : null,
    publishedAt: row.publishedAt ? row.publishedAt.getTime() : null,
    metaTitle: row.metaTitle,
    metaDescription: row.metaDescription,
    ogImageUrl: row.ogImageUrl,
    canonicalUrl: row.canonicalUrl,
    viewCount: row.viewCount,
    categories,
    productIds: linkedProductIds,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

// ─── Route ─────────────────────────────────────────────────────────────────────

export const adminArticlesRoute = new Hono<AppEnv>()

  // GET /api/admin/articles
  .get("/", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const db = getDb(c.env);
    const params = c.req.query();

    const page = Math.max(1, Number(params.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(params.limit ?? 20)));
    const offset = (page - 1) * limit;
    const q = params.q?.trim() || undefined;
    const statusFilter = params.status as (typeof articleStatusValues)[number] | undefined;
    const categorySlug = params.category?.trim() || undefined;

    // Build where conditions
    const conditions = [];
    if (q) {
      const translatedIds = await db
        .select({ articleId: catalogTranslations.ownerKey })
        .from(catalogTranslations)
        .where(
          and(
            eq(catalogTranslations.ownerType, "article"),
            like(catalogTranslations.value, `%${q}%`),
          ),
        )
        .all();
      const qCondition = translatedIds.length
        ? or(
            like(articles.title, `%${q}%`),
            like(articles.slug, `%${q}%`),
            inArray(articles.id, translatedIds.map((t) => t.articleId)),
          )
        : or(
            like(articles.title, `%${q}%`),
            like(articles.slug, `%${q}%`),
          );
      conditions.push(qCondition);
    }
    if (statusFilter && articleStatusValues.includes(statusFilter)) {
      conditions.push(eq(articles.status, statusFilter));
    }
    if (categorySlug) {
      const cat = await db
        .select({ id: articleCategories.id })
        .from(articleCategories)
        .where(eq(articleCategories.slug, categorySlug))
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
        conditions.push(inArray(articles.id, articleIdsInCat.map((r) => r.articleId)));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, countRows] = await Promise.all([
      db
        .select({
          article: articles,
          authorName: users.name,
          authorUsername: users.username,
        })
        .from(articles)
        .leftJoin(users, eq(articles.authorId, users.id))
        .where(where)
        .orderBy(desc(articles.updatedAt))
        .limit(limit)
        .offset(offset)
        .all(),
      db
        .select({ count: sql<number>`count(*)` })
        .from(articles)
        .where(where)
        .get(),
    ]);

    const total = countRows?.count ?? 0;

    // Auto-publish scheduled articles whose time has arrived (cron only runs in prod)
    const flippedIds = await flipDueScheduledArticles(
      db,
      rows.map((r) => ({
        id: r.article.id,
        status: r.article.status,
        publishedAt: r.article.publishedAt,
      })),
    );
    markRowsPublished(rows, flippedIds);

    // Fetch categories for each article
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

    const items = rows.map((r) =>
      articleToDto(
        r.article,
        r.authorName ? { name: r.authorName, username: r.authorUsername } : null,
        catsByArticle.get(r.article.id) ?? [],
        [], // productIds omitted in list view
      ),
    );

    // Hydrate title/excerpt translations for the list rows
    if (items.length > 0) {
      await hydrateTranslations(
        db,
        "article",
        items,
        (item) => item.id,
        [
          { fieldName: "title", objectKey: "titleTranslations" },
          { fieldName: "excerpt", objectKey: "excerptTranslations" },
        ],
        [
          { fieldName: "title", objectKey: "title" },
          { fieldName: "excerpt", objectKey: "excerpt" },
        ],
      );
    }

    return c.json({ items, page, limit, total }, 200);
  })

  // POST /api/admin/articles
  .post("/", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const parsed = await parseJson(c, createArticleSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.output;

    const db = getDb(c.env);

    // Slug generation/collision handling
    const titleValue = body.titleTranslations?.vi ?? body.title;
    const baseSlug = body.slug ? slugify(body.slug) : slugify(titleValue);
    if (!baseSlug) return jsonError(c, 400, "Title or slug must produce a valid URL segment");

    const finalSlug = await uniqueSlug(baseSlug, async (candidate) => {
      const existing = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.slug, candidate))
        .get();
      return !!existing;
    });

    const id = cuid();
    const now = new Date();
    const publishedAt = body.publishedAt
      ? new Date(body.publishedAt)
      : body.status === "published"
        ? now
        : null;

    // A scheduled article must carry an explicit publish time so it can auto-publish later.
    if (body.status === "scheduled" && publishedAt === null) {
      return jsonError(c, 400, "A publish date is required when scheduling an article");
    }

    await db.insert(articles).values({
      id,
      title: body.titleTranslations?.vi ?? body.title,
      slug: finalSlug,
      excerpt: body.excerptTranslations?.vi ?? body.excerpt ?? null,
      contentHtml: body.contentHtmlTranslations?.vi ?? body.contentHtml ?? "",
      contentJson: body.contentJsonTranslations?.vi ?? body.contentJson ?? null,
      featuredImageUrl: body.featuredImageUrl ?? null,
      featuredImageAlt: body.featuredImageAltTranslations?.vi ?? body.featuredImageAlt ?? null,
      status: body.status ?? "draft",
      featured: body.featured ?? false,
      authorId: session.user.id,
      publishedAt,
      metaTitle: body.metaTitleTranslations?.vi ?? body.metaTitle ?? null,
      metaDescription: body.metaDescriptionTranslations?.vi ?? body.metaDescription ?? null,
      ogImageUrl: body.ogImageUrl ?? null,
      canonicalUrl: body.canonicalUrl ?? null,
      createdAt: now,
      updatedAt: now,
    });

    // Persist per-locale translations (EN + mirror of VI)
    await upsertArticleTranslations(db, id, body as unknown as LocalizedArticleBody);

    // Category links
    if (body.categoryIds?.length) {
      await db.insert(articleCategoryLinks).values(
        body.categoryIds.map((cid) => ({ articleId: id, categoryId: cid })),
      );
    }

    // Product links
    if (body.productIds?.length) {
      await db.insert(articleProductLinks).values(
        body.productIds.map((pid, i) => ({ articleId: id, productId: pid, displayOrder: i })),
      );
    }

    const created = await db.select().from(articles).where(eq(articles.id, id)).get();
    if (!created) return c.json({ error: "Article creation failed" }, 500);

    const createdDto = articleToDto(created, { name: session.user.name, username: (session.user as any).username ?? null }, [], body.productIds ?? []);
    await hydrateArticleTranslations(db, createdDto as unknown as Record<string, unknown>);

    return c.json(createdDto, 201);
  })

  // GET /api/admin/articles/:id
  .get("/:id", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const params = parseParams(c, idParamSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);

    const row = await db
      .select({
        article: articles,
        authorName: users.name,
        authorUsername: users.username,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(eq(articles.id, params.output.id))
      .get();

    if (!row) return c.json({ error: "Not found" }, 404);

    // Auto-publish a scheduled article whose time has arrived (cron only runs in prod)
    const flippedIds = await flipDueScheduledArticles(
      db,
      [{ id: row.article.id, status: row.article.status, publishedAt: row.article.publishedAt }],
    );
    markRowsPublished([row], flippedIds);

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
        .select({ productId: articleProductLinks.productId })
        .from(articleProductLinks)
        .where(eq(articleProductLinks.articleId, row.article.id))
        .orderBy(articleProductLinks.displayOrder)
        .all(),
    ]);

    const dto = articleToDto(
      row.article,
      row.authorName ? { name: row.authorName, username: row.authorUsername } : null,
      catLinks.map((cl) => ({ id: cl.catId, name: cl.catName, slug: cl.catSlug })),
      prodLinks.map((pl) => pl.productId),
    );
    await hydrateArticleTranslations(db, dto as unknown as Record<string, unknown>);

    return c.json(dto, 200);
  })

  // PATCH /api/admin/articles/:id
  .patch("/:id", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const params = parseParams(c, idParamSchema);
    if (!params.success) return params.response;

    const parsed = await parseJson(c, updateArticleSchema);
    if (!parsed.success) return parsed.response;
    const body = parsed.output;

    const db = getDb(c.env);

    const existing = await db
      .select({ id: articles.id, slug: articles.slug, publishedAt: articles.publishedAt })
      .from(articles)
      .where(eq(articles.id, params.output.id))
      .get();
    if (!existing) return c.json({ error: "Not found" }, 404);

    // Compute final slug if provided
    let finalSlug: string | undefined;
    if (body.slug !== undefined || body.title !== undefined || body.titleTranslations !== undefined) {
      const rawSlug = body.slug ?? body.titleTranslations?.vi ?? body.title!;
      const baseSlug = slugify(rawSlug);
      if (!baseSlug) return jsonError(c, 400, "Slug must produce a valid URL segment");

      if (baseSlug !== existing.slug) {
        finalSlug = await uniqueSlug(baseSlug, async (candidate) => {
          const conflict = await db
            .select({ id: articles.id })
            .from(articles)
            .where(and(eq(articles.slug, candidate)))
            .get();
          return !!conflict && conflict.id !== existing.id;
        });
      }
    }

    const publishedAt =
      body.publishedAt !== undefined
        ? new Date(body.publishedAt)
        : body.status === "published" && existing.publishedAt === null
          ? new Date()
          : undefined;

    // A scheduled article must carry an explicit publish time so it can auto-publish later.
    const scheduledValue = body.status === "scheduled";
    const hasPublishTime = body.publishedAt !== undefined || existing.publishedAt !== null;
    if (scheduledValue && !hasPublishTime) {
      return jsonError(c, 400, "A publish date is required when scheduling an article");
    }

    await db
      .update(articles)
      .set({
        ...(finalSlug !== undefined && { slug: finalSlug }),
        ...(body.titleTranslations?.vi !== undefined && { title: body.titleTranslations.vi }),
        ...(body.title !== undefined && body.titleTranslations === undefined && { title: body.title }),
        ...(body.excerptTranslations?.vi !== undefined && { excerpt: body.excerptTranslations.vi }),
        ...(body.excerpt !== undefined && body.excerptTranslations === undefined && { excerpt: body.excerpt }),
        ...(body.contentHtmlTranslations?.vi !== undefined && { contentHtml: body.contentHtmlTranslations.vi }),
        ...(body.contentHtml !== undefined && body.contentHtmlTranslations === undefined && { contentHtml: body.contentHtml }),
        ...(body.contentJsonTranslations?.vi !== undefined && { contentJson: body.contentJsonTranslations.vi }),
        ...(body.contentJson !== undefined && body.contentJsonTranslations === undefined && { contentJson: body.contentJson }),
        ...(body.featuredImageUrl !== undefined && { featuredImageUrl: body.featuredImageUrl }),
        ...(body.featuredImageAltTranslations?.vi !== undefined && { featuredImageAlt: body.featuredImageAltTranslations.vi }),
        ...(body.featuredImageAlt !== undefined && body.featuredImageAltTranslations === undefined && { featuredImageAlt: body.featuredImageAlt }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.featured !== undefined && { featured: body.featured }),
        ...(publishedAt !== undefined && { publishedAt }),
        ...(body.metaTitleTranslations?.vi !== undefined && { metaTitle: body.metaTitleTranslations.vi }),
        ...(body.metaTitle !== undefined && body.metaTitleTranslations === undefined && { metaTitle: body.metaTitle }),
        ...(body.metaDescriptionTranslations?.vi !== undefined && { metaDescription: body.metaDescriptionTranslations.vi }),
        ...(body.metaDescription !== undefined && body.metaDescriptionTranslations === undefined && { metaDescription: body.metaDescription }),
        ...(body.ogImageUrl !== undefined && { ogImageUrl: body.ogImageUrl }),
        ...(body.canonicalUrl !== undefined && { canonicalUrl: body.canonicalUrl }),
        updatedAt: new Date(),
      })
      .where(eq(articles.id, existing.id));

    // Persist per-locale translations (EN + mirror of VI)
    await upsertArticleTranslations(db, existing.id, body as unknown as LocalizedArticleBody);

    // Replace category links
    if (body.categoryIds !== undefined) {
      await db.delete(articleCategoryLinks).where(eq(articleCategoryLinks.articleId, existing.id));
      if (body.categoryIds.length) {
        await db.insert(articleCategoryLinks).values(
          body.categoryIds.map((cid) => ({ articleId: existing.id, categoryId: cid })),
        );
      }
    }

    // Replace product links
    if (body.productIds !== undefined) {
      await db.delete(articleProductLinks).where(eq(articleProductLinks.articleId, existing.id));
      if (body.productIds.length) {
        await db.insert(articleProductLinks).values(
          body.productIds.map((pid, i) => ({
            articleId: existing.id,
            productId: pid,
            displayOrder: i,
          })),
        );
      }
    }

    const updated = await db
      .select({
        article: articles,
        authorName: users.name,
        authorUsername: users.username,
      })
      .from(articles)
      .leftJoin(users, eq(articles.authorId, users.id))
      .where(eq(articles.id, existing.id))
      .get();

    if (!updated) return c.json({ error: "Article not found after update" }, 500);

    const [catLinks, prodLinks] = await Promise.all([
      db
        .select({ catId: articleCategories.id, catName: articleCategories.name, catSlug: articleCategories.slug })
        .from(articleCategoryLinks)
        .innerJoin(articleCategories, eq(articleCategoryLinks.categoryId, articleCategories.id))
        .where(eq(articleCategoryLinks.articleId, existing.id))
        .all(),
      db
        .select({ productId: articleProductLinks.productId })
        .from(articleProductLinks)
        .where(eq(articleProductLinks.articleId, existing.id))
        .orderBy(articleProductLinks.displayOrder)
        .all(),
    ]);

    const dto = articleToDto(
      updated.article,
      updated.authorName ? { name: updated.authorName, username: updated.authorUsername } : null,
      catLinks.map((cl) => ({ id: cl.catId, name: cl.catName, slug: cl.catSlug })),
      prodLinks.map((pl) => pl.productId),
    );
    await hydrateArticleTranslations(db, dto as unknown as Record<string, unknown>);

    return c.json(dto, 200);
  })

  // DELETE /api/admin/articles/:id
  .delete("/:id", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const params = parseParams(c, idParamSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);

    const existing = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.id, params.output.id))
      .get();
    if (!existing) return c.json({ error: "Not found" }, 404);

    await db.delete(articles).where(eq(articles.id, existing.id));

    // Clean up polymorphic translation records (no FK, so do it explicitly)
    await db
      .delete(catalogTranslations)
      .where(
        and(
          eq(catalogTranslations.ownerType, "article"),
          eq(catalogTranslations.ownerKey, existing.id),
        ),
      );

    return c.json({ success: true }, 200);
  });
