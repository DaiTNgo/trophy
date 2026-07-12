import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../db/client";
import {
  customizationAssets,
  customizationClipartAssets,
  customizationClipartCategories,
} from "../../db/schema";
import { MAX_ASSET_BYTES } from "../../lib/asset-utils";
import {
  CLIPART_ASSET_OWNER_KEY,
  clipartAssetUpdateSchema,
  clipartCategoryCreateSchema,
  clipartCategoryReorderSchema,
  clipartCategoryUpdateSchema,
  clipartIdParamsSchema,
  extensionForClipartMimeType,
  prepareClipartBatchUpload,
  validateClipartCategoryForLibraryWrites,
} from "../../lib/clipart";
import type { AppEnv } from "../../lib/env";
import { jsonError, parseJson, parseParams } from "../../lib/validation";

import { toAbsoluteAssetUrl } from "../../lib/url";
import { type Context } from "hono";

const serializeCategory = (category: typeof customizationClipartCategories.$inferSelect) => ({
  id: category.id,
  name: category.name,
  active: category.active,
  sortOrder: category.sortOrder,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const serializeAsset = (c: Context<AppEnv>, asset: typeof customizationClipartAssets.$inferSelect) => ({
  id: asset.id,
  categoryId: asset.categoryId,
  sourceAssetId: asset.sourceAssetId,
  name: asset.name,
  fileName: asset.fileName,
  previewUrl: toAbsoluteAssetUrl(c, asset.previewUrl) as string,
  mimeType: asset.mimeType,
  sourceWidthPx: asset.sourceWidthPx,
  sourceHeightPx: asset.sourceHeightPx,
  active: asset.active,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

function normalizeFiles(input: unknown) {
  if (!input) return [] as File[];
  const values = Array.isArray(input) ? input : [input];
  return values.filter((value): value is File => value instanceof File);
}

export const adminClipartRoute = new Hono<AppEnv>()
  .get("/categories", async (c) => {
    const db = getDb(c.env);
    const activeOnly = c.req.query("active") === "true";
    const [categories, assetRows] = await Promise.all([
      db
        .select()
        .from(customizationClipartCategories)
        .where(activeOnly ? eq(customizationClipartCategories.active, true) : undefined)
        .orderBy(asc(customizationClipartCategories.sortOrder), asc(customizationClipartCategories.createdAt)),
      db
        .select({
          categoryId: customizationClipartAssets.categoryId,
          active: customizationClipartAssets.active,
        })
        .from(customizationClipartAssets),
    ]);

    const activeAssetCounts = new Map<string, number>();
    for (const asset of assetRows) {
      if (!asset.active) continue;
      activeAssetCounts.set(asset.categoryId, (activeAssetCounts.get(asset.categoryId) ?? 0) + 1);
    }

    return c.json(
      {
        categories: categories.map((category) => ({
          ...serializeCategory(category),
          activeAssetCount: activeAssetCounts.get(category.id) ?? 0,
        })),
      },
      200,
    );
  })
  .post("/categories", async (c) => {
    const parsed = await parseJson(c, clipartCategoryCreateSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb(c.env);
    const [category] = await db
      .insert(customizationClipartCategories)
      .values({
        id: crypto.randomUUID(),
        name: parsed.output.name,
      })
      .returning();

    return c.json({ category: serializeCategory(category) }, 201);
  })
  .patch("/categories/:id", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const parsed = await parseJson(c, clipartCategoryUpdateSchema);
    if (!parsed.success) return parsed.response;

    const updates: Record<string, unknown> = {};
    if (parsed.output.name !== undefined) updates.name = parsed.output.name;
    if (parsed.output.active !== undefined) updates.active = parsed.output.active;
    if (parsed.output.sortOrder !== undefined) updates.sortOrder = Math.max(0, Math.round(parsed.output.sortOrder));

    if (Object.keys(updates).length === 0) {
      return jsonError(c, 400, "No clipart category changes were provided");
    }

    const db = getDb(c.env);
    const [category] = await db
      .update(customizationClipartCategories)
      .set(updates)
      .where(eq(customizationClipartCategories.id, params.output.id))
      .returning();

    if (!category) return jsonError(c, 404, "Clipart category not found");
    return c.json({ category: serializeCategory(category) }, 200);
  })
  .post("/categories/reorder", async (c) => {
    const parsed = await parseJson(c, clipartCategoryReorderSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb(c.env);
    const categories = await db.select().from(customizationClipartCategories);
    const knownIds = new Set(categories.map((category) => category.id));

    if (new Set(parsed.output.categoryIds).size !== parsed.output.categoryIds.length) {
      return jsonError(c, 400, "Clipart category reorder contains duplicate IDs");
    }

    if (parsed.output.categoryIds.some((categoryId) => !knownIds.has(categoryId))) {
      return jsonError(c, 404, "Clipart category not found");
    }

    for (const [index, categoryId] of parsed.output.categoryIds.entries()) {
      await db
        .update(customizationClipartCategories)
        .set({ sortOrder: index })
        .where(eq(customizationClipartCategories.id, categoryId));
    }

    return c.json({ success: true }, 200);
  })
  .get("/categories/:id/assets", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;
    const activeOnly = c.req.query("active") === "true";

    const db = getDb(c.env);
    const category = await db
      .select()
      .from(customizationClipartCategories)
      .where(eq(customizationClipartCategories.id, params.output.id))
      .get();

    if (!category) {
      return jsonError(c, 404, "Clipart category not found");
    }

    const assets = await db
      .select()
      .from(customizationClipartAssets)
      .where(
        activeOnly
          ? and(
              eq(customizationClipartAssets.categoryId, params.output.id),
              eq(customizationClipartAssets.active, true),
            )
          : eq(customizationClipartAssets.categoryId, params.output.id),
      )
      .orderBy(asc(customizationClipartAssets.createdAt));

    return c.json({ assets: assets.map((a) => serializeAsset(c, a)) }, 200);
  })
  .post("/categories/:id/assets/batch", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const body = await c.req.parseBody({ all: true });
    const files = normalizeFiles(body.files);
    const namesInput = typeof body.namesJson === "string" ? body.namesJson : "[]";

    let names: string[];
    try {
      names = JSON.parse(namesInput) as string[];
    } catch {
      return jsonError(c, 400, "Clipart asset names must be valid JSON");
    }

    const db = getDb(c.env);
    const category = await db
      .select()
      .from(customizationClipartCategories)
      .where(eq(customizationClipartCategories.id, params.output.id))
      .get();
    const categoryValidation = validateClipartCategoryForLibraryWrites(category ?? null);

    if (!categoryValidation.ok) {
      return jsonError(c, categoryValidation.status, categoryValidation.error);
    }

    const preparedResult = await prepareClipartBatchUpload({
      files,
      names,
      maxAssetBytes: MAX_ASSET_BYTES,
    });

    if (!preparedResult.ok) {
      return c.json(
        {
          error: preparedResult.error,
          rowErrors: preparedResult.rowErrors ?? [],
        },
        preparedResult.status,
      );
    }

    const insertedAssets: Array<typeof customizationClipartAssets.$inferSelect> = [];
    const insertedClipartAssetIds: string[] = [];
    const insertedSourceAssetIds: string[] = [];
    const uploadedObjectKeys: string[] = [];

    try {
      for (const item of preparedResult.prepared) {
        const clipartAssetId = crypto.randomUUID();
        const sourceAssetId = crypto.randomUUID();
        const objectKey = `clipart/${params.output.id}/${clipartAssetId}/source.${extensionForClipartMimeType(item.mimeType)}`;
        const previewUrl = `/api/assets/customizations/${sourceAssetId}/content`;

        await c.env.CUSTOMIZATION_ASSETS.put(objectKey, item.buffer, {
          httpMetadata: { contentType: item.mimeType },
          customMetadata: {
            assetId: sourceAssetId,
            ownerKey: CLIPART_ASSET_OWNER_KEY,
            widthPx: String(item.metadata.width),
            heightPx: String(item.metadata.height),
          },
        });
        uploadedObjectKeys.push(objectKey);

        await db.insert(customizationAssets).values({
          id: sourceAssetId,
          ownerKey: CLIPART_ASSET_OWNER_KEY,
          objectKey,
          previewObjectKey: null,
          mimeType: item.mimeType,
          widthPx: item.metadata.width,
          heightPx: item.metadata.height,
          byteSize: item.buffer.byteLength,
        });
        insertedSourceAssetIds.push(sourceAssetId);

        const [asset] = await db
          .insert(customizationClipartAssets)
          .values({
            id: clipartAssetId,
            categoryId: params.output.id,
            sourceAssetId,
            name: item.displayName,
            fileName: item.fileName,
            previewUrl,
            mimeType: item.mimeType,
            sourceWidthPx: item.metadata.width,
            sourceHeightPx: item.metadata.height,
            active: true,
          })
          .returning();

        insertedClipartAssetIds.push(clipartAssetId);
        insertedAssets.push(asset);
      }
    } catch (error) {
      await Promise.allSettled(uploadedObjectKeys.map((objectKey) => c.env.CUSTOMIZATION_ASSETS.delete?.(objectKey)));
      for (const clipartAssetId of insertedClipartAssetIds) {
        await db.delete(customizationClipartAssets).where(eq(customizationClipartAssets.id, clipartAssetId));
      }
      for (const sourceAssetId of insertedSourceAssetIds) {
        await db.delete(customizationAssets).where(eq(customizationAssets.id, sourceAssetId));
      }
      console.error("Failed to persist clipart batch", error);
      return jsonError(c, 500, "Failed to upload clipart batch");
    }

    return c.json({ assets: insertedAssets.map((a) => serializeAsset(c, a)) }, 201);
  })
  .patch("/assets/:id", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const parsed = await parseJson(c, clipartAssetUpdateSchema);
    if (!parsed.success) return parsed.response;

    const updates: Record<string, unknown> = {};
    if (parsed.output.name !== undefined) updates.name = parsed.output.name;
    if (parsed.output.active !== undefined) updates.active = parsed.output.active;

    if (Object.keys(updates).length === 0) {
      return jsonError(c, 400, "No clipart asset changes were provided");
    }

    const db = getDb(c.env);
    const [asset] = await db
      .update(customizationClipartAssets)
      .set(updates)
      .where(eq(customizationClipartAssets.id, params.output.id))
      .returning();

    if (!asset) return jsonError(c, 404, "Clipart asset not found");
    return c.json({ asset: serializeAsset(c, asset) }, 200);
  })
  .delete("/assets/:id", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const [asset] = await db
      .update(customizationClipartAssets)
      .set({ active: false })
      .where(eq(customizationClipartAssets.id, params.output.id))
      .returning();

    if (!asset) return jsonError(c, 404, "Clipart asset not found");
    return c.json({ success: true, asset: serializeAsset(c, asset) }, 200);
  });
