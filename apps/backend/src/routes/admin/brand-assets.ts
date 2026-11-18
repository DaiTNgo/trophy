import { isDefaultFontFamilyId } from "@trophy/customization";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { brandColors, fontFamilies } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { jsonError } from "../../lib/validation";
import { fontResponse } from "../../lib/asset-response";
import { buildBrandFontKey } from "../../lib/r2-media-keys";

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
  .get("/fonts/file/:assetId", async (c) => {
    const assetId = c.req.param("assetId");
    return (
      (await fontResponse(c.env, assetId, `fonts/${assetId}.ttf`)) ??
      c.json({ error: "Font file not found" }, 404)
    );
  })
  .post("/fonts", async (c) => {
    const body = await c.req.json();
    const { id, name, regularAssetId, boldAssetId, italicAssetId, boldItalicAssetId } = body;
    if (!id || !name) return jsonError(c, 400, "Missing required fields");
    if (isDefaultFontFamilyId(String(id))) {
      return jsonError(c, 422, `"${id}" is a built-in font family id and cannot be used for an uploaded font.`);
    }

    const db = getDb(c.env);
    const existing = await db.select({ id: fontFamilies.id }).from(fontFamilies).where(eq(fontFamilies.id, id));
    if (existing.length > 0) return jsonError(c, 409, `A font family with id "${id}" already exists.`);

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
  .patch("/fonts/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json();

    // Only allow patching the four asset ID columns; ignore everything else.
    const allowed: Array<keyof typeof fontFamilies.$inferInsert> = [
      "regularAssetId",
      "boldAssetId",
      "italicAssetId",
      "boldItalicAssetId",
    ];
    const patch: Partial<typeof fontFamilies.$inferInsert> = {};
    for (const key of allowed) {
      if (key in body) {
        // Allow explicit null to clear a variant; coerce undefined → skip.
        (patch as Record<string, unknown>)[key] = body[key] ?? null;
      }
    }

    if (Object.keys(patch).length === 0) {
      return jsonError(c, 400, "No patchable fields provided");
    }

    const db = getDb(c.env);
    const [font] = await db
      .update(fontFamilies)
      .set(patch)
      .where(eq(fontFamilies.id, id))
      .returning();

    if (!font) return jsonError(c, 404, "Font family not found");
    return c.json({ font });
  })
  .post("/fonts/upload", async (c) => {
    // Basic upload endpoint for TTF files
    const buffer = await c.req.arrayBuffer();
    const mimeType = c.req.header("content-type") ?? "font/ttf";

    // Use the canonical key builder so keys are consistent across the codebase
    const assetId = `font_${crypto.randomUUID()}`;
    const key = buildBrandFontKey(assetId);

    await c.env.CUSTOMIZATION_ASSETS.put(key, buffer, {
      httpMetadata: { contentType: mimeType },
    });

    return c.json({ assetId, key });
  });
