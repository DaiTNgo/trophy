import { Hono } from "hono";
import type { AppEnv } from "../../lib/env";

export const assetsBrandsRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    // For backwards compatibility and to match other asset routes, we stream fonts from here.
    // The id here is the filename or asset id.
    const id = c.req.param("id");
    
    // Some assets are uploaded as `font_${id}.ttf`, let's check if the ID has extension
    const filename = id.includes(".") ? id : `${id}.ttf`;
    const key = `fonts/${filename}`;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(key);
    
    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    
    return new Response(object.body as unknown as ReadableStream, { headers });
  })
  .get("/fonts/file/:filename", async (c) => {
    const filename = c.req.param("filename");
    const key = `fonts/${filename}`;
    const object = await c.env.CUSTOMIZATION_ASSETS.get(key);
    
    if (!object) {
      return c.notFound();
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("cache-control", "public, max-age=31536000, immutable");
    
    return new Response(object.body as unknown as ReadableStream, { headers });
  });
