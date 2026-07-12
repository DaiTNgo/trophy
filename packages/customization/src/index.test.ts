import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  buildRuntimeImageClipartLayer,
  createDefaultFormValues,
  fitTextToLayer,
  getCropPanFromImagePosition,
  getOrderedFormFields,
  getShapeClipPath,
  getTextPathLengthPx,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  getVisibleLayers,
  layerGeometryToPixels,
  normalizeTextPath,
  pixelRectToLayerGeometry,
  validateCustomizationValues,
  validateProductCustomizationForPublish,
  validateTemplateForPublish,
  type CustomizationClipartAsset,
  type CustomizationTemplate,
  type ProductCustomization,
  type TextEditorLayer,
} from "./index";

const STAR_CLIPART: CustomizationClipartAsset = {
  id: "clipart_star",
  sourceAssetId: "asset_star",
  name: "Star",
  fileName: "star.svg",
  categoryId: "sports",
  previewUrl: "https://example.test/clipart/star.svg",
  mimeType: "image/svg+xml",
  sourceWidthPx: 200,
  sourceHeightPx: 200,
  active: true,
};

const SHIELD_CLIPART: CustomizationClipartAsset = {
  id: "clipart_shield",
  sourceAssetId: "asset_shield",
  name: "Shield",
  fileName: "shield.png",
  categoryId: "sports",
  previewUrl: "https://example.test/clipart/shield.png",
  mimeType: "image/png",
  sourceWidthPx: 300,
  sourceHeightPx: 300,
  active: true,
};

const OTHER_CATEGORY_CLIPART: CustomizationClipartAsset = {
  id: "clipart_crown",
  sourceAssetId: "asset_crown",
  name: "Crown",
  fileName: "crown.webp",
  categoryId: "royal",
  previewUrl: "https://example.test/clipart/crown.webp",
  mimeType: "image/webp",
  sourceWidthPx: 280,
  sourceHeightPx: 280,
  active: true,
};

const CLIPART_CATEGORY_TEMPLATE: CustomizationTemplate = {
  ...DEFAULT_TEMPLATE,
  layers: DEFAULT_TEMPLATE.layers.map((layer) =>
    layer.id === "badge_shape" && layer.type === "image_shape"
      ? {
          ...layer,
          sourcePolicy: "clipart_category_only" as const,
          clipartCategoryMode: "fixed" as const,
          clipartCategory: { id: "sports", name: "Sports" },
        }
      : layer,
  ),
};

const UPLOAD_OR_CLIPART_TEMPLATE: CustomizationTemplate = {
  ...DEFAULT_TEMPLATE,
  layers: DEFAULT_TEMPLATE.layers.map((layer) =>
    layer.id === "badge_shape" && layer.type === "image_shape"
      ? {
          ...layer,
          sourcePolicy: "upload_or_clipart_category" as const,
          presentation: "source_select" as const,
          clipartCategoryMode: "allow_list" as const,
          allowedClipartCategories: [
            { id: "sports", name: "Sports" },
            { id: "royal", name: "Royal" },
          ],
        }
      : layer,
  ),
};

const UPLOAD_ONLY_TEMPLATE: CustomizationTemplate = {
  ...DEFAULT_TEMPLATE,
  layers: DEFAULT_TEMPLATE.layers.map((layer) =>
    layer.id === "badge_shape" && layer.type === "image_shape"
      ? {
          ...layer,
          sourcePolicy: "upload_only" as const,
          clipartCategoryMode: undefined,
          clipartCategory: null,
          allowedClipartCategories: [],
          clipartAssets: [],
        }
      : layer,
  ),
};

