import { Hono } from "hono";
import { getDb } from "../../db/client";
import { brandColors, fontFamilies } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { fontResponse } from "../../lib/asset-response";

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
    return (
      (await fontResponse(c.env, assetId, `fonts/${assetId}.ttf`)) ??
      c.json({ error: "Font file not found" }, 404)
    );
  });
