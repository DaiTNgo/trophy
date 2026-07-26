import { Hono } from "hono";
import * as v from "valibot";
import type { AppEnv } from "../../lib/env";
import {
  createMisaProducts,
  deleteMisaProducts,
  fetchMisaProducts,
  isMisaConfigured,
  updateMisaProducts,
  type MisaProductPayload,
} from "../../lib/misa";
import { jsonError, parseJson } from "../../lib/validation";

const productSchema = v.object({
  id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  product_code: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
  product_name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
  inactive: v.boolean(),
});

const productListSchema = v.pipe(v.array(productSchema), v.minLength(1));

export const adminMisaRoute = new Hono<AppEnv>()
  .get("/products", async (c) => {
    if (!isMisaConfigured(c.env)) return jsonError(c, 503, "MISA integration is not configured");
    try {
      const result = await fetchMisaProducts(c.env, {
        query: c.req.query("q"),
        page: Number(c.req.query("page") ?? 0),
        pageSize: Number(c.req.query("pageSize") ?? 100),
      });
      return c.json(result, 200);
    } catch (error) {
      return jsonError(c, 502, error instanceof Error ? error.message : "Unable to fetch MISA products");
    }
  })
  .post("/products", async (c) => {
    const parsed = await parseJson(c, productListSchema);
    if (!parsed.success) return parsed.response;
    if (!isMisaConfigured(c.env)) return jsonError(c, 503, "MISA integration is not configured");
    try {
      return c.json(await createMisaProducts(c.env, parsed.output as MisaProductPayload[]), 200);
    } catch (error) {
      return jsonError(c, 502, error instanceof Error ? error.message : "Unable to create MISA products");
    }
  })
  .put("/products", async (c) => {
    const parsed = await parseJson(c, productListSchema);
    if (!parsed.success) return parsed.response;
    if (!isMisaConfigured(c.env)) return jsonError(c, 503, "MISA integration is not configured");
    try {
      return c.json(await updateMisaProducts(c.env, parsed.output as MisaProductPayload[]), 200);
    } catch (error) {
      return jsonError(c, 502, error instanceof Error ? error.message : "Unable to update MISA products");
    }
  })
  .delete("/products", async (c) => {
    const parsed = await parseJson(c, v.pipe(v.array(v.pipe(v.number(), v.integer(), v.minValue(1))), v.minLength(1)));
    if (!parsed.success) return parsed.response;
    if (!isMisaConfigured(c.env)) return jsonError(c, 503, "MISA integration is not configured");
    try {
      return c.json(await deleteMisaProducts(c.env, parsed.output), 200);
    } catch (error) {
      return jsonError(c, 502, error instanceof Error ? error.message : "Unable to delete MISA products");
    }
  });
