import { Hono } from "hono";
import { fontResponse } from "../lib/asset-response";
import type { AppEnv } from "../lib/env";

export const fontsRoute = new Hono<AppEnv>()
  .get("/:filename", async (c) => {
    // Bundled static fonts support aliases like sans-regular, SansBold.ttf, etc.
    const filename = c.req.param("filename");
    const targetFile = filename.includes(".") ? filename : `${filename}.ttf`;
    return (await fontResponse(c.env, filename, `fonts/${targetFile}`)) ?? c.json({ error: "Not found" }, 404);
  });
