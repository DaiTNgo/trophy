import {
  validateTemplateForPublish,
  type CustomizationLayer,
  type CustomizationTemplate,
} from "@trophy/customization";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb } from "../../../db/client";
import { makeCustomizationUrlsAbsolute } from "../../../lib/url";
import {
  customizationDesignRevisions,
  customizationDesigns,
  customizationTemplateRevisions,
  customizationTemplates,
  products,
} from "../../../db/schema";
import type { AppEnv } from "../../../lib/env";
import { jsonError, parseJson, parseParams } from "../../../lib/validation";
import {
  buildTemplate,
  parseStoredEditorModel,
  readTemplateRevision,
  resolveAndValidateDesign,
  serializeEditorModel,
  type StoredEditorModel,
} from "./helpers";
import { renderPreviewSvg } from "./render";
import {
  exportPayloadSchema,
  productParamsSchema,
  templateInputSchema,
  templateParamsSchema,
  validatePayloadSchema,
} from "./schemas";

export const customizationsRoute = new Hono<AppEnv>()
  .post("/templates", async (c) => {
    const parsed = await parseJson(c, templateInputSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb(c.env);
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, parsed.output.productId))
      .get();
    if (!product) return jsonError(c, 404, "Product not found");

    const existing = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.productId, product.id))
      .get();
    const templateId = existing?.id ?? crypto.randomUUID();
    const previousRevision = existing
      ? ((
          await db
            .select({ revision: customizationTemplateRevisions.revision })
            .from(customizationTemplateRevisions)
            .where(eq(customizationTemplateRevisions.templateId, templateId))
            .orderBy(desc(customizationTemplateRevisions.revision))
            .get()
        )?.revision ?? 0)
      : 0;
    const revision = previousRevision + 1;
    const revisionId = crypto.randomUUID();
    const stored: StoredEditorModel = {
      background: parsed.output.background as CustomizationTemplate["background"],
      layers: parsed.output.layers as CustomizationLayer[],
      formFields: parsed.output.formFields as CustomizationTemplate["formFields"],
    };

    if (!existing) {
      await db.insert(customizationTemplates).values({
        id: templateId,
        productId: product.id,
        name: parsed.output.name,
        status: "draft",
      });
    } else {
      await db
        .update(customizationTemplates)
        .set({ name: parsed.output.name, updatedAt: new Date().toISOString() })
        .where(eq(customizationTemplates.id, templateId));
    }

    await db.insert(customizationTemplateRevisions).values({
      id: revisionId,
      templateId,
      revision,
      status: "draft",
      previewUrl: stored.background?.previewUrl ?? "",
      previewWidthPx: stored.background?.widthPx ?? 0,
      previewHeightPx: stored.background?.heightPx ?? 0,
      blocksJson: serializeEditorModel(stored),
    });

    return c.json(
      {
        template: makeCustomizationUrlsAbsolute(c, buildTemplate({
          id: templateId,
          productId: product.id,
          name: parsed.output.name,
          revision,
          status: "draft",
          stored,
        })),
      },
      201,
    );
  })
  .post("/templates/:id/publish", async (c) => {
    const params = parseParams(c, templateParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const templateRow = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.id, params.output.id))
      .get();
    if (!templateRow) return jsonError(c, 404, "Customization template not found");

    const latest = await readTemplateRevision(db, templateRow.id);
    if (!latest) return jsonError(c, 404, "Customization template revision not found");

    const template = makeCustomizationUrlsAbsolute(c, buildTemplate({
      id: templateRow.id,
      productId: templateRow.productId,
      name: templateRow.name,
      revision: latest.revision.revision,
      status: "draft",
      stored: latest.stored,
    }));
    const validation = validateTemplateForPublish(template);
    if (!validation.valid) return c.json(validation, 422);

    const publishedAt = new Date().toISOString();
    await db
      .update(customizationTemplateRevisions)
      .set({ status: "published", publishedAt })
      .where(eq(customizationTemplateRevisions.id, latest.revision.id));
    await db
      .update(customizationTemplates)
      .set({ status: "published", activeRevisionId: latest.revision.id, updatedAt: publishedAt })
      .where(eq(customizationTemplates.id, templateRow.id));

    return c.json({ ok: true, revision: latest.revision.revision }, 200);
  })
  .get("/templates/product/:productId", async (c) => {
    const params = parseParams(c, productParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const templateRow = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.productId, params.output.productId))
      .get();
    if (!templateRow) return jsonError(c, 404, "Customization template not found");

    const result = await readTemplateRevision(db, templateRow.id, templateRow.activeRevisionId);
    if (!result) return jsonError(c, 404, "Customization template revision not found");

    return c.json({
      template: makeCustomizationUrlsAbsolute(c, buildTemplate({
        id: templateRow.id,
        productId: templateRow.productId,
        name: templateRow.name,
        revision: result.revision.revision,
        status: result.revision.status === "published" ? "published" : "draft",
        stored: result.stored,
      })),
    }, 200);
  })
  .get("/templates", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select({
        template: customizationTemplates,
        product: { title: products.title, handle: products.handle },
        revision: {
          revision: customizationTemplateRevisions.revision,
          previewUrl: customizationTemplateRevisions.previewUrl,
          previewWidthPx: customizationTemplateRevisions.previewWidthPx,
          previewHeightPx: customizationTemplateRevisions.previewHeightPx,
          blocksJson: customizationTemplateRevisions.blocksJson,
        },
      })
      .from(customizationTemplates)
      .innerJoin(products, eq(customizationTemplates.productId, products.id))
      .innerJoin(customizationTemplateRevisions, eq(customizationTemplates.activeRevisionId, customizationTemplateRevisions.id))
      .where(eq(customizationTemplates.status, "published"))
      .orderBy(desc(customizationTemplates.updatedAt));

    const templates = rows.map((row) => {
      const stored = parseStoredEditorModel(row.revision.blocksJson);
      return {
        id: row.template.id,
        productId: String(row.template.productId),
        productTitle: row.product.title,
        productHandle: row.product.handle,
        name: row.template.name,
        revision: row.revision.revision,
        previewUrl: stored.background?.previewUrl ?? row.revision.previewUrl,
        previewWidthPx: stored.background?.widthPx ?? row.revision.previewWidthPx,
        previewHeightPx: stored.background?.heightPx ?? row.revision.previewHeightPx,
        blockCount: stored.layers.length,
        layerCount: stored.layers.length,
        createdAt: row.template.createdAt,
      };
    });

    return c.json({ templates }, 200);
  })
  .get("/templates/:id", async (c) => {
    const params = parseParams(c, templateParamsSchema);
    if (!params.success) return params.response;

    const db = getDb(c.env);
    const templateRow = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.id, params.output.id))
      .get();
    if (!templateRow || templateRow.status !== "published") {
      return jsonError(c, 404, "Customization template not found");
    }
    const result = await readTemplateRevision(db, templateRow.id, templateRow.activeRevisionId);
    if (!result) return jsonError(c, 404, "Customization template revision not found");

    return c.json({
      template: makeCustomizationUrlsAbsolute(c, buildTemplate({
        id: templateRow.id,
        productId: templateRow.productId,
        name: templateRow.name,
        revision: result.revision.revision,
        status: "published",
        stored: result.stored,
      })),
    }, 200);
  })
  .post("/designs", async (c) => {
    const parsed = await parseJson(c, validatePayloadSchema);
    if (!parsed.success) return parsed.response;

    const { result, design } = resolveAndValidateDesign(parsed.output.template, parsed.output.design);
    const db = getDb(c.env);
    const designId = design.id || crypto.randomUUID();
    const revisionId = crypto.randomUUID();

    await db.insert(customizationDesigns).values({
      id: designId,
      productId: Number(design.productId),
      templateRevisionId: `${design.templateId}:${design.templateRevision}`,
      currentRevision: design.revision,
      status: result.valid ? "validated" : "draft",
    });
    await db.insert(customizationDesignRevisions).values({
      id: revisionId,
      designId,
      revision: design.revision,
      status: result.valid ? "validated" : "draft",
      documentJson: JSON.stringify(design),
      validationJson: JSON.stringify(result),
    });

    return c.json({ designId, revisionId, ...result }, result.valid ? 201 : 422);
  })
  .post("/validate", async (c) => {
    const parsed = await parseJson(c, validatePayloadSchema);
    if (!parsed.success) return parsed.response;

    const { result } = resolveAndValidateDesign(parsed.output.template, parsed.output.design);
    return c.json(result, result.valid ? 200 : 422);
  })
  .post("/exports/svg", async (c) => {
    const parsed = await parseJson(c, exportPayloadSchema);
    if (!parsed.success) return parsed.response;

    const { result, design } = resolveAndValidateDesign(parsed.output.template, parsed.output.design);
    if (!result.valid) return c.json(result, 422);

    const svg = renderPreviewSvg(parsed.output.template, {
      ...design,
      layers: parsed.output.layerId
        ? design.layers.filter((layer) => layer.layerId === parsed.output.layerId)
        : design.layers,
    });
    return c.body(svg, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${parsed.output.layerId ?? design.id}.svg"`,
    });
  });
