import {
  buildDesignFromForm,
  validateCustomizationValues,
  validateTemplateForPublish,
  type CustomizationDesign,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
} from "@trophy/customization";
import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { PDFDocument, StandardFonts, grayscale } from "pdf-lib";
import * as v from "valibot";
import { getDb } from "../db/client";
import {
  customizationDesignRevisions,
  customizationDesigns,
  customizationTemplateRevisions,
  customizationTemplates,
  products,
} from "../db/schema";
import type { AppEnv } from "../lib/env";
import { jsonError, parseJson, parseParams } from "../lib/validation";

const identifier = v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(120));
const productIdInput = v.union([
  v.pipe(v.number(), v.integer(), v.minValue(1)),
  v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
]);

const templateInputSchema = v.object({
  productId: productIdInput,
  name: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(160)),
  background: v.nullable(v.unknown()),
  layers: v.pipe(v.array(v.unknown()), v.maxLength(200)),
  formFields: v.pipe(v.array(v.unknown()), v.maxLength(200)),
});

const templatePayloadSchema = v.object({
  template: v.pipe(v.unknown(), v.transform((template) => template as CustomizationTemplate)),
});

const designSchema = v.pipe(v.unknown(), v.transform((design) => design as CustomizationDesign));

const validatePayloadSchema = v.intersect([
  templatePayloadSchema,
  v.object({ design: designSchema }),
]);

const exportPayloadSchema = v.intersect([
  validatePayloadSchema,
  v.object({ layerId: v.optional(identifier) }),
]);

const templateParamsSchema = v.object({ id: identifier });
const productParamsSchema = v.object({
  productId: v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1)),
});

type StoredEditorModel = Pick<CustomizationTemplate, "background" | "layers" | "formFields">;

const serializeEditorModel = (template: Pick<CustomizationTemplate, "background" | "layers" | "formFields">) =>
  JSON.stringify({
    background: template.background,
    layers: template.layers,
    formFields: template.formFields,
  } satisfies StoredEditorModel);

const parseStoredEditorModel = (value: string): StoredEditorModel => {
  const parsed = JSON.parse(value) as Partial<StoredEditorModel>;
  return {
    background: parsed.background ?? null,
    layers: Array.isArray(parsed.layers) ? parsed.layers : [],
    formFields: Array.isArray(parsed.formFields) ? parsed.formFields : [],
  };
};

