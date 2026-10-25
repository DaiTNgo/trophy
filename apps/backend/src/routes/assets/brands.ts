import { Hono } from "hono";
import { fontResponse } from "../../lib/asset-response";
import type { AppEnv } from "../../lib/env";

export const assetsBrandsRoute = new Hono<AppEnv>()
  .get("/:id/content", async (c) => {
    // For backwards compatibility and to match other asset routes, we stream fonts from here.
    // The id here is the filename or asset id; uploads are stored as `fonts/<id>.ttf`.
    const id = c.req.param("id");
    const filename = id.includes(".") ? id : `${id}.ttf`;
    return (await fontResponse(c.env, id, `fonts/${filename}`)) ?? c.json({ error: "Not found" }, 404);
  })
  .get("/fonts/file/:filename", async (c) => {
    const filename = c.req.param("filename");
    return (await fontResponse(c.env, filename, `fonts/${filename}`)) ?? c.json({ error: "Not found" }, 404);
  });
