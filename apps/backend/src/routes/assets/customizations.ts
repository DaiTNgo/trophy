import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { customizationAssets } from "../../db/schema";
import { assetParamsSchema } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseParams } from "../../lib/validation";

export const assetsCustomizationsRoute = new Hono<AppEnv>()
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
      .from(customizationAssets)
      .where(eq(customizationAssets.id, params.output.id))
      .get();
    if (!asset || !asset.previewObjectKey) {
      return jsonError(c, 404, "Customization asset preview not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.previewObjectKey);
    if (!object) {
      return jsonError(c, 404, "Customization asset preview object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  });