describe("editor-model customization", () => {
  it("separates visual layer stack from shopper form order", () => {
    expect(getVisibleLayers(DEFAULT_TEMPLATE).map((layer) => layer.id)).toEqual([
      "badge_shape",
      "line_1",
      "curved_name",
    ]);
    expect(getOrderedFormFields(DEFAULT_TEMPLATE).map((field) => field.layerId)).toEqual([
      "line_1",
      "badge_shape",
      "curved_name",
    ]);
  });

  it("starts clipart-backed layers without a persisted default selection", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    expect(values.field_badge_shape).toBeNull();
  });

  it("starts upload-or-clipart layers without a persisted default selection", () => {
    const values = createDefaultFormValues(UPLOAD_OR_CLIPART_TEMPLATE);
    expect(values.field_badge_shape).toBeNull();
  });

  it("renders selected clipart values through the image shape runtime", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    values.field_badge_shape = {
      source: "clipart",
      clipartAssetId: "clipart_shield",
      clipartAssetName: "Shield",
      sourceAssetId: "asset_shield",
      previewUrl: "https://example.test/clipart/shield.png",
      mimeType: "image/png",
      sourceWidthPx: 300,
      sourceHeightPx: 300,
      categoryId: "sports",
    };

    const design = buildDesignFromForm({
      template: CLIPART_CATEGORY_TEMPLATE,
      values,
      designId: "clipart_selection_design",
    });

    const imageLayer = design.layers.find((layer) => layer.layerId === "badge_shape");
    expect(imageLayer).toMatchObject({
      type: "image_shape",
      assetId: "asset_shield",
      contentSource: "clipart",
      clipartAssetId: "clipart_shield",
      clipartAssetName: "Shield",
      categoryId: "sports",
    });
  });

  it("does not render a clipart layer when no explicit clipart value is provided", () => {
    const design = buildDesignFromForm({
      template: CLIPART_CATEGORY_TEMPLATE,
      values: { ...createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE), field_badge_shape: null },
      designId: "clipart_default_design",
    });

    expect(design.layers.find((layer) => layer.layerId === "badge_shape")).toBeUndefined();
  });

  it("excludes hidden layers from form order, rendering, and required validation", () => {
    const hiddenTemplate: CustomizationTemplate = {
      ...DEFAULT_TEMPLATE,
      layers: DEFAULT_TEMPLATE.layers.map((layer) =>
        layer.id === "curved_name" ? { ...layer, hidden: true } : layer,
      ),
    };
    const values = createDefaultFormValues(hiddenTemplate);
    values.field_curved_name = { text: "" };

    expect(getOrderedFormFields(hiddenTemplate).map((field) => field.layerId)).not.toContain("curved_name");
    expect(validateCustomizationValues({ template: hiddenTemplate, values }).valid).toBe(true);
    expect(buildDesignFromForm({ template: hiddenTemplate, values }).layers.map((layer) => layer.layerId)).not.toContain(
      "curved_name",
    );
  });
});

describe("publish validation", () => {
  it("rejects templates without a background", () => {
    const result = validateTemplateForPublish({ ...DEFAULT_TEMPLATE, background: null });
    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("BACKGROUND_REQUIRED");
  });

  it("rejects invalid layer and field references", () => {
    const result = validateTemplateForPublish({
      ...DEFAULT_TEMPLATE,
      formFields: [{ ...DEFAULT_TEMPLATE.formFields[0], layerId: "missing_layer" }],
    });
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["FIELD_LAYER_MISSING", "LAYER_FIELD_MISSING"]),
    );
  });

  it("requires path text to be one line", () => {
    const invalidTemplate: CustomizationTemplate = {
      ...DEFAULT_TEMPLATE,
      layers: DEFAULT_TEMPLATE.layers.map((layer) =>
        layer.id === "curved_name" && layer.type === "text"
          ? { ...layer, text: { ...layer.text, maxLines: 2 } }
          : layer,
      ),
    };
    expect(validateTemplateForPublish(invalidTemplate).issues.map((issue) => issue.code)).toContain(
      "TEXT_PATH_REQUIRES_SINGLE_LINE",
    );
  });
});

