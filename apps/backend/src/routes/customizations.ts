import {
  buildDesignFromForm,
  renderZoneSvg,
  validateCustomizationValues,
  validateDesign,
  type CustomizationDesign,
  type CustomizationFormValues,
  type CustomizationTemplate,
  type CustomizationZone,
} from "@trophy/customization";
import { asc, count, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { PDFDocument, StandardFonts, grayscale } from "pdf-lib";
import * as v from "valibot";
import { getDb } from "../db/client";
import {
  customizationDesignRevisions,
  customizationDesigns,
  customizationTemplateRevisions,
  customizationTemplates,
  customizationZones,
  products,
} from "../db/schema";
import type { AppEnv } from "../lib/env";
import { jsonError, parseJson, parseParams } from "../lib/validation";

const finiteNumber = v.pipe(v.number(), v.finite());
const positiveNumber = v.pipe(finiteNumber, v.minValue(0.01));
const ratio = v.pipe(finiteNumber, v.minValue(0), v.maxValue(1));
const identifier = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120));

const zoneSchema = v.object({
  id: identifier,
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120)),
  previewBounds: v.object({
    xRatio: ratio,
    yRatio: ratio,
    widthRatio: positiveNumber,
    heightRatio: positiveNumber,
    rotationDeg: finiteNumber,
  }),
  widthMm: positiveNumber,
  heightMm: positiveNumber,
  bleedMm: v.pipe(finiteNumber, v.minValue(0)),
  safeMarginMm: v.pipe(finiteNumber, v.minValue(0)),
  allowedContent: v.pipe(v.array(v.union([v.literal("text"), v.literal("image")])), v.minLength(1)),
  textRules: v.object({
    fontIds: v.array(identifier),
    minFontSizePt: positiveNumber,
    maxFontSizePt: positiveNumber,
    alignment: v.union([v.literal("left"), v.literal("center"), v.literal("right")]),
    singleLine: v.literal(true),
  }),
  production: v.object({
    method: v.union([v.literal("print"), v.literal("engrave")]),
    colorMode: v.union([
      v.literal("rgb"),
      v.literal("cmyk"),
      v.literal("grayscale"),
      v.literal("monochrome"),
    ]),
    minImageDpi: v.pipe(v.number(), v.integer(), v.minValue(72), v.maxValue(2400)),
  }),
  blocks: v.pipe(
    v.array(v.unknown()),
    v.maxLength(100),
    v.transform((blocks) => blocks as CustomizationZone["blocks"]),
  ),
});

const templateInputSchema = v.object({
  productId: v.pipe(v.number(), v.integer(), v.minValue(1)),
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  previewUrl: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2_000_000)),
  zones: v.pipe(v.array(zoneSchema), v.minLength(1), v.maxLength(20)),
});

const templatePayloadSchema = v.object({
  template: v.object({
    id: identifier,
    productId: identifier,
    name: v.string(),
    revision: v.pipe(v.number(), v.integer(), v.minValue(1)),
    status: v.union([v.literal("draft"), v.literal("published")]),
    previewUrl: v.string(),
    zones: v.array(zoneSchema),
  }),
});

const layerSchema = v.union([
  v.object({
    id: identifier,
    zoneId: identifier,
    type: v.literal("text"),
    xRatio: ratio,
    yRatio: ratio,
    rotationDeg: finiteNumber,
    text: v.pipe(v.string(), v.maxLength(500)),
    fontId: identifier,
    fontSizePt: positiveNumber,
    color: v.pipe(v.string(), v.minLength(1), v.maxLength(64)),
    alignment: v.union([v.literal("left"), v.literal("center"), v.literal("right")]),
  }),
  v.object({
    id: identifier,
    zoneId: identifier,
    type: v.literal("image"),
    xRatio: ratio,
    yRatio: ratio,
    rotationDeg: finiteNumber,
    assetId: identifier,
    previewUrl: v.pipe(v.string(), v.minLength(1), v.maxLength(8_000_000)),
    sourceWidthPx: v.pipe(v.number(), v.integer(), v.minValue(1)),
    sourceHeightPx: v.pipe(v.number(), v.integer(), v.minValue(1)),
    widthRatio: positiveNumber,
    heightRatio: positiveNumber,
    cropXRatio: ratio,
    cropYRatio: ratio,
  }),
]);