const buildTemplate = ({
  id,
  productId,
  name,
  revision,
  status,
  stored,
}: {
  id: string;
  productId: number | string;
  name: string;
  revision: number;
  status: CustomizationTemplate["status"];
  stored: StoredEditorModel;
}): CustomizationTemplate => ({
  id,
  productId: String(productId),
  name,
  revision,
  status,
  background: stored.background,
  layers: stored.layers,
  formFields: stored.formFields,
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

  if (!revision) return null;
  return {
    revision,
    stored: parseStoredEditorModel(revision.blocksJson),
  };
};

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
  const templateResult = validateTemplateForPublish(template);
  const formResult = submittedDesign.values
    ? validateCustomizationValues({ template, values: submittedDesign.values })
    : { valid: true, issues: [] };
  return {
    design,
    result: {
      valid: templateResult.valid && formResult.valid,
      issues: [...templateResult.issues, ...formResult.issues],
    },
  };
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const textPathD = (layer: Extract<CustomizationDesign["layers"][number], { type: "text" }>, width: number, height: number) => {
  const cx = layer.geometry.xRatio * width;
  const cy = layer.geometry.yRatio * height;
  const w = layer.geometry.widthRatio * width;
  const path = layer.path;
  if (path.type === "arc_up" || path.type === "arc_down") {
    const curve = Math.max(0, Math.min(1, path.curveAmount)) * w * (path.type === "arc_up" ? -0.35 : 0.35);
    return `M ${cx - w / 2} ${cy} Q ${cx} ${cy + curve} ${cx + w / 2} ${cy}`;
  }
  if (path.type === "circle_top" || path.type === "circle_bottom") {
    const radius = Math.max(1, path.radiusRatio * w);
    const sweep = path.type === "circle_top" ? 1 : 0;
    return `M ${cx - w / 2} ${cy} A ${radius} ${radius} 0 0 ${sweep} ${cx + w / 2} ${cy}`;
  }
  if (path.type === "custom" && path.points.length > 0) {
    const x0 = cx - w / 2;
    const h = layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
    return path.points
      .map((point, index) => {
        const x = x0 + point.xRatio * w;
        const y = cy - h / 2 + point.yRatio * h;
        if (index === 0) return `M ${x} ${y}`;
        const previous = path.points[index - 1]!;
        const px = x0 + previous.xRatio * w;
        const py = cy - h / 2 + previous.yRatio * h;
        const c1x = px + (previous.outHandle?.xRatio ?? 0) * w;
        const c1y = py + (previous.outHandle?.yRatio ?? 0) * h;
        const c2x = x + (point.inHandle?.xRatio ?? 0) * w;
        const c2y = y + (point.inHandle?.yRatio ?? 0) * h;
        return `C ${c1x} ${c1y} ${c2x} ${c2y} ${x} ${y}`;
      })
      .join(" ");
  }
  return `M ${cx - w / 2} ${cy} L ${cx + w / 2} ${cy}`;
};

const shapeClipSvg = ({
  shape,
  x,
  y,
  width,
  height,
}: {
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) => {
  if (shape === "circle" || shape === "ellipse") {
    return `<ellipse cx="${x + width / 2}" cy="${y + height / 2}" rx="${width / 2}" ry="${height / 2}" />`;
  }
  if (shape === "rounded_rectangle") {
    const radius = Math.min(width, height) * 0.12;
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" />`;
  }
  if (shape === "star") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 0.5 : 0.22;
      return `${x + width / 2 + Math.cos(angle) * width * radius},${y + height / 2 + Math.sin(angle) * height * radius}`;
    }).join(" ");
    return `<polygon points="${points}" />`;
  }
  if (shape === "heart") {
    return `<path d="M ${x + width / 2} ${y + height * 0.85} C ${x + width * 0.1} ${y + height * 0.55}, ${x} ${y + height * 0.25}, ${x + width * 0.25} ${y + height * 0.12} C ${x + width * 0.4} ${y}, ${x + width / 2} ${y + height * 0.16}, ${x + width / 2} ${y + height * 0.28} C ${x + width / 2} ${y + height * 0.16}, ${x + width * 0.6} ${y}, ${x + width * 0.75} ${y + height * 0.12} C ${x + width} ${y + height * 0.25}, ${x + width * 0.9} ${y + height * 0.55}, ${x + width / 2} ${y + height * 0.85} Z" />`;
  }
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" />`;
};

const parseDataUrl = (value: string) => {
  const match = /^data:(image\/(?:png|jpeg|svg\+xml));(?:charset=[^,]+,|base64,)?(.+)$/s.exec(value);
  if (!match) return null;
  const mimeType = match[1]!;
  if (mimeType === "image/svg+xml") return null;
  return {
    mimeType,
    bytes: Uint8Array.from(atob(match[2]!), (character) => character.charCodeAt(0)),
  };
};

