import { eq, like } from "drizzle-orm";
import type { Context } from "hono";
import type { getDb } from "../db/client";
import {
  customizationAssets,
  orderItemMediaTransferAssets,
  orderItemMediaTransfers,
  orderItems,
  productAssets,
} from "../db/schema";
import { extensionForMimeType } from "./asset-utils";
import type { AppEnv } from "./env";
import { extractRequiredOrderMediaReferences } from "./order-media-references";
import {
  buildOrderBackgroundKey,
  buildOrderClipartKey,
  buildOrderUploadKey,
} from "./r2-media-keys";
import { toAbsoluteAssetUrl } from "./url";

export async function isAssetReferencedByOrders(
  db: ReturnType<typeof getDb>,
  assetId: string,
): Promise<boolean> {
  const transferRef = await db
    .select({ id: orderItemMediaTransferAssets.id })
    .from(orderItemMediaTransferAssets)
    .where(eq(orderItemMediaTransferAssets.sourceAssetId, assetId))
    .get();

  if (transferRef) return true;

  const orderRef = await db
    .select({ id: orderItems.id })
    .from(orderItems)
    .where(like(orderItems.backgroundSnapshotJson, `%"assetId":"${assetId}"%`))
    .get();

  return Boolean(orderRef);
}

export async function transferOrderItemMedia(
  c: Context<AppEnv>,
  db: ReturnType<typeof getDb>,
  params: {
    order: { id: number; orderNumber: string };
    item: { id: number; productId: number; variantId: number };
    backgroundSnapshot: any | null;
    customizationSnapshot: any | null;
  },
): Promise<{
  backgroundSnapshot: any | null;
  customizationSnapshot: any | null;
  hasFailure: boolean;
}> {
  const { order, item, backgroundSnapshot, customizationSnapshot } = params;

  if (!customizationSnapshot) {
    return { backgroundSnapshot, customizationSnapshot, hasFailure: false };
  }

  const requiredRefs = extractRequiredOrderMediaReferences(
    backgroundSnapshot,
    customizationSnapshot,
  );

  if (requiredRefs.length === 0) {
    return { backgroundSnapshot, customizationSnapshot, hasFailure: false };
  }

  const transferId = crypto.randomUUID();
  await db.insert(orderItemMediaTransfers).values({
    id: transferId,
    orderItemId: item.id,
    status: "pending",
    attemptCount: 1,
  });

  let hasFailure = false;
  let rewrittenBackground = backgroundSnapshot ? { ...backgroundSnapshot } : null;
  let rewrittenCustomization = customizationSnapshot
    ? {
        ...customizationSnapshot,
        values: { ...customizationSnapshot.values },
        design: customizationSnapshot.design ? { ...customizationSnapshot.design } : null,
      }
    : null;

  for (const ref of requiredRefs) {
    const transferAssetId = crypto.randomUUID();
    let sourceObjectKey = "";
    let sourcePreviewObjectKey: string | null = null;
    let targetObjectKey = "";
    let targetPreviewObjectKey: string | null = null;
    let mimeType = "image/png";

    if (ref.role === "background") {
      const asset = await db
        .select()
        .from(productAssets)
        .where(eq(productAssets.id, ref.sourceAssetId))
        .get();

      if (!asset) {
        hasFailure = true;
        await db.insert(orderItemMediaTransferAssets).values({
          id: transferAssetId,
          transferId,
          role: ref.role,
          fieldId: null,
          sourceAssetId: ref.sourceAssetId,
          sourceObjectKey: "unknown",
          targetObjectKey: "unknown",
          status: "failed",
          lastError: `Source product asset ${ref.sourceAssetId} not found`,
        });
        continue;
      }

      sourceObjectKey = asset.objectKey;
      sourcePreviewObjectKey = asset.previewObjectKey ?? null;
      mimeType = asset.mimeType;
      const ext = extensionForMimeType(mimeType);

      targetObjectKey = buildOrderBackgroundKey({
        orderNumber: order.orderNumber,
        orderId: order.id,
        itemId: item.id,
        assetId: ref.sourceAssetId,
        extension: ext,
      });

      if (sourcePreviewObjectKey) {
        const previewExt = sourcePreviewObjectKey.split(".").pop() || "webp";
        targetPreviewObjectKey = targetObjectKey.replace(
          /\.source\.[a-z0-9]+$/,
          `.preview.${previewExt}`,
        );
      }
    } else if (ref.role === "upload" || ref.role === "clipart") {
      const asset = await db
        .select()
        .from(customizationAssets)
        .where(eq(customizationAssets.id, ref.sourceAssetId))
        .get();

      if (!asset) {
        hasFailure = true;
        await db.insert(orderItemMediaTransferAssets).values({
          id: transferAssetId,
          transferId,
          role: ref.role,
          fieldId: ref.fieldId,
          sourceAssetId: ref.sourceAssetId,
          sourceObjectKey: "unknown",
          targetObjectKey: "unknown",
          status: "failed",
          lastError: `Source customization asset ${ref.sourceAssetId} not found`,
        });
        continue;
      }

      sourceObjectKey = asset.objectKey;
      sourcePreviewObjectKey = asset.previewObjectKey ?? null;
      mimeType = asset.mimeType;
      const ext = extensionForMimeType(mimeType);

      if (ref.role === "upload") {
        targetObjectKey = buildOrderUploadKey({
          orderNumber: order.orderNumber,
          orderId: order.id,
          itemId: item.id,
          fieldId: ref.fieldId,
          assetId: ref.sourceAssetId,
          extension: ext,
        });

        // Protect shopper draft from expiry while order transfer is active
        await db
          .update(customizationAssets)
          .set({ expiryProtected: true })
          .where(eq(customizationAssets.id, asset.id));
      } else {
        targetObjectKey = buildOrderClipartKey({
          orderNumber: order.orderNumber,
          orderId: order.id,
          itemId: item.id,
          fieldId: ref.fieldId,
          sourceAssetId: ref.sourceAssetId,
          extension: ext,
        });
      }

      if (sourcePreviewObjectKey) {
        const previewExt = sourcePreviewObjectKey.split(".").pop() || "png";
        targetPreviewObjectKey = targetObjectKey.replace(
          /\.source\.[a-z0-9]+$/,
          `.preview.${previewExt}`,
        );
      }
    }

    // Insert record in orderItemMediaTransferAssets
    await db.insert(orderItemMediaTransferAssets).values({
      id: transferAssetId,
      transferId,
      role: ref.role,
      fieldId: ref.fieldId,
      sourceAssetId: ref.sourceAssetId,
      sourceObjectKey,
      targetObjectKey,
      sourcePreviewObjectKey,
      targetPreviewObjectKey,
      status: "pending",
    });

    // Copy in R2
    if (c.env?.CUSTOMIZATION_ASSETS) {
      try {
        const source = await c.env.CUSTOMIZATION_ASSETS.get(sourceObjectKey);
        if (!source) {
          throw new Error(`Source object not found in R2: ${sourceObjectKey}`);
        }
        await c.env.CUSTOMIZATION_ASSETS.put(targetObjectKey, source.body, {
          httpMetadata: source.httpMetadata,
          customMetadata: source.customMetadata,
        });

        if (sourcePreviewObjectKey && targetPreviewObjectKey) {
          const previewSource = await c.env.CUSTOMIZATION_ASSETS.get(sourcePreviewObjectKey);
          if (previewSource) {
            await c.env.CUSTOMIZATION_ASSETS.put(targetPreviewObjectKey, previewSource.body, {
              httpMetadata: previewSource.httpMetadata,
              customMetadata: previewSource.customMetadata,
            });
          }
        }

        await db
          .update(orderItemMediaTransferAssets)
          .set({ status: "complete", updatedAt: new Date() })
          .where(eq(orderItemMediaTransferAssets.id, transferAssetId));
      } catch (error) {
        hasFailure = true;
        const errorMessage =
          error instanceof Error ? error.message : "Media transfer failed";
        await db
          .update(orderItemMediaTransferAssets)
          .set({
            status: "failed",
            lastError: errorMessage,
            updatedAt: new Date(),
          })
          .where(eq(orderItemMediaTransferAssets.id, transferAssetId));
      }
    } else {
      await db
        .update(orderItemMediaTransferAssets)
        .set({ status: "complete", updatedAt: new Date() })
        .where(eq(orderItemMediaTransferAssets.id, transferAssetId));
    }

    // Rewrite URLs to order-owned endpoint
    const newContentUrl = toAbsoluteAssetUrl(
      c,
      `/api/assets/orders/${transferAssetId}/content`,
    ) as string;
    const newPreviewUrl = toAbsoluteAssetUrl(
      c,
      targetPreviewObjectKey
        ? `/api/assets/orders/${transferAssetId}/preview`
        : `/api/assets/orders/${transferAssetId}/content`,
    ) as string;

    if (ref.role === "background" && rewrittenBackground) {
      rewrittenBackground.contentUrl = newContentUrl;
      rewrittenBackground.previewUrl = newPreviewUrl;
    } else if (ref.fieldId && rewrittenCustomization?.values) {
      const val = rewrittenCustomization.values[ref.fieldId];
      if (val && typeof val === "object") {
        rewrittenCustomization.values[ref.fieldId] = {
          ...val,
          contentUrl: newContentUrl,
          previewUrl: newPreviewUrl,
          url: newContentUrl,
        };
      }
    }
  }

  // Update orderItemMediaTransfers status
  const finalStatus = hasFailure ? "failed" : "complete";
  await db
    .update(orderItemMediaTransfers)
    .set({
      status: finalStatus,
      lastError: hasFailure ? "One or more media items failed to copy" : null,
      updatedAt: new Date(),
    })
    .where(eq(orderItemMediaTransfers.id, transferId));

  return {
    backgroundSnapshot: rewrittenBackground,
    customizationSnapshot: rewrittenCustomization,
    hasFailure,
  };
}