const designSchema = v.object({
  id: identifier,
  productId: identifier,
  templateId: identifier,
  templateRevision: v.pipe(v.number(), v.integer(), v.minValue(1)),
  revision: v.pipe(v.number(), v.integer(), v.minValue(1)),
  status: v.union([v.literal("draft"), v.literal("validated"), v.literal("frozen")]),
  values: v.optional(
    v.pipe(
      v.record(v.string(), v.unknown()),
      v.transform((values) => values as CustomizationFormValues),
    ),
  ),
  layers: v.pipe(v.array(layerSchema), v.maxLength(100)),
});

const validatePayloadSchema = v.intersect([
  templatePayloadSchema,
  v.object({ design: designSchema }),
]);

const exportPayloadSchema = v.intersect([
  validatePayloadSchema,
  v.object({ zoneId: v.optional(identifier) }),
]);

const templateParamsSchema = v.object({ id: identifier });
const templateIdSchema = v.object({ id: v.pipe(v.string(), v.minLength(1)) });
const productParamsSchema = v.object({
  productId: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
});

const readTemplateRevision = async (
  db: ReturnType<typeof getDb>,
  templateId: string,
  revisionId?: string | null,
) => {
  const revision = revisionId
    ? await db
        .select()
        .from(customizationTemplateRevisions)
        .where(eq(customizationTemplateRevisions.id, revisionId))
        .get()
    : await db
        .select()
        .from(customizationTemplateRevisions)
        .where(eq(customizationTemplateRevisions.templateId, templateId))
        .orderBy(desc(customizationTemplateRevisions.revision))
        .get();

  if (!revision) {
    return null;
  }

  const rows = await db
    .select()
    .from(customizationZones)
    .where(eq(customizationZones.templateRevisionId, revision.id))
    .orderBy(asc(customizationZones.position));

  const zones: CustomizationZone[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    previewBounds: {
      xRatio: row.previewXRatio,
      yRatio: row.previewYRatio,
      widthRatio: row.previewWidthRatio,
      heightRatio: row.previewHeightRatio,
      rotationDeg: row.rotationDeg,
    },
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    bleedMm: row.bleedMm,
    safeMarginMm: row.safeMarginMm,
    allowedContent: JSON.parse(row.allowedContentJson),
    textRules: JSON.parse(row.textRulesJson),
    production: JSON.parse(row.productionJson),
    blocks: JSON.parse(row.blocksJson),
  }));

  return { revision, zones };
};

const parseDataUrl = (value: string) => {
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/s.exec(value);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    bytes: Uint8Array.from(atob(match[2]), (character) => character.charCodeAt(0)),
  };
};

const mmToPoints = (millimetres: number) => (millimetres / 25.4) * 72;

const resolveAndValidateDesign = (
  template: CustomizationTemplate,
  submittedDesign: CustomizationDesign,
) => {
  const design = submittedDesign.values
    ? {
        ...buildDesignFromForm({
          template,
          values: submittedDesign.values,
          designId: submittedDesign.id,
        }),
        revision: submittedDesign.revision,
        status: submittedDesign.status,
      }
    : submittedDesign;
  const formResult = submittedDesign.values
    ? validateCustomizationValues({ template, values: submittedDesign.values })
    : { valid: true, issues: [] };
  const productionResult = validateDesign({ template, design });
  return {
    design,
    result: {
      valid: formResult.valid && productionResult.valid,
      issues: [...formResult.issues, ...productionResult.issues],
    },
  };
};