const readImageBytes = async (url: string) => {
  const dataUrl = parseDataUrl(url);
  if (dataUrl) return dataUrl;
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;
  const mimeType = response.headers.get("content-type")?.split(";")[0] ?? "";
  if (mimeType !== "image/png" && mimeType !== "image/jpeg") return null;
  return {
    mimeType,
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
};

const renderPreviewSvg = (template: CustomizationTemplate, design: CustomizationDesign) => {
  const width = template.background?.widthPx ?? 900;
  const height = template.background?.heightPx ?? 900;
  const layers = [...design.layers].sort((a, b) => a.zIndex - b.zIndex);
  const body = layers
    .map((layer) => {
      if (layer.type === "text") {
        const x = layer.geometry.xRatio * width;
        const y = layer.geometry.yRatio * height;
        const anchor = layer.align === "left" ? "start" : layer.align === "right" ? "end" : "middle";
        if (layer.path.type !== "straight") {
          const pathId = `path-${escapeXml(layer.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
          const startOffset = layer.align === "left" ? "0%" : layer.align === "right" ? "100%" : "50%";
          return `<path id="${pathId}" d="${textPathD(layer, width, height)}" fill="none" /><text font-size="${layer.fontSizePt}" text-anchor="${anchor}" fill="${escapeXml(layer.color)}"><textPath href="#${pathId}" startOffset="${startOffset}">${escapeXml(layer.text)}</textPath></text>`;
        }
        return `<text x="${x}" y="${y}" font-size="${layer.fontSizePt}" text-anchor="${anchor}" dominant-baseline="middle" fill="${escapeXml(layer.color)}" transform="rotate(${layer.geometry.rotationDeg} ${x} ${y})">${escapeXml(layer.text)}</text>`;
      }
      const frameWidth = layer.geometry.widthRatio * width;
      const frameHeight = layer.geometry.heightRatio * height;
      const x = layer.geometry.xRatio * width - frameWidth / 2;
      const y = layer.geometry.yRatio * height - frameHeight / 2;
      const clipId = `clip-${escapeXml(layer.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      return `<clipPath id="${clipId}">${shapeClipSvg({ shape: layer.shape.type, x, y, width: frameWidth, height: frameHeight })}</clipPath><image clip-path="url(#${clipId})" href="${escapeXml(layer.previewUrl)}" x="${x}" y="${y}" width="${frameWidth}" height="${frameHeight}" preserveAspectRatio="xMidYMid slice" />`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${template.background ? `<image href="${escapeXml(template.background.previewUrl)}" x="0" y="0" width="${width}" height="${height}" />` : ""}${body}</svg>`;
};

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
        template: buildTemplate({
          id: templateId,
          productId: product.id,
          name: parsed.output.name,
          revision,
          status: "draft",
          stored,
        }),
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

    const template = buildTemplate({
      id: templateRow.id,
      productId: templateRow.productId,
      name: templateRow.name,
      revision: latest.revision.revision,
      status: "draft",
      stored: latest.stored,
    });
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
      template: buildTemplate({
        id: templateRow.id,
        productId: templateRow.productId,
        name: templateRow.name,
        revision: result.revision.revision,
        status: result.revision.status === "published" ? "published" : "draft",
        stored: result.stored,
      }),
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
      template: buildTemplate({
        id: templateRow.id,
        productId: templateRow.productId,
        name: templateRow.name,
        revision: result.revision.revision,
        status: "published",
        stored: result.stored,
      }),
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
  })
  .post("/exports/pdf", async (c) => {
    const parsed = await parseJson(c, validatePayloadSchema);
    if (!parsed.success) return parsed.response;

    const { result, design } = resolveAndValidateDesign(parsed.output.template, parsed.output.design);
    if (!result.valid) return c.json(result, 422);

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([
      parsed.output.template.background?.widthPx ?? 900,
      parsed.output.template.background?.heightPx ?? 900,
    ]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const layer of design.layers) {
      if (layer.type !== "text") continue;
      page.drawText(layer.text, {
        x: layer.geometry.xRatio * page.getWidth(),
        y: page.getHeight() - layer.geometry.yRatio * page.getHeight(),
        size: layer.fontSizePt,
        font,
        color: grayscale(0),
      });
    }
    for (const layer of design.layers) {
      if (layer.type !== "image_shape") continue;
      const source = await readImageBytes(layer.previewUrl);
      if (!source) continue;
      const image = source.mimeType === "image/png"
        ? await pdf.embedPng(source.bytes)
        : await pdf.embedJpg(source.bytes);
      page.drawImage(image, {
        x: (layer.geometry.xRatio - layer.geometry.widthRatio / 2) * page.getWidth(),
        y: page.getHeight() - (layer.geometry.yRatio + layer.geometry.heightRatio / 2) * page.getHeight(),
        width: layer.geometry.widthRatio * page.getWidth(),
        height: layer.geometry.heightRatio * page.getHeight(),
      });
    }
    pdf.setTitle(`Customization preview ${design.id}`);
    const bytes = await pdf.save();
    const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    return c.body(body, 200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${design.id}.pdf"`,
    });
  });
