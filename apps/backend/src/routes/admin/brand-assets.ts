import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import { brandColors, fontFamilies } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { jsonError } from "../../lib/validation";

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
  });
