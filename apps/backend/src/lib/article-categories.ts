import { eq, inArray } from "drizzle-orm";
import type { Database } from "../db/client";
import { articleCategories, articleCategoryLinks } from "../db/schema";

export type ArticleCategoryTag = { id: string; name: string; slug: string };

/** Loads the category tags of each given article, keyed by article id. */
export async function loadArticleCategoryTags(db: Database, articleIds: string[]) {
  const tagsByArticle = new Map<string, ArticleCategoryTag[]>();
  if (articleIds.length === 0) return tagsByArticle;

  const links = await db
    .select({
      articleId: articleCategoryLinks.articleId,
      id: articleCategories.id,
      name: articleCategories.name,
      slug: articleCategories.slug,
    })
    .from(articleCategoryLinks)
    .innerJoin(articleCategories, eq(articleCategoryLinks.categoryId, articleCategories.id))
    .where(
      articleIds.length === 1
        ? eq(articleCategoryLinks.articleId, articleIds[0])
        : inArray(articleCategoryLinks.articleId, articleIds),
    )
    .all();

  for (const { articleId, ...tag } of links) {
    const tags = tagsByArticle.get(articleId) ?? [];
    tags.push(tag);
    tagsByArticle.set(articleId, tags);
  }
  return tagsByArticle;
}

/** Category tags of a single article. */
export async function loadArticleCategoryTagsFor(db: Database, articleId: string) {
  return (await loadArticleCategoryTags(db, [articleId])).get(articleId) ?? [];
}
