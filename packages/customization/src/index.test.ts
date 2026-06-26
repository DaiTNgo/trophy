import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  createDefaultFormValues,
  fitTextToLayer,
  getCoverImageRect,
  getCropPanFromImagePosition,
  getOrderedFormFields,
  getShapeClipPath,
  getVisibleLayers,
  layerGeometryToPixels,
  normalizeTextPath,
  pixelRectToLayerGeometry,
  validateCustomizationValues,
  validateTemplateForPublish,
  type CustomizationTemplate,
  type TextEditorLayer,
} from "./index";

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

  it("creates default values and derives runtime layers from linked fields", () => {
    const values = createDefaultFormValues(DEFAULT_TEMPLATE);
    values.field_badge_shape = {
      assetId: "uploaded_logo",
      previewUrl: "https://example.com/logo.png",
      sourceWidthPx: 1200,
      sourceHeightPx: 900,
      cropScale: 1.4,
      cropXRatio: 0.25,
      cropYRatio: -0.5,
    };

    const validation = validateCustomizationValues({ template: DEFAULT_TEMPLATE, values });
    expect(validation.valid).toBe(true);

    const design = buildDesignFromForm({
      template: DEFAULT_TEMPLATE,
      values,
      designId: "design_fixture",
    });
    expect(design.layers.map((layer) => layer.layerId)).toEqual([
      "badge_shape",
      "line_1",
      "curved_name",
    ]);
    const imageLayer = design.layers.find((layer) => layer.type === "image_shape");
    expect(imageLayer?.type === "image_shape" ? imageLayer.cropScale : 0).toBe(1.4);
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

  it("trims overflow silently at minimum font size", () => {
    const fitted = fitTextToLayer({
      layer: lineLayer,
      value: { text: "THIS TEXT IS TOO LONG FOR THE AVAILABLE WIDTH" },
      availableWidthPx: 30,
      measure: (text, size) => text.length * size,
    });
    expect(fitted.fontSizePt).toBe(lineLayer.text.minFontSizePt);
    expect(fitted.trimmed).toBe(true);
    expect(fitted.text.length).toBeLessThan("THIS TEXT IS TOO LONG FOR THE AVAILABLE WIDTH".length);
  });

  it("normalizes custom Bezier paths", () => {
    const path = normalizeTextPath({
      type: "custom",
      points: [
        {
          id: "p1",
          xRatio: 2,
          yRatio: -1,
          outHandle: { xRatio: 2, yRatio: -2 },
        },
      ],
    });
    expect(path.type === "custom" ? path.points[0].xRatio : 0).toBe(1);
    expect(path.type === "custom" ? path.points[0].yRatio : 0).toBe(0);
    expect(path.type === "custom" ? path.points[0].outHandle?.xRatio : 0).toBe(1);
  });
});

describe("image shape crop and clipping", () => {
  it("calculates cover crop geometry with uniform scale and pan", () => {
    const rect = getCoverImageRect({
      sourceWidthPx: 2000,
      sourceHeightPx: 1000,
      frameWidthPx: 200,
      frameHeightPx: 200,
      cropScale: 1.5,
      cropXRatio: 1,
      cropYRatio: 0,
    });

    expect(rect.widthPx).toBeCloseTo(600);
    expect(rect.heightPx).toBeCloseTo(300);
    expect(rect.xPx).toBeCloseTo(-500);
    expect(rect.yPx).toBeCloseTo(-150);

    expect(
      getCropPanFromImagePosition({
        imageXPx: rect.xPx,
        imageYPx: rect.yPx,
        frameWidthPx: 200,
        frameHeightPx: 200,
        imageWidthPx: rect.widthPx,
        imageHeightPx: rect.heightPx,
      }),
    ).toEqual({ cropXRatio: 1, cropYRatio: 0 });
  });

  it("generates semantic clip paths for supported shapes", () => {
    expect(getShapeClipPath({ shape: "rectangle", widthPx: 100, heightPx: 50 })).toContain("rect");
    expect(getShapeClipPath({ shape: "circle", widthPx: 100, heightPx: 100 })).toContain("ellipse");
    expect(getShapeClipPath({ shape: "star", widthPx: 100, heightPx: 100 })).toContain("polygon");
    expect(getShapeClipPath({ shape: "heart", widthPx: 100, heightPx: 100 })).toContain("path");
  });
});
