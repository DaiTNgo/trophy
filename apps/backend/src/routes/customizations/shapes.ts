import { desc, eq, getTableColumns, sql } from "drizzle-orm";
import { Hono } from "hono";
import type { CustomShape } from "@trophy/customization";
import { validateSvgPathData } from "@trophy/customization";
import { getDb } from "../../db/client";
import { customizationShapes, customizationTemplateRevisions } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseJson, parseParams } from "../../lib/validation";
import { shapeCreateSchema, shapeDeleteParamsSchema } from "./schemas";

export const shapesRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select()
      .from(customizationShapes)
      .orderBy(desc(customizationShapes.createdAt));
    const shapes: CustomShape[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      svgPathData: row.svgPathData,
      type: row.type as CustomShape["type"],
      createdAt: row.createdAt,
    }));
    return c.json({ shapes }, 200);
  })
  .post("/", async (c) => {
    const parsed = await parseJson(c, shapeCreateSchema);
    if (!parsed.success) return parsed.response;

    const pathValidation = validateSvgPathData(parsed.output.svgPathData);
    if (!pathValidation.valid) return jsonError(c, 422, pathValidation.error!);

    const id = crypto.randomUUID();
    const db = getDb(c.env);
    await db.insert(customizationShapes).values({
      id,
      name: parsed.output.name,
      svgPathData: parsed.output.svgPathData,
      type: parsed.output.type,
    });

    return c.json({ shape: { id, name: parsed.output.name, svgPathData: parsed.output.svgPathData, type: parsed.output.type, createdAt: new Date().toISOString() } as CustomShape }, 201);
  })
  .delete("/:id", async (c) => {
    const params = parseParams(c, shapeDeleteParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const shape = await db
      .select()
      .from(customizationShapes)
      .where(eq(customizationShapes.id, params.output.id))
      .get();
    if (!shape) return jsonError(c, 404, "Custom shape not found");

    const revisionsUsing = await db
      .select({ id: customizationTemplateRevisions.id })
      .from(customizationTemplateRevisions)
      .where(sql`json_extract(blocks_json, '$.layers') LIKE ${`%${params.output.id}%`}`)
      .limit(1)
      .get();
    if (revisionsUsing) {
      return jsonError(c, 409, "Cannot delete shape that is in use by a template revision.");
    }

    await db.delete(customizationShapes).where(eq(customizationShapes.id, params.output.id));
    return c.json({ ok: true }, 200);
  });
