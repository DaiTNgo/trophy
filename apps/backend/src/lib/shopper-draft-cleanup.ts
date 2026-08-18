import { and, eq, lte } from "drizzle-orm";
import { customizationAssets } from "../db/schema";
import type { AppBindings } from "./env";

const BATCH_SIZE = 50;

/** Removes expired, unprotected uploads. Repeating a source-object deletion is safe in R2. */
export async function processExpiredShopperDraftAssets(
  env: AppBindings,
  now = new Date(),
) {
  const { getDb } = await import("../db/client");
  const db = getDb(env);
  const assets = await db
    .select()
    .from(customizationAssets)
    .where(
      and(
        eq(customizationAssets.ownershipType, "shopper_draft"),
        eq(customizationAssets.expiryProtected, false),
        lte(customizationAssets.expiresAt, now),
      ),
    )
    .limit(BATCH_SIZE);

  for (const asset of assets) {
    try {
      await env.CUSTOMIZATION_ASSETS.delete(asset.objectKey);
      if (asset.previewObjectKey) {
        await env.CUSTOMIZATION_ASSETS.delete(asset.previewObjectKey);
      }
      await db.delete(customizationAssets).where(eq(customizationAssets.id, asset.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Shopper draft cleanup failed";
      console.error("shopper draft cleanup failed", { assetId: asset.id, message });
      await db
        .update(customizationAssets)
        .set({ cleanupLastError: message })
        .where(eq(customizationAssets.id, asset.id));
    }
  }
}
