import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getDb } from "../../db/client";
import { customizationAssets } from "../../db/schema";
import { assetParamsSchema, cleanOwnerKey, extensionForMimeType } from "../../lib/asset-utils";
import {
  customizationAssetResponse,
  customizationAssetSizeFields,
  originalAssetMetadata,
  readCustomizationAssetUpload,
  validateCustomizationAssetUpload,
} from "../../lib/customization-asset-upload";
import type { AppEnv } from "../../lib/env";
import { buildShopperDraftUploadKey } from "../../lib/r2-media-keys";
import { shopperDraftExpiry } from "../../lib/order-media-transfer";
import { jsonError, parseParams } from "../../lib/validation";

/** Reads the shopper upload token and the draft/field the asset belongs to. */
function readShopperDraftOwner(c: Context<AppEnv>) {
  const ownerKey = cleanOwnerKey(c.req.header("x-upload-token") ?? "");
  if (!ownerKey) {
    return { ok: false as const, response: jsonError(c, 401, "X-Upload-Token is required") };
  }

  const shopperDraftId = cleanOwnerKey(c.req.header("x-shopper-draft-id") ?? "");
  const shopperFieldId = cleanOwnerKey(c.req.header("x-shopper-field-id") ?? "");
  if (!shopperDraftId || !shopperFieldId) {
    return {
      ok: false as const,
      response: jsonError(c, 400, "X-Shopper-Draft-Id and X-Shopper-Field-Id are required"),
    };
  }

  return { ok: true as const, ownerKey, shopperDraftId, shopperFieldId };
}

export const customizationAssetsRoute = new Hono<AppEnv>()
  .post("/", async (c) => {
    const read = await readCustomizationAssetUpload(c);
    if (!read.ok) return read.response;

    const owner = readShopperDraftOwner(c);
    if (!owner.ok) return owner.response;
    const { ownerKey, shopperDraftId, shopperFieldId } = owner;

    const validated = validateCustomizationAssetUpload(c, read.body);
    if (!validated.ok) return validated.response;
    const { upload } = validated;

    const id = crypto.randomUUID();
    const objectKey = buildShopperDraftUploadKey({
      draftId: shopperDraftId,
      fieldId: shopperFieldId,
      assetId: id,
      extension: extensionForMimeType(upload.mimeType),
    });
    let previewObjectKey: string | undefined;

    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, upload.buffer, {
      httpMetadata: { contentType: upload.mimeType },
      customMetadata: originalAssetMetadata(id, ownerKey, upload),
    });

    if (upload.previewBuffer) {
      previewObjectKey = objectKey.replace(/\.source\.[a-z0-9]+$/, ".preview.webp");
      await c.env.CUSTOMIZATION_ASSETS.put(previewObjectKey, upload.previewBuffer, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: {
          assetId: id,
          draftId: shopperDraftId,
          fieldId: shopperFieldId,
          type: "preview",
        },
      });
    }

    await getDb(c.env).insert(customizationAssets).values({
      id,
      ownerKey,
      ownershipType: "shopper_draft",
      shopperDraftId,
      shopperFieldId,
      expiresAt: shopperDraftExpiry(new Date()),
      objectKey,
      previewObjectKey,
      mimeType: upload.mimeType,
      ...customizationAssetSizeFields(upload),
      byteSize: upload.buffer.byteLength,
    });

    return c.json(customizationAssetResponse(c, id, upload, Boolean(previewObjectKey)), 201);
  })
  .delete("/:id", async (c) => {
    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const owner = readShopperDraftOwner(c);
    if (!owner.ok) return owner.response;

    const db = getDb(c.env);
    const asset = await db
      .select()
      .from(customizationAssets)
      .where(
        and(
          eq(customizationAssets.id, params.output.id),
          eq(customizationAssets.ownerKey, owner.ownerKey),
          eq(customizationAssets.ownershipType, "shopper_draft"),
          eq(customizationAssets.shopperDraftId, owner.shopperDraftId),
          eq(customizationAssets.shopperFieldId, owner.shopperFieldId),
        ),
      )
      .get();

    if (!asset) {
      return jsonError(c, 404, "Customization asset not found");
    }

    await Promise.all([
      c.env.CUSTOMIZATION_ASSETS.delete(asset.objectKey),
      ...(asset.previewObjectKey
        ? [c.env.CUSTOMIZATION_ASSETS.delete(asset.previewObjectKey)]
        : []),
    ]);
    await db.delete(customizationAssets).where(eq(customizationAssets.id, asset.id));

    return c.json({ ok: true }, 200);
  });
