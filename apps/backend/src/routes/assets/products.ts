import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getDb } from "../../db/client";
import { productAssets } from "../../db/schema";
import { storageObjectResponse } from "../../lib/asset-response";
import { assetParamsSchema } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseParams } from "../../lib/validation";

async function findProductAsset(c: Context<AppEnv>) {
  const params = parseParams(c, assetParamsSchema);
  if (!params.success) return { ok: false as const, response: params.response };

  const asset = await getDb(c.env)
    .select()
    .from(productAssets)
    .where(eq(productAssets.id, params.output.id))
    .get();
  if (!asset) return { ok: false as const, response: jsonError(c, 404, "Product asset not found") };

  return { ok: true as const, asset };
}

export const assetsProductsRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    const found = await findProductAsset(c);
    if (!found.ok) return found.response;

    const { asset } = found;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.previewObjectKey ?? asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Product asset object not found");
    }
    return storageObjectResponse(object);
  })
  .get("/:id/export", async (c) => {
    const found = await findProductAsset(c);
    if (!found.ok) return found.response;

    const { asset } = found;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Product asset object not found");
    }
    return storageObjectResponse(
      object,
      asset.fileName
        ? { "content-disposition": `attachment; filename="${encodeURIComponent(asset.fileName)}"` }
        : {},
    );
  })
  .get("/:id/preview", async (c) => {
    const found = await findProductAsset(c);
    if (!found.ok) return found.response;

    const { asset } = found;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.previewObjectKey ?? asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Product asset preview object not found");
    }
    return storageObjectResponse(object);
  });
