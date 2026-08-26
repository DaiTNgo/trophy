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
  type ClipartBatchAssetName,
} from "../../lib/clipart";
import type { AppEnv } from "../../lib/env";
import { hydrateTranslations, upsertTranslations } from "../../lib/catalog-translation";
import { jsonError, parseJson, parseParams } from "../../lib/validation";

import { toAbsoluteAssetUrl } from "../../lib/url";
import { type Context } from "hono";
import type { Database } from "../../db/client";
import type { ClipartNameTranslations } from "../../lib/clipart";

function clipartNameTranslationValues(name: string, translations?: ClipartNameTranslations) {
  const values: Record<string, string | null> = { vi: name };
  if (translations?.vi) values.vi = translations.vi;
  if (translations?.en !== undefined) values.en = translations.en;
  return values;
}

const serializeCategory = (category: typeof customizationClipartCategories.$inferSelect & { _nameLoc?: Record<string, string> }) => ({
  id: category.id,
  name: category.name,
  nameTranslations: category._nameLoc ?? { vi: category.name, en: "" },
  active: category.active,
  sortOrder: category.sortOrder,
  createdAt: category.createdAt,
  updatedAt: category.updatedAt,
});

const serializeAsset = (
  c: Context<AppEnv>,
  asset: typeof customizationClipartAssets.$inferSelect & { _nameLoc?: Record<string, string> },
) => ({
  id: asset.id,
  categoryId: asset.categoryId,
  sourceAssetId: asset.sourceAssetId,
  name: asset.name,
  nameTranslations: asset._nameLoc ?? { vi: asset.name, en: "" },
  fileName: asset.fileName,
  previewUrl: toAbsoluteAssetUrl(c, asset.previewUrl) as string,
  mimeType: asset.mimeType,
  sourceWidthPx: asset.sourceWidthPx,
  sourceHeightPx: asset.sourceHeightPx,
  active: asset.active,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

const NAME_HYDRATE_FIELDS = [{ fieldName: "name", objectKey: "_nameLoc" }];
const NAME_FALLBACK_FIELDS = [{ fieldName: "name", objectKey: "name" }];

async function persistClipartName(
  db: Database,
  ownerType: "clipart_category" | "clipart_asset",
  ownerKey: string,
  name: string,
  translations?: ClipartNameTranslations,
) {
  await upsertTranslations(db, ownerType, ownerKey, "name", clipartNameTranslationValues(name, translations));
}

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

    const hydratedCategories = await hydrateTranslations(
      db,
      "clipart_category",
      categories,
      (category) => category.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json(
      {
        categories: hydratedCategories.map((category) => ({
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

    if (parsed.output.nameTranslations !== undefined) {
      await persistClipartName(db, "clipart_category", category.id, category.name, parsed.output.nameTranslations);
    }

    const [hydrated] = await hydrateTranslations(
      db,
      "clipart_category",
      [category],
      (entry) => entry.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json({ category: serializeCategory(hydrated) }, 201);
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

    if (Object.keys(updates).length === 0 && parsed.output.nameTranslations === undefined) {
      return jsonError(c, 400, "No clipart category changes were provided");
    }

    const db = getDb(c.env);
    const [category] = await db
      .update(customizationClipartCategories)
      .set(updates)
      .where(eq(customizationClipartCategories.id, params.output.id))
      .returning();

    if (!category) return jsonError(c, 404, "Clipart category not found");

    if (parsed.output.nameTranslations !== undefined) {
      await persistClipartName(db, "clipart_category", category.id, category.name, parsed.output.nameTranslations);
    }

    const [hydrated] = await hydrateTranslations(
      db,
      "clipart_category",
      [category],
      (entry) => entry.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json({ category: serializeCategory(hydrated) }, 200);
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

    if (assets.length === 0) {
      return c.json({ assets: [] }, 200);
    }

    const hydratedAssets = await hydrateTranslations(
      db,
      "clipart_asset",
      assets,
      (asset) => asset.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json({ assets: hydratedAssets.map((a) => serializeAsset(c, a)) }, 200);
  })
  .post("/categories/:id/assets/batch", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const body = await c.req.parseBody({ all: true });
    const files = normalizeFiles(body.files);
    const namesInput = typeof body.namesJson === "string" ? body.namesJson : "[]";

    let names: ClipartBatchAssetName[];
    try {
      names = JSON.parse(namesInput) as ClipartBatchAssetName[];
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

        if (item.nameTranslations !== undefined) {
          await persistClipartName(db, "clipart_asset", clipartAssetId, asset.name, item.nameTranslations);
        }
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

    const hydratedInsertedAssets = await hydrateTranslations(
      db,
      "clipart_asset",
      insertedAssets,
      (asset) => asset.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json({ assets: hydratedInsertedAssets.map((a) => serializeAsset(c, a)) }, 201);
  })
  .patch("/assets/:id", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const parsed = await parseJson(c, clipartAssetUpdateSchema);
    if (!parsed.success) return parsed.response;

    const updates: Record<string, unknown> = {};
    if (parsed.output.name !== undefined) updates.name = parsed.output.name;
    if (parsed.output.active !== undefined) updates.active = parsed.output.active;

    if (Object.keys(updates).length === 0 && parsed.output.nameTranslations === undefined) {
      return jsonError(c, 400, "No clipart asset changes were provided");
    }

    const db = getDb(c.env);
    const [asset] = await db
      .update(customizationClipartAssets)
      .set(updates)
      .where(eq(customizationClipartAssets.id, params.output.id))
      .returning();

    if (!asset) return jsonError(c, 404, "Clipart asset not found");

    if (parsed.output.nameTranslations !== undefined) {
      await persistClipartName(db, "clipart_asset", asset.id, asset.name, parsed.output.nameTranslations);
    }

    const [hydrated] = await hydrateTranslations(
      db,
      "clipart_asset",
      [asset],
      (entry) => entry.id,
      NAME_HYDRATE_FIELDS,
      NAME_FALLBACK_FIELDS,
    );

    return c.json({ asset: serializeAsset(c, hydrated) }, 200);
  })
  .delete("/assets/:id", async (c) => {
    const params = parseParams(c, clipartIdParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const asset = await db
      .select()
      .from(customizationClipartAssets)
      .where(eq(customizationClipartAssets.id, params.output.id))
      .get();

    if (!asset) return jsonError(c, 404, "Clipart asset not found");

    const sourceAsset = await db
      .select()
      .from(customizationAssets)
      .where(eq(customizationAssets.id, asset.sourceAssetId))
      .get();

    if (sourceAsset) {
      await c.env.CUSTOMIZATION_ASSETS.delete(sourceAsset.objectKey);
      if (sourceAsset.previewObjectKey && sourceAsset.previewObjectKey !== sourceAsset.objectKey) {
        await c.env.CUSTOMIZATION_ASSETS.delete(sourceAsset.previewObjectKey);
      }
    }

    await db.delete(customizationClipartAssets).where(eq(customizationClipartAssets.id, asset.id));
    if (sourceAsset) {
      await db.delete(customizationAssets).where(eq(customizationAssets.id, sourceAsset.id));
    }

    return c.json({ success: true }, 200);
  });