describe("product-owned customization validation", () => {
  const productCustomization: ProductCustomization = {
    productId: "product_123",
    enabled: true,
    canvasWidthPx: 1200,
    canvasHeightPx: 900,
    layers: DEFAULT_TEMPLATE.layers,
    formFields: DEFAULT_TEMPLATE.formFields,
  };

  it("requires canvas dimensions for publish-ready customization", () => {
    const result = validateProductCustomizationForPublish({
      ...productCustomization,
      canvasWidthPx: null,
      canvasHeightPx: null,
    });

    expect(result.valid).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toContain("CANVAS_DIMENSIONS_REQUIRED");
  });

  it("blocks publish when clipart category layers are missing a category", () => {
    const invalidCustomization: ProductCustomization = {
      ...productCustomization,
      layers: CLIPART_CATEGORY_TEMPLATE.layers.map((layer) =>
        layer.id === "badge_shape" && layer.type === "image_shape"
          ? { ...layer, clipartCategory: null }
          : layer,
      ),
      formFields: CLIPART_CATEGORY_TEMPLATE.formFields,
    };

    expect(validateProductCustomizationForPublish(invalidCustomization).issues.map((issue) => issue.code)).toContain(
      "CLIPART_POLICY_INVALID",
    );
  });

  it("blocks publish when allowed-category clipart layers have no categories", () => {
    const invalidCustomization: ProductCustomization = {
      ...productCustomization,
      layers: UPLOAD_OR_CLIPART_TEMPLATE.layers.map((layer) =>
        layer.id === "badge_shape" && layer.type === "image_shape"
          ? {
              ...layer,
              allowedClipartCategories: [],
            }
          : layer,
      ),
      formFields: UPLOAD_OR_CLIPART_TEMPLATE.formFields,
    };

    expect(validateProductCustomizationForPublish(invalidCustomization).issues.map((issue) => issue.code)).toContain(
      "CLIPART_POLICY_INVALID",
    );
  });

  it("rejects fixed clipart as a source policy", () => {
    const invalidCustomization: ProductCustomization = {
      ...productCustomization,
      layers: productCustomization.layers.map((layer) =>
        layer.id === "badge_shape" && layer.type === "image_shape"
          ? { ...layer, sourcePolicy: "fixed_clipart" as never }
          : layer,
      ),
    };

    expect(validateProductCustomizationForPublish(invalidCustomization).issues.map((issue) => issue.code)).toContain(
      "CLIPART_POLICY_INVALID",
    );
  });
});

describe("image clipart runtime serialization", () => {
  it("serializes fixed category scope and derived clipart assets for clipart-category layers", () => {
    const layer = CLIPART_CATEGORY_TEMPLATE.layers.find(
      (candidate) => candidate.id === "badge_shape" && candidate.type === "image_shape",
    );
    if (!layer || layer.type !== "image_shape") throw new Error("Missing image shape fixture");

    expect(
      buildRuntimeImageClipartLayer({
        layer,
        fieldId: "field_badge_shape",
        required: true,
        clipartAssets: [STAR_CLIPART, SHIELD_CLIPART, OTHER_CATEGORY_CLIPART],
      }),
    ).toMatchObject({
      sourcePolicy: "clipart_category_only",
      clipartCategoryMode: "fixed",
      clipartCategory: { id: "sports", name: "Sports" },
      allowedClipartCategories: [],
      clipartAssets: [{ id: "clipart_star" }, { id: "clipart_shield" }],
      upload: {
        enabled: false,
        fit: "cover",
        panEnabled: true,
        zoomEnabled: true,
      },
    });
  });

  it("serializes side-by-side presentation for upload-or-clipart layers", () => {
    const layer = UPLOAD_OR_CLIPART_TEMPLATE.layers.find(
      (candidate) => candidate.id === "badge_shape" && candidate.type === "image_shape",
    );
    if (!layer || layer.type !== "image_shape") throw new Error("Missing image shape fixture");

    expect(
      buildRuntimeImageClipartLayer({
        layer: { ...layer, presentation: "side_by_side" },
        fieldId: "field_badge_shape",
        required: true,
        clipartAssets: [STAR_CLIPART, SHIELD_CLIPART, OTHER_CATEGORY_CLIPART],
      }),
    ).toMatchObject({
      sourcePolicy: "upload_or_clipart_category",
      clipartCategoryMode: "allow_list",
      presentation: "side_by_side",
      allowedClipartCategories: [{ id: "sports" }, { id: "royal" }],
      upload: { enabled: true },
    });
  });

  it("filters inactive clipart assets out of the runtime clipart list", () => {
    const layer = CLIPART_CATEGORY_TEMPLATE.layers.find(
      (candidate) => candidate.id === "badge_shape" && candidate.type === "image_shape",
    );
    if (!layer || layer.type !== "image_shape") throw new Error("Missing image shape fixture");

    expect(
      buildRuntimeImageClipartLayer({
        layer,
        fieldId: "field_badge_shape",
        required: true,
        clipartAssets: [STAR_CLIPART, { ...SHIELD_CLIPART, active: false }],
      }).clipartAssets,
    ).toEqual([expect.objectContaining({ id: "clipart_star" })]);
  });
});

