import { Hono } from "hono";
import { getDb } from "../../db/client";
import { customizationAssets } from "../../db/schema";
import { cleanOwnerKey, extensionForMimeType } from "../../lib/asset-utils";
import {
  customizationAssetResponse,
  customizationAssetSizeFields,
  originalAssetMetadata,
  readCustomizationAssetUpload,
  validateCustomizationAssetUpload,
} from "../../lib/customization-asset-upload";
import type { AppEnv } from "../../lib/env";
import { jsonError } from "../../lib/validation";

export const customizationAssetsRoute = new Hono<AppEnv>()
  .post("/", async (c) => {
    const read = await readCustomizationAssetUpload(c);
    if (!read.ok) return read.response;

    const ownerKey = cleanOwnerKey(c.req.header("x-upload-token") ?? "");
    if (!ownerKey) {
      return jsonError(c, 401, "X-Upload-Token is required");
    }

    const validated = validateCustomizationAssetUpload(c, read.body, { trustClientImageDimensions: true });
    if (!validated.ok) return validated.response;
    const { upload } = validated;

    const id = crypto.randomUUID();
    const objectKey = `uploads/${ownerKey}/${id}/original.${extensionForMimeType(upload.mimeType)}`;
    let previewObjectKey: string | undefined;

    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, upload.buffer, {
      httpMetadata: { contentType: upload.mimeType },
      customMetadata: originalAssetMetadata(id, ownerKey, upload),
    });

    if (upload.previewBuffer) {
      previewObjectKey = `uploads/${ownerKey}/${id}/preview.webp`;
      await c.env.CUSTOMIZATION_ASSETS.put(previewObjectKey, upload.previewBuffer, {
        httpMetadata: { contentType: "image/webp" },
        customMetadata: {
          assetId: id,
          ownerKey,
          type: "preview",
        },
      });
    }

    await getDb(c.env).insert(customizationAssets).values({
      id,
      ownerKey,
      objectKey,
      previewObjectKey,
      mimeType: upload.mimeType,
      ...customizationAssetSizeFields(upload),
      byteSize: upload.buffer.byteLength,
    });

    return c.json(customizationAssetResponse(c, id, upload, Boolean(previewObjectKey)), 201);
  });
