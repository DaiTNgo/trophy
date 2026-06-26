import { and, eq } from "drizzle-orm";
import { Hono, type Context } from "hono";
import * as v from "valibot";
import { getDb } from "../db/client";
import { productAssets } from "../db/schema";
import { getAuth } from "../lib/auth";
import type { AppEnv } from "../lib/env";
import { jsonError, parseParams } from "../lib/validation";

const MAX_ASSET_BYTES = 20 * 1024 * 1024;
const allowedMimeTypes = new Set(["image/png", "image/jpeg"]);

const assetParamsSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
});

const cleanOwnerKey = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 120);

const extensionForMimeType = (mimeType: string) => (mimeType === "image/png" ? "png" : "jpg");

const readPngDimensions = (bytes: Uint8Array) => {
  if (
    bytes.length < 24 ||
    bytes[0] !== 0x89 ||
    bytes[1] !== 0x50 ||
    bytes[2] !== 0x4e ||
    bytes[3] !== 0x47
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

const readJpegDimensions = (bytes: Uint8Array) => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = bytes[offset + 1];
    if (marker === undefined || marker === 0xd9 || marker === 0xda) {
      break;
    }

    const segmentLength = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (segmentLength < 2 || offset + segmentLength + 2 > bytes.length) {
      return null;
    }

    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return {
        height: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
        width: (bytes[offset + 7]! << 8) | bytes[offset + 8]!,
      };
    }

    offset += segmentLength + 2;
  }

  return null;
};

const readImageDimensions = (mimeType: string, bytes: Uint8Array) =>
  mimeType === "image/png" ? readPngDimensions(bytes) : readJpegDimensions(bytes);

async function requireAdminSession(c: Context<AppEnv>) {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

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
      return c.json({ error: "Only PNG and JPEG product assets are supported" }, 415);
    }

    if (file.size <= 0 || file.size > MAX_ASSET_BYTES) {
      return c.json({ error: "Product asset exceeds the 20 MB limit" }, 413);
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength !== file.size || buffer.byteLength > MAX_ASSET_BYTES) {
      return c.json({ error: "Product asset size is invalid" }, 413);
    }

    const bytes = new Uint8Array(buffer);
    const dimensions = readImageDimensions(mimeType, bytes);
    if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
      return c.json({ error: "Image data is invalid or unsupported" }, 422);
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
          contentUrl: `/api/products/assets/${id}/content`,
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
