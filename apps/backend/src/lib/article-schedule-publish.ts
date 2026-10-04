import { and, eq, lte } from "drizzle-orm";
import { getDb } from "../db/client";
import { articles } from "../db/schema";
import type { AppBindings } from "./env";

const BATCH_SIZE = 100;

/**
 * Publishes scheduled articles whose publish time has arrived.
 * Runs from the Worker cron handler; a single flip is idempotent.
 */
export async function processScheduledArticlePublishing(
  env: AppBindings,
  now = new Date(),
) {
  const db = getDb(env);

  const due = await db
    .select({ id: articles.id })
    .from(articles)
    .where(
      and(
        eq(articles.status, "scheduled"),
        lte(articles.publishedAt, now),
      ),
    )
    .limit(BATCH_SIZE);

  if (due.length === 0) return;

  for (const row of due) {
    await db
      .update(articles)
      .set({ status: "published", updatedAt: now })
      .where(eq(articles.id, row.id));
  }
}