export const customizationsRoute = new Hono<AppEnv>()
  .post("/templates", async (c) => {
    const parsed = await parseJson(c, templateInputSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const db = getDb(c.env);
    const product = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.id, parsed.output.productId))
      .get();

    if (!product) {
      return jsonError(c, 404, "Product not found");
    }

    const existing = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.productId, product.id))
      .get();

    const templateId = existing?.id ?? crypto.randomUUID();
    const nextRevision = existing
      ? ((
          await db
            .select({ revision: customizationTemplateRevisions.revision })
            .from(customizationTemplateRevisions)
            .where(eq(customizationTemplateRevisions.templateId, templateId))
            .orderBy(desc(customizationTemplateRevisions.revision))
            .get()
        )?.revision ?? 0)
      : 0;
    const revisionNumber = nextRevision + 1;
    const revisionId = crypto.randomUUID();

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
      revision: revisionNumber,
      status: "draft",
      previewUrl: parsed.output.previewUrl,
    });

    for (const [position, zone] of parsed.output.zones.entries()) {
      await db.insert(customizationZones).values({
        id: `${revisionId}:${zone.id}`,
        templateRevisionId: revisionId,
        name: zone.name,
        position,
        previewXRatio: zone.previewBounds.xRatio,
        previewYRatio: zone.previewBounds.yRatio,
        previewWidthRatio: zone.previewBounds.widthRatio,
        previewHeightRatio: zone.previewBounds.heightRatio,
        rotationDeg: zone.previewBounds.rotationDeg,
        widthMm: zone.widthMm,
        heightMm: zone.heightMm,
        bleedMm: zone.bleedMm,
        safeMarginMm: zone.safeMarginMm,
        allowedContentJson: JSON.stringify(zone.allowedContent),
        textRulesJson: JSON.stringify(zone.textRules),
        productionJson: JSON.stringify(zone.production),
        blocksJson: JSON.stringify(zone.blocks),
      });
    }

    return c.json(
      {
        template: {
          id: templateId,
          productId: String(product.id),
          name: parsed.output.name,
          revision: revisionNumber,
          status: "draft",
          previewUrl: parsed.output.previewUrl,
          zones: parsed.output.zones.map((zone) => ({
            ...zone,
            id: `${revisionId}:${zone.id}`,
          })),
        },
      },
      201,
    );
  })
  .post("/templates/:id/publish", async (c) => {
    const params = parseParams(c, templateParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const template = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.id, params.output.id))
      .get();
    if (!template) {
      return jsonError(c, 404, "Customization template not found");
    }

    const latest = await readTemplateRevision(db, template.id);
    if (!latest || latest.zones.length === 0) {
      return jsonError(c, 422, "Template requires at least one valid zone");
    }

    const publishedAt = new Date().toISOString();
    await db
      .update(customizationTemplateRevisions)
      .set({ status: "published", publishedAt })
      .where(eq(customizationTemplateRevisions.id, latest.revision.id));
    await db
      .update(customizationTemplates)
      .set({
        status: "published",
        activeRevisionId: latest.revision.id,
        updatedAt: publishedAt,
      })
      .where(eq(customizationTemplates.id, template.id));

    return c.json({ ok: true, revision: latest.revision.revision }, 200);
  })
  .get("/templates/product/:productId", async (c) => {
    const params = parseParams(c, productParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const template = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.productId, params.output.productId))
      .get();
    if (!template) {
      return jsonError(c, 404, "Customization template not found");
    }

    const result = await readTemplateRevision(db, template.id, template.activeRevisionId);
    if (!result) {
      return jsonError(c, 404, "Customization template revision not found");
    }

    return c.json(
      {
        template: {
          id: template.id,
          productId: String(template.productId),
          name: template.name,
          revision: result.revision.revision,
          status: result.revision.status === "published" ? "published" : "draft",
          previewUrl: result.revision.previewUrl,
          zones: result.zones,
        } satisfies CustomizationTemplate,
      },
      200,
    );
  })
  .get("/templates", async (c) => {
    const db = getDb(c.env);
    const rows = await db
      .select({
        template: customizationTemplates,
        product: {
          title: products.title,
          handle: products.handle,
        },
        revision: {
          revision: customizationTemplateRevisions.revision,
          previewUrl: customizationTemplateRevisions.previewUrl,
        },
      })
      .from(customizationTemplates)
      .innerJoin(
        products,
        eq(customizationTemplates.productId, products.id),
      )
      .innerJoin(
        customizationTemplateRevisions,
        eq(customizationTemplates.activeRevisionId, customizationTemplateRevisions.id),
      )
      .where(eq(customizationTemplates.status, "published"))
      .orderBy(desc(customizationTemplates.updatedAt));

    const templates = await Promise.all(
      rows.map(async (row) => {
        const activeRevisionId = row.template.activeRevisionId;
        const zoneRow = activeRevisionId
          ? await db
              .select({ count: count() })
              .from(customizationZones)
              .where(eq(customizationZones.templateRevisionId, activeRevisionId))
              .get()
          : null;
        return {
          id: row.template.id,
          productId: String(row.template.productId),
          productTitle: row.product.title,
          productHandle: row.product.handle,
          name: row.template.name,
          revision: row.revision.revision,
          previewUrl: row.revision.previewUrl,
          zoneCount: zoneRow?.count ?? 0,
          createdAt: row.template.createdAt,
        };
      }),
    );

    return c.json({ templates }, 200);
  })
  .get("/templates/:id", async (c) => {
    const params = parseParams(c, templateParamsSchema);
    if (!params.success) {
      return params.response;
    }

    const db = getDb(c.env);
    const template = await db
      .select()
      .from(customizationTemplates)
      .where(eq(customizationTemplates.id, params.output.id))
      .get();
    if (!template || template.status !== "published") {
      return jsonError(c, 404, "Customization template not found");
    }

    const result = await readTemplateRevision(db, template.id, template.activeRevisionId);
    if (!result) {
      return jsonError(c, 404, "Customization template revision not found");
    }

    return c.json(
      {
        template: {
          id: template.id,
          productId: String(template.productId),
          name: template.name,
          revision: result.revision.revision,
          status: "published",
          previewUrl: result.revision.previewUrl,
          zones: result.zones,
        } satisfies CustomizationTemplate,
      },
      200,
    );
  })
  .post("/designs", async (c) => {
    const parsed = await parseJson(c, validatePayloadSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { result, design } = resolveAndValidateDesign(
      parsed.output.template as CustomizationTemplate,
      parsed.output.design as CustomizationDesign,
    );
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
    if (!parsed.success) {
      return parsed.response;
    }

    const { result } = resolveAndValidateDesign(
      parsed.output.template as CustomizationTemplate,
      parsed.output.design as CustomizationDesign,
    );
    return c.json(result, result.valid ? 200 : 422);
  })
  .post("/exports/svg", async (c) => {
    const parsed = await parseJson(c, exportPayloadSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { result, design } = resolveAndValidateDesign(
      parsed.output.template as CustomizationTemplate,
      parsed.output.design as CustomizationDesign,
    );
    if (!result.valid) {
      return c.json(result, 422);
    }

    const zoneId = parsed.output.zoneId ?? parsed.output.template.zones[0]?.id;
    if (!zoneId) {
      return jsonError(c, 422, "A production zone is required");
    }

    const svg = renderZoneSvg({
      template: parsed.output.template,
      design,
      zoneId,
    });
    return c.body(svg, 200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${zoneId}.svg"`,
    });
  })
  .post("/exports/pdf", async (c) => {
    const parsed = await parseJson(c, validatePayloadSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { result, design } = resolveAndValidateDesign(
      parsed.output.template as CustomizationTemplate,
      parsed.output.design as CustomizationDesign,
    );
    if (!result.valid) {
      return c.json(result, 422);
    }

    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);

    for (const zone of parsed.output.template.zones) {
      const page = pdf.addPage([mmToPoints(zone.widthMm), mmToPoints(zone.heightMm)]);
      const safeWidth = zone.widthMm - zone.safeMarginMm * 2;
      const safeHeight = zone.heightMm - zone.safeMarginMm * 2;

      for (const layer of design.layers.filter((entry) => entry.zoneId === zone.id)) {
        const x = mmToPoints(zone.safeMarginMm + layer.xRatio * safeWidth);
        const y = mmToPoints(zone.safeMarginMm + layer.yRatio * safeHeight);

        if (layer.type === "text") {
          page.drawText(layer.text, {
            x: Math.max(0, x - font.widthOfTextAtSize(layer.text, layer.fontSizePt) / 2),
            y,
            size: layer.fontSizePt,
            font,
            color: grayscale(0),
          });
          continue;
        }

        const source = parseDataUrl(layer.previewUrl);
        if (!source) {
          continue;
        }

        const image =
          source.mimeType === "image/png"
            ? await pdf.embedPng(source.bytes)
            : await pdf.embedJpg(source.bytes);
        const width = mmToPoints(layer.widthRatio * safeWidth);
        const height = mmToPoints(layer.heightRatio * safeHeight);
        page.drawImage(image, {
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
        });
      }
    }

    pdf.setTitle(`Production artwork ${parsed.output.design.id}`);
    pdf.setSubject(
      JSON.stringify({
        productId: parsed.output.design.productId,
        templateRevision: parsed.output.design.templateRevision,
        designRevision: parsed.output.design.revision,
      }),
    );
    const bytes = await pdf.save();
    const body = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return c.body(body, 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${parsed.output.design.id}.pdf"`,
    });
  });
