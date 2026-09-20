import { asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { articleCategories, articles, articleCategoryLinks } from "../../db/schema";
import { getAdminSession } from "../../lib/admin-session";
import { hydrateTranslations } from "../../lib/catalog-translation";
import type { AppEnv } from "../../lib/env";

async function requireSession(c: { env: AppEnv["Bindings"]; req: { raw: Request } }) {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  return session?.user ? session : null;
}

export const adminArticleCategoriesRoute = new Hono<AppEnv>()

  // GET /api/admin/article-categories
  .get("/", async (c) => {
    const session = await requireSession(c as any);
    if (!session) return c.json({ error: "Unauthorized" }, 401);

    const db = getDb(c.env);

    const rows = await db
      .select({
        id: articleCategories.id,
        name: articleCategories.name,
        slug: articleCategories.slug,
        description: articleCategories.description,
        displayOrder: articleCategories.displayOrder,
        articleCount: articles.id,
      })
      .from(articleCategories)
      .leftJoin(
        articleCategoryLinks,
        eq(articleCategories.id, articleCategoryLinks.categoryId),
      )
      .leftJoin(articles, eq(articleCategoryLinks.articleId, articles.id))
      .orderBy(asc(articleCategories.displayOrder), asc(articleCategories.name))
      .all();

    const counts = new Map<string, number>();
    for (const row of rows) {
      if (row.articleCount !== null) {
        counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
      }
    }

    const seen = new Set<string>();
    const items = rows
      .filter((row) => {
        if (seen.has(row.id)) return false;
        seen.add(row.id);
        return true;
      })
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        displayOrder: row.displayOrder,
        articleCount: counts.get(row.id) ?? 0,
      }));

    // Hydrate name/description translations onto each category
    if (items.length > 0) {
      await hydrateTranslations(
        db,
        "article_category",
        items,
        (item) => item.id,
        [
          { fieldName: "name", objectKey: "nameTranslations" },
          { fieldName: "description", objectKey: "descriptionTranslations" },
        ],
        [
          { fieldName: "name", objectKey: "name" },
          { fieldName: "description", objectKey: "description" },
        ],
      );
    }

    return c.json({ items }, 200);
  });