describe("clipart value validation", () => {
  it("accepts clipart selections from the configured fixed category", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    values.field_badge_shape = {
      source: "clipart",
      clipartAssetId: "clipart_star",
      clipartAssetName: "Star",
      sourceAssetId: "asset_star",
      previewUrl: "https://example.test/clipart/star.svg",
      mimeType: "image/svg+xml",
      sourceWidthPx: 200,
      sourceHeightPx: 200,
      categoryId: "sports",
    };

    expect(validateCustomizationValues({ template: CLIPART_CATEGORY_TEMPLATE, values }).valid).toBe(true);
  });

  it("rejects clipart selections from the wrong category", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    values.field_badge_shape = {
      source: "clipart",
      clipartAssetId: "clipart_crown",
      clipartAssetName: "Crown",
      sourceAssetId: "asset_crown",
      previewUrl: "https://example.test/clipart/crown.webp",
      mimeType: "image/webp",
      sourceWidthPx: 280,
      sourceHeightPx: 280,
      categoryId: "royal",
    };

    expect(validateCustomizationValues({ template: CLIPART_CATEGORY_TEMPLATE, values }).issues.map((issue) => issue.code)).toContain(
      "OPTION_NOT_ALLOWED",
    );
  });

  it("rejects uploads for clipart-only layers", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    values.field_badge_shape = {
      assetId: "upload_logo",
      previewUrl: "https://example.test/uploads/logo.png",
      sourceWidthPx: 800,
      sourceHeightPx: 600,
    };

    expect(validateCustomizationValues({ template: CLIPART_CATEGORY_TEMPLATE, values }).issues.map((issue) => issue.code)).toContain(
      "OPTION_NOT_ALLOWED",
    );
  });

  it("accepts uploads for upload-only layers", () => {
    const values = createDefaultFormValues(UPLOAD_ONLY_TEMPLATE);
    values.field_badge_shape = {
      assetId: "upload_logo",
      previewUrl: "https://example.test/uploads/logo.png",
      sourceWidthPx: 800,
      sourceHeightPx: 600,
      cropScale: 1.15,
      cropXRatio: 0.1,
      cropYRatio: -0.1,
    };

    expect(validateCustomizationValues({ template: UPLOAD_ONLY_TEMPLATE, values }).valid).toBe(true);
  });

  it("accepts selected clipart values for upload-or-clipart layers", () => {
    const values = createDefaultFormValues(UPLOAD_OR_CLIPART_TEMPLATE);
    values.field_badge_shape = {
      source: "clipart",
      clipartAssetId: "clipart_shield",
      clipartAssetName: "Shield",
      sourceAssetId: "asset_shield",
      previewUrl: "https://example.test/clipart/shield.png",
      mimeType: "image/png",
      sourceWidthPx: 300,
      sourceHeightPx: 300,
      categoryId: "royal",
    };

    expect(validateCustomizationValues({ template: UPLOAD_OR_CLIPART_TEMPLATE, values }).valid).toBe(true);
  });

  it("keeps snapshot-friendly clipart metadata on rendered design layers", () => {
    const values = createDefaultFormValues(CLIPART_CATEGORY_TEMPLATE);
    values.field_badge_shape = {
      source: "clipart",
      clipartAssetId: "clipart_star",
      clipartAssetName: "Star",
      sourceAssetId: "asset_star",
      previewUrl: "https://example.test/clipart/star.svg",
      mimeType: "image/svg+xml",
      sourceWidthPx: 200,
      sourceHeightPx: 200,
      categoryId: "sports",
    };

    const design = buildDesignFromForm({
      template: CLIPART_CATEGORY_TEMPLATE,
      values,
      designId: "snapshot_metadata_design",
    });

    expect(design.layers.find((layer) => layer.layerId === "badge_shape")).toMatchObject({
      type: "image_shape",
      contentSource: "clipart",
      clipartAssetId: "clipart_star",
      clipartAssetName: "Star",
      mimeType: "image/svg+xml",
      categoryId: "sports",
    });
  });
});

