import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { brandColors, customizationAssets, customizationIconAssets, fontFamilies } from "../../db/schema";
import {
  extensionForIconMimeType,
  ICON_ASSET_OWNER_KEY,
  iconAssetParamsSchema,
  iconAssetUpdateSchema,
  parseTags,
  readIconMetadata,
} from "../../lib/icon-assets";
import { MAX_ASSET_BYTES } from "../../lib/asset-utils";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseJson, parseParams } from "../../lib/validation";

const serializeIconAsset = (icon: typeof customizationIconAssets.$inferSelect) => ({
  id: icon.id,
  sourceAssetId: icon.sourceAssetId,
  name: icon.name,
  categoryId: icon.categoryId,
  categoryLabel: icon.categoryLabel,
  tags: JSON.parse(icon.tagsJson || "[]") as string[],
  previewUrl: icon.previewUrl,
  mimeType: icon.mimeType,
  sourceWidthPx: icon.sourceWidthPx,
  sourceHeightPx: icon.sourceHeightPx,
  active: icon.active,
  createdAt: icon.createdAt,
  updatedAt: icon.updatedAt,
});

export const adminBrandAssetsRoute = new Hono<AppEnv>()
  .get("/colors", async (c) => {
    const db = getDb(c.env);
    const colors = await db.select().from(brandColors).orderBy(brandColors.createdAt);
    return c.json({ colors });
  })
  .post("/colors", async (c) => {
    const body = await c.req.json();
    const { id, name, hexCode } = body;
    if (!id || !name || !hexCode) return jsonError(c, 400, "Missing required fields");

    const db = getDb(c.env);
    const [color] = await db
      .insert(brandColors)
      .values({ id, name, hexCode })
      .returning();

    return c.json({ color });
  })
  .delete("/colors/:id", async (c) => {
    const id = c.req.param("id");
    const db = getDb(c.env);
    await db.delete(brandColors).where(eq(brandColors.id, id));
    return c.json({ success: true });
  })
  .get("/fonts", async (c) => {
    const db = getDb(c.env);
    const fonts = await db.select().from(fontFamilies).orderBy(fontFamilies.createdAt);
    return c.json({ fonts });
  })
  .post("/fonts", async (c) => {
    const body = await c.req.json();
    const { id, name, regularAssetId, boldAssetId, italicAssetId, boldItalicAssetId } = body;
    if (!id || !name) return jsonError(c, 400, "Missing required fields");

    const db = getDb(c.env);
    const [font] = await db
      .insert(fontFamilies)
      .values({
        id,
        name,
        regularAssetId: regularAssetId || null,
        boldAssetId: boldAssetId || null,
        italicAssetId: italicAssetId || null,
        boldItalicAssetId: boldItalicAssetId || null,
      })
      .returning();

    return c.json({ font });
  })
  .delete("/fonts/:id", async (c) => {
    const id = c.req.param("id");
    const db = getDb(c.env);
    await db.delete(fontFamilies).where(eq(fontFamilies.id, id));
    return c.json({ success: true });
  })
  .post("/fonts/upload", async (c) => {
    // Basic upload endpoint for TTF files
    const buffer = await c.req.arrayBuffer();
    const mimeType = c.req.header("content-type") ?? "font/ttf";
    
    // We just use a random ID for the asset
    const assetId = `font_${crypto.randomUUID()}`;
    const key = `fonts/${assetId}.ttf`;

    await c.env.CUSTOMIZATION_ASSETS.put(key, buffer, {
      httpMetadata: { contentType: mimeType },
    });

    return c.json({ assetId, key });
  })
  .get("/icons", async (c) => {
    const db = getDb(c.env);
    const icons = await db.select().from(customizationIconAssets).orderBy(customizationIconAssets.createdAt);
    return c.json({ icons: icons.map(serializeIconAsset) }, 200);
  })
  .post("/icons", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;
    const rawName = body.name;

    if (!(file instanceof File)) {
      return jsonError(c, 400, "Icon file is required");
    }

    if (typeof rawName !== "string" || rawName.trim().length === 0) {
      return jsonError(c, 400, "Icon name is required");
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_ASSET_BYTES) {
      return c.json({ error: "Icon asset size is invalid or exceeds the 20 MB limit" }, 413);
    }

    const mimeType = file.type || "application/octet-stream";
    const metadataResult = readIconMetadata({
      mimeType,
      bytes: new Uint8Array(buffer),
    });
    if (!metadataResult.ok) {
      return c.json({ error: metadataResult.error }, metadataResult.status);
    }

    const iconId = crypto.randomUUID();
    const sourceAssetId = crypto.randomUUID();
    const objectKey = `brand-icons/${iconId}/source.${extensionForIconMimeType(mimeType)}`;
    const previewUrl = `/api/assets/customizations/${sourceAssetId}/content`;
    const tags = parseTags(body.tags);

    await c.env.CUSTOMIZATION_ASSETS.put(objectKey, buffer, {
      httpMetadata: { contentType: mimeType },
      customMetadata: {
        assetId: sourceAssetId,
        ownerKey: ICON_ASSET_OWNER_KEY,
        widthPx: String(metadataResult.metadata.width),
        heightPx: String(metadataResult.metadata.height),
      },
    });

    const db = getDb(c.env);
    await db.insert(customizationAssets).values({
      id: sourceAssetId,
      ownerKey: ICON_ASSET_OWNER_KEY,
      objectKey,
      previewObjectKey: null,
      mimeType,
      widthPx: metadataResult.metadata.width,
      heightPx: metadataResult.metadata.height,
      byteSize: buffer.byteLength,
    });

    const [icon] = await db
      .insert(customizationIconAssets)
      .values({
        id: iconId,
        sourceAssetId,
        name: rawName.trim(),
        categoryId: typeof body.categoryId === "string" ? body.categoryId.trim() || null : null,
        categoryLabel: typeof body.categoryLabel === "string" ? body.categoryLabel.trim() || null : null,
        tagsJson: JSON.stringify(tags),
        previewUrl,
        mimeType,
        sourceWidthPx: metadataResult.metadata.width,
        sourceHeightPx: metadataResult.metadata.height,
        active: true,
      })
      .returning();

    return c.json({ icon: serializeIconAsset(icon) }, 201);
  })
  .patch("/icons/:id", async (c) => {
    const params = parseParams(c, iconAssetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const parsed = await parseJson(c, iconAssetUpdateSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const updates: Record<string, unknown> = {};
    if (parsed.output.name !== undefined) updates.name = parsed.output.name;
    if (parsed.output.categoryId !== undefined) updates.categoryId = parsed.output.categoryId;
    if (parsed.output.categoryLabel !== undefined) updates.categoryLabel = parsed.output.categoryLabel;
    if (parsed.output.tags !== undefined) updates.tagsJson = JSON.stringify(parsed.output.tags);

    if (Object.keys(updates).length === 0) {
      return jsonError(c, 400, "No icon metadata changes were provided");
    }

    const db = getDb(c.env);
    const [icon] = await db
      .update(customizationIconAssets)
      .set(updates)
      .where(eq(customizationIconAssets.id, params.output.id))
      .returning();

    if (!icon) {
      return jsonError(c, 404, "Icon asset not found");
    }

    return c.json({ icon: serializeIconAsset(icon) }, 200);
  })
  .delete("/icons/:id", async (c) => {
    const params = parseParams(c, iconAssetParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const [icon] = await db
      .update(customizationIconAssets)
      .set({ active: false })
      .where(eq(customizationIconAssets.id, params.output.id))
      .returning();

    if (!icon) {
      return jsonError(c, 404, "Icon asset not found");
    }

    return c.json({ success: true, icon: serializeIconAsset(icon) }, 200);
  });
