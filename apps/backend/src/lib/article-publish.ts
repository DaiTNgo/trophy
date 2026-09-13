import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { articles } from "../db/schema";

/**
 * Flipping helper for the schedule feature: any `scheduled` article whose publish
 * time has arrived becomes `published`. Called on read so the status self-updates
 * deterministically in every environment (the Worker cron only runs in deployed
 * production). Afterward the caller should reflect the new status in the DTO.
 */
export async function flipDueScheduledArticles(
  db: Database,
  rows: Array<{ id: string; status: string; publishedAt: Date | null }>,
  now = new Date(),
): Promise<string[]> {
  const flippedIds = rows
    .filter(
      (row) =>
        row.status === "scheduled" &&
        row.publishedAt !== null &&
        row.publishedAt <= now,
    )
    .map((row) => row.id);

  for (const id of flippedIds) {
    await db
      .update(articles)
      .set({ status: "published", updatedAt: now })
      .where(eq(articles.id, id));
  }

  return flippedIds;
}

/**
 * Applies the flip result to in-memory row objects so the response DTO reflects
 * the new status without a second query.
 */
export function markRowsPublished(
  rows: Array<{ article: { id: string; status: string; publishedAt: Date | null } }>,
  flippedIds: string[],
) {
  if (flippedIds.length === 0) return;
  const flipped = new Set(flippedIds);
  for (const row of rows) {
    if (flipped.has(row.article.id)) row.article.status = "published";
  }
}