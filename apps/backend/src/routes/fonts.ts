import { Hono } from "hono";
import type { AppEnv } from "../lib/env";
import { getStaticFontBytes } from "../lib/static-fonts";

export const fontsRoute = new Hono<AppEnv>()
  .get("/:filename", async (c) => {
    const filename = c.req.param("filename");

    // 1. Check bundled static fonts (supports aliases like sans-regular, SansBold.ttf, etc.)
    const staticBytes = getStaticFontBytes(filename);
    if (staticBytes) {
      const headers = new Headers();
      headers.set("content-type", "font/ttf");
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("x-content-type-options", "nosniff");
      return new Response(staticBytes as unknown as BodyInit, { headers });
    }

    // 2. Check R2 CUSTOMIZATION_ASSETS storage under fonts/
    const targetFile = filename.includes(".") ? filename : `${filename}.ttf`;
    const key = `fonts/${targetFile}`;
    const object = await c.env.CUSTOMIZATION_ASSETS?.get(key);
    if (object) {
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      headers.set("cache-control", "public, max-age=31536000, immutable");
      headers.set("x-content-type-options", "nosniff");
      return new Response(object.body as unknown as ReadableStream, { headers });
    }

    return c.notFound();
  });
