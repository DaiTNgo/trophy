import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../db/client";
import { customizationAssets } from "../db/schema";
import {
  allowedMimeTypes,
  assetParamsSchema,
  cleanOwnerKey,
  extensionForMimeType,
  MAX_ASSET_BYTES,
} from "../lib/asset-utils";
import type { AppEnv } from "../lib/env";
import { readImageDimensions } from "../lib/image-dimensions";
import { jsonError, parseParams } from "../lib/validation";

export const customizationAssetsRoute = new Hono<AppEnv>()
  .post("/", async (c) => {
    const mimeType = c.req.header("content-type")?.split(";")[0]?.trim() ?? "";
    if (!allowedMimeTypes.has(mimeType)) {
      return jsonError(c, 415, "Only PNG and JPEG customization assets are supported");
    }

    const ownerKey = cleanOwnerKey(c.req.header("x-upload-token") ?? "");
    if (!ownerKey) {
      return jsonError(c, 401, "X-Upload-Token is required");
    }

    const contentLength = Number(c.req.header("content-length"));
    if (!Number.isInteger(contentLength) || contentLength <= 0) {
      return jsonError(c, 411, "Content-Length is required");
    }
    if (contentLength > MAX_ASSET_BYTES) {
      return jsonError(c, 413, "Customization asset exceeds the 20 MB limit");
    }

    const buffer = await c.req.arrayBuffer();
    if (buffer.byteLength !== contentLength || buffer.byteLength > MAX_ASSET_BYTES) {
      return jsonError(c, 413, "Customization asset size is invalid");
    }

    const bytes = new Uint8Array(buffer);
    const dimensions = readImageDimensions(mimeType, bytes);
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
      return jsonError(c, 422, "Image data is invalid or unsupported");
    }

    const id = crypto.randomUUID();
    const objectKey = `uploads/${ownerKey}/${id}/original.${extensionForMimeType(mimeType)}`;
    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, buffer, {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        assetId: id,
        ownerKey,
        widthPx: String(dimensions.width),
        heightPx: String(dimensions.height),
      },
    });

    await getDb(c.env).insert(customizationAssets).values({
      id,
      ownerKey,
      objectKey,
      mimeType,
      widthPx: dimensions.width,
      heightPx: dimensions.height,
      byteSize: buffer.byteLength,
    });

    return c.json(
      {
        asset: {
          id,
          mimeType,
          widthPx: dimensions.width,
          heightPx: dimensions.height,
          byteSize: buffer.byteLength,
          contentUrl: `/api/customizations/assets/${id}/content`,
        },
      },
      201,
    );
  })
  .get("/:id/content", async (c) => {
    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const asset = await getDb(c.env)
      .select()
      .from(customizationAssets)
      .where(eq(customizationAssets.id, params.output.id))
      .get();
    if (!asset) {
      return jsonError(c, 404, "Customization asset not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Customization asset object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=3600");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  });