describe("geometry helpers", () => {
  it("converts between background pixels and normalized geometry", () => {
    const background = DEFAULT_TEMPLATE.background;
    if (!background) throw new Error("Missing background fixture");

    const geometry = pixelRectToLayerGeometry({
      xPx: 180,
      yPx: 270,
      widthPx: 360,
      heightPx: 180,
      background,
    });
    expect(geometry).toMatchObject({
      xRatio: 0.4,
      yRatio: 0.4,
      widthRatio: 0.4,
      heightRatio: 0.2,
    });

    const rect = layerGeometryToPixels({ geometry, background });
    expect(rect.xPx).toBeCloseTo(180);
    expect(rect.yPx).toBeCloseTo(270);
    expect(rect.widthPx).toBeCloseTo(360);
    expect(rect.heightPx).toBeCloseTo(180);
  });

  it("keeps cover image pan values within the normalized crop range", () => {
    const cropPan = getCropPanFromImagePosition({
      imageXPx: -130,
      imageYPx: -120,
      frameWidthPx: 200,
      frameHeightPx: 200,
      imageWidthPx: 320,
      imageHeightPx: 280,
    });

    expect(cropPan.cropXRatio).toBeGreaterThanOrEqual(-1);
    expect(cropPan.cropXRatio).toBeLessThanOrEqual(1);
    expect(cropPan.cropYRatio).toBeGreaterThanOrEqual(-1);
    expect(cropPan.cropYRatio).toBeLessThanOrEqual(1);
  });

  it("returns a path clip for decorative shapes", () => {
    expect(getShapeClipPath({ shape: "heart", widthPx: 200, heightPx: 160 })).toContain("path(");
    expect(getShapeClipPath({ shape: "star", widthPx: 200, heightPx: 160 })).toContain("polygon(");
  });
});

describe("text fitting and paths", () => {
  const lineLayer = DEFAULT_TEMPLATE.layers.find((layer): layer is TextEditorLayer => layer.id === "line_1");
  if (!lineLayer) throw new Error("Missing text fixture");

  it("reduces font size to fit available width", () => {
    const fitted = fitTextToLayer({
      layer: lineLayer,
      value: { text: "CHAMPION 2026" },
      availableWidthPx: 100,
      measure: (text, size) => text.length * size * 0.55,
    });
    expect(fitted.fontSizePt).toBeLessThan(lineLayer.text.maxFontSizePt);
    expect(fitted.trimmed).toBe(false);
  });

  it("normalizes closed ellipse text paths and fits against path length", () => {
    const path = normalizeTextPath({
      type: "closed_ellipse",
      bounds: { xRatio: 2, yRatio: -1, widthRatio: 3, heightRatio: 0 },
      startAngleDeg: 180,
      direction: "sideways" as "clockwise",
      placement: "below_path",
    });
    expect(path.type === "closed_ellipse" ? path.bounds : null).toEqual({
      xRatio: 1,
      yRatio: 0,
      widthRatio: 1,
      heightRatio: 0.05,
    });

    const closedLayer: TextEditorLayer = {
      ...lineLayer,
      geometry: { ...lineLayer.geometry, heightRatio: 0.2 },
      text: {
        ...lineLayer.text,
        path: {
          type: "closed_ellipse",
          bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
          startAngleDeg: 180,
          direction: "clockwise",
          placement: "over_path",
        },
      },
    };
    expect(getTextPathLengthPx({ path: closedLayer.text.path, widthPx: 200, heightPx: 100 })).toBeGreaterThan(450);
    const fitted = fitTextToLayer({
      layer: closedLayer,
      value: { text: "AAA\nBBB" },
      availableWidthPx: 200,
      availableHeightPx: 100,
      measure: (text, size) => text.length * size,
    });
    expect(fitted.text).toBe("AAA");
    expect(fitted.trimmed).toBe(false);
  });

  it("builds SVG path data for text paths", () => {
    expect(getTextPathSvgD({ path: { type: "arc_up", curveAmount: 0.5 }, widthPx: 200, heightPx: 60 })).toContain("Q 100");
    expect(
      getTextPathSvgD({
        path: {
          type: "custom",
          points: [
            { id: "p1", xRatio: 0, yRatio: 0.5, outHandle: { xRatio: 0.25, yRatio: -0.25 } },
            { id: "p2", xRatio: 1, yRatio: 0.5, inHandle: { xRatio: -0.25, yRatio: -0.25 } },
          ],
        },
        widthPx: 200,
        heightPx: 60,
      }),
    ).toContain("C 50 15 150 15 200 30");
  });

  it("anchors closed ellipse path alignment at the start angle", () => {
    const closedPath = {
      type: "closed_ellipse" as const,
      bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
      startAngleDeg: 90,
      direction: "clockwise" as const,
      placement: "over_path" as const,
    };
    expect(getTextPathRenderAttributes({ path: closedPath, align: "left", widthPx: 200, heightPx: 200 })).toMatchObject({
      textAnchor: "start",
      startOffset: "0",
    });
    expect(getTextPathRenderAttributes({ path: closedPath, align: "center", widthPx: 200, heightPx: 200, textWidthPx: 100 })).toMatchObject({
      textAnchor: "middle",
      startOffset: "50%",
      pathStartAngleDeg: -90,
    });
  });
});
