import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { orderItemMediaTransferAssets } from "../../db/schema";
import { assetParamsSchema } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseParams } from "../../lib/validation";

export const assetsOrdersRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const asset = await getDb(c.env)
      .select()
      .from(orderItemMediaTransferAssets)
      .where(eq(orderItemMediaTransferAssets.id, params.output.id))
      .get();
    if (!asset) {
      return jsonError(c, 404, "Order asset not found");
    }

    let object = await c.env.CUSTOMIZATION_ASSETS.get(asset.targetObjectKey);
    if (!object && asset.sourceObjectKey) {
      // Graceful fallback to source object if target has not yet been copied or failed
      object = await c.env.CUSTOMIZATION_ASSETS.get(asset.sourceObjectKey);
    }
    if (!object) {
      return jsonError(c, 404, "Order asset object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  })
  .get("/:id/preview", async (c) => {
    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const asset = await getDb(c.env)
      .select()
      .from(orderItemMediaTransferAssets)
      .where(eq(orderItemMediaTransferAssets.id, params.output.id))
      .get();
    if (!asset) {
      return jsonError(c, 404, "Order asset not found");
    }

    const targetKey = asset.targetPreviewObjectKey ?? asset.targetObjectKey;
    let object = await c.env.CUSTOMIZATION_ASSETS.get(targetKey);
    if (!object) {
      const sourceKey = asset.sourcePreviewObjectKey ?? asset.sourceObjectKey;
      if (sourceKey) {
        object = await c.env.CUSTOMIZATION_ASSETS.get(sourceKey);
      }
    }
    if (!object) {
      return jsonError(c, 404, "Order asset preview object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  });
