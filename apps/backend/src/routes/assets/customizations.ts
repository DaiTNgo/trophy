import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getDb } from "../../db/client";
import { customizationAssets } from "../../db/schema";
import { storageObjectResponse } from "../../lib/asset-response";
import { assetParamsSchema } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseParams } from "../../lib/validation";

async function findCustomizationAsset(c: Context<AppEnv>) {
  const params = parseParams(c, assetParamsSchema);
  if (!params.success) return { ok: false as const, response: params.response };

  const asset = await getDb(c.env)
    .select()
    .from(customizationAssets)
    .where(eq(customizationAssets.id, params.output.id))
    .get();
  return { ok: true as const, asset };
}

export const assetsCustomizationsRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    const found = await findCustomizationAsset(c);
    if (!found.ok) return found.response;
    const { asset } = found;
    if (!asset) {
      return jsonError(c, 404, "Customization asset not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.previewObjectKey ?? asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Customization asset object not found");
    }
    return storageObjectResponse(object);
  })
  .get("/:id/export", async (c) => {
    const found = await findCustomizationAsset(c);
    if (!found.ok) return found.response;
    const { asset } = found;
    if (!asset) {
      return jsonError(c, 404, "Customization asset not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Customization asset object not found");
    }
    return storageObjectResponse(object, {
      "content-disposition": `attachment; filename="customization-asset-${asset.id}"`,
    });
  })
  .get("/:id/preview", async (c) => {
    const found = await findCustomizationAsset(c);
    if (!found.ok) return found.response;
    const { asset } = found;
    if (!asset?.previewObjectKey) {
      return jsonError(c, 404, "Customization asset preview not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.previewObjectKey);
    if (!object) {
      return jsonError(c, 404, "Customization asset preview object not found");
    }
    return storageObjectResponse(object);
  });
