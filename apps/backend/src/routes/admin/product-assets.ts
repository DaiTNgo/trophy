import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { getDb } from "../../db/client";
import { productAssets } from "../../db/schema";
import { getAdminSession } from "../../lib/admin-session";
import {
  allowedMimeTypes,
  assetParamsSchema,
  cleanOwnerKey,
  extensionForMimeType,
  MAX_ASSET_BYTES,
} from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { readImageDimensions } from "../../lib/image-dimensions";
import { jsonError, parseParams } from "../../lib/validation";

async function requireAdminSession(c: Context<AppEnv>) {
  const session = await getAdminSession(c.env, c.req.raw.headers);

  if (!session?.user) {
    return {
      ok: false as const,
      response: c.json({ error: "Unauthorized" }, 401),
    };
  }

  return {
    ok: true as const,
    userId: cleanOwnerKey(session.user.id),
  };
}

export const productAssetsRoute = new Hono<AppEnv>()
  .post("/", async (c) => {
    const session = await requireAdminSession(c);
    if (!session.ok) {
      return session.response;
    }

    const formData = await c.req.formData().catch(() => null);
    const file = formData?.get("file");
    if (!(file instanceof File)) {
      return c.json({ error: "File is required" }, 400);
    }

    const mimeType = file.type.trim();
    if (!allowedMimeTypes.has(mimeType)) {
      return c.json({ error: "Only PNG, JPEG, and PDF product assets are supported" }, 415);
    }

    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) {
      return c.json({ error: "Product asset exceeds the 20 MB limit" }, 413);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) {
      return c.json({ error: "Product asset size is invalid" }, 413);
    }

    let dimensions: { width: number; height: number } | null = null;
    const widthStr = formData?.get("widthPx");
    const heightStr = formData?.get("heightPx");
    const clientWidth = widthStr ? Number(widthStr) : NaN;
    const clientHeight = heightStr ? Number(heightStr) : NaN;

    if (Number.isFinite(clientWidth) && Number.isFinite(clientHeight) && clientWidth > 0 && clientHeight > 0) {
      dimensions = { width: clientWidth, height: clientHeight };
    } else if (mimeType === "application/pdf") {
      // Fallback for PDFs if client didn't provide dimensions
      dimensions = { width: 800, height: 1131 };
    } else {
      const bytes = new Uint8Array(buffer);
      dimensions = readImageDimensions(mimeType, bytes);
    }

    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
      return c.json({ error: "Media data is invalid or unsupported" }, 422);
    }

    const id = crypto.randomUUID();
    const objectKey = `product-assets/${session.userId}/${id}/original.${extensionForMimeType(mimeType)}`;
    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, buffer, {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        assetId: id,
        ownerKey: session.userId,
        fileName: file.name,
        widthPx: String(dimensions.width),
        heightPx: String(dimensions.height),
      },
    });

    await getDb(c.env).insert(productAssets).values({
      id,
      ownerKey: session.userId,
      objectKey,
      fileName: file.name,
      mimeType,
      widthPx: dimensions.width,
      heightPx: dimensions.height,
      byteSize: buffer.byteLength,
    });

    return c.json(
      {
        asset: {
          id,
          fileName: file.name,
          mimeType,
          widthPx: dimensions.width,
          heightPx: dimensions.height,
          byteSize: buffer.byteLength,
          contentUrl: `/api/admin/products/assets/${id}/content`,
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
      .from(productAssets)
      .where(eq(productAssets.id, params.output.id))
      .get();
    if (!asset) {
      return jsonError(c, 404, "Product asset not found");
    }

    const object = await c.env.CUSTOMIZATION_ASSETS.get(asset.objectKey);
    if (!object) {
      return jsonError(c, 404, "Product asset object not found");
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=3600");
    headers.set("x-content-type-options", "nosniff");
    return new Response(object.body, { headers });
  })
  .delete("/:id", async (c) => {
    const session = await requireAdminSession(c);
    if (!session.ok) {
      return session.response;
    }

    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const asset = await db
      .select()
      .from(productAssets)
      .where(
        and(
          eq(productAssets.id, params.output.id),
          eq(productAssets.ownerKey, session.userId),
        ),
      )
      .get();

    if (!asset) {
      return jsonError(c, 404, "Product asset not found");
    }

    await c.env.CUSTOMIZATION_ASSETS.delete(asset.objectKey);
    await db.delete(productAssets).where(eq(productAssets.id, asset.id));

    return c.json({ ok: true }, 200);
  })
  .post("/:id/delete", async (c) => {
    const session = await requireAdminSession(c);
    if (!session.ok) {
      return session.response;
    }

    const params = parseParams(c, assetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const asset = await db
      .select()
      .from(productAssets)
      .where(
        and(
          eq(productAssets.id, params.output.id),
          eq(productAssets.ownerKey, session.userId),
        ),
      )
      .get();

    if (!asset) {
      return jsonError(c, 404, "Product asset not found");
    }

    await c.env.CUSTOMIZATION_ASSETS.delete(asset.objectKey);
    await db.delete(productAssets).where(eq(productAssets.id, asset.id));

    return c.json({ ok: true }, 200);
  });
