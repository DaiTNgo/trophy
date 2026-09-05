import { Hono } from "hono";
import { getDb } from "../../db/client";
import { brandColors, fontFamilies } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { getStaticFontBytes } from "../../lib/static-fonts";

export const storefrontBrandAssetsRoute = new Hono<AppEnv>()
  .get("/colors", async (c) => {
    const db = getDb(c.env);
    const colors = await db.select().from(brandColors).orderBy(brandColors.createdAt);
    return c.json({ colors });
  })
  .get("/fonts", async (c) => {
    const db = getDb(c.env);
    const fonts = await db.select().from(fontFamilies).orderBy(fontFamilies.createdAt);
    return c.json({ fonts });
  })
  .get("/fonts/file/:assetId", async (c) => {
    const assetId = c.req.param("assetId");

    const staticBytes = getStaticFontBytes(assetId);
    if (staticBytes) {
      const headers = new Headers();
      headers.set("content-type", "font/ttf");
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("x-content-type-options", "nosniff");
      return new Response(staticBytes as unknown as BodyInit, { headers });
    }

    const key = `fonts/${assetId}.ttf`;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(key);
    
    if (!object) {
      return c.json({ error: "Font file not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "private, max-age=31536000, immutable");
    headers.set("x-content-type-options", "nosniff");
    
    return new Response(object.body as unknown as ReadableStream, { headers });
  });
