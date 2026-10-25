import { eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getDb } from "../../db/client";
import { orderItemMediaTransferAssets } from "../../db/schema";
import { storageObjectResponse } from "../../lib/asset-response";
import { assetParamsSchema } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseParams } from "../../lib/validation";

async function findOrderAsset(c: Context<AppEnv>) {
  const params = parseParams(c, assetParamsSchema);
  if (!params.success) return { ok: false as const, response: params.response };

  const asset = await getDb(c.env)
    .select()
    .from(orderItemMediaTransferAssets)
    .where(eq(orderItemMediaTransferAssets.id, params.output.id))
    .get();
  if (!asset) return { ok: false as const, response: jsonError(c, 404, "Order asset not found") };

  return { ok: true as const, asset };
}

/** Reads the copied order object, falling back to the source while the transfer is pending or failed. */
async function getTransferredObject(c: Context<AppEnv>, targetKey: string, sourceKey: string | null) {
  const object = await c.env.CUSTOMIZATION_ASSETS.get(targetKey);
  if (object || !sourceKey) return object;
  return c.env.CUSTOMIZATION_ASSETS.get(sourceKey);
}

export const assetsOrdersRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    const found = await findOrderAsset(c);
    if (!found.ok) return found.response;

    const { asset } = found;
    const object = await getTransferredObject(c, asset.targetObjectKey, asset.sourceObjectKey);
    if (!object) {
      return jsonError(c, 404, "Order asset object not found");
    }
    return storageObjectResponse(object);
  })
  .get("/:id/preview", async (c) => {
    const found = await findOrderAsset(c);
    if (!found.ok) return found.response;

    const { asset } = found;
    const object = await getTransferredObject(
      c,
      asset.targetPreviewObjectKey ?? asset.targetObjectKey,
      asset.sourcePreviewObjectKey ?? asset.sourceObjectKey,
    );
    if (!object) {
      return jsonError(c, 404, "Order asset preview object not found");
    }
    return storageObjectResponse(object);
  });
