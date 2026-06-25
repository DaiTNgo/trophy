import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  calculateEffectiveDpi,
  createDefaultFormValues,
  fitPreviewIntoBox,
  fitSingleLineText,
  getBlockPreviewRect,
  getCoverImageRect,
  getCropPanFromImagePosition,
  limitTextBlockValue,
  renderBlockSvg,
  validateCustomizationValues,
  validateDesign,
  type CustomizationDesign,
  type TextSingleBlock,
} from "./index";

const createDesign = (): CustomizationDesign => ({
  id: "design_fixture",
  productId: DEFAULT_TEMPLATE.productId,
  templateId: DEFAULT_TEMPLATE.id,
  templateRevision: DEFAULT_TEMPLATE.revision,
  revision: 1,
  status: "draft",
  layers: [],
});

describe("block-only customization", () => {
  it("creates defaults and renders fixed layers without shopper transforms", () => {
    const values = createDefaultFormValues(DEFAULT_TEMPLATE);
    const result = validateCustomizationValues({ template: DEFAULT_TEMPLATE, values });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.blockId === "design_confirmation")).toBe(true);

    values.design_confirmation = true;
    const design = buildDesignFromForm({
      template: DEFAULT_TEMPLATE,
      values,
      designId: "form_design",
    });
    expect(design.layers.some((layer) => layer.id === "badge_icon")).toBe(true);
    expect(design.layers.find((layer) => layer.id === "line_1")?.blockId).toBe("line_1");
  });

  it("keeps single-line and multi-line text as distinct preview layer shapes", () => {
    const values = createDefaultFormValues(DEFAULT_TEMPLATE);
    values.line_1 = { text: "Winner\n2026" };
    values.line_2 = { text: "Line one\nLine two" };
    values.design_confirmation = true;

    const design = buildDesignFromForm({
      template: DEFAULT_TEMPLATE,
      values,
      designId: "text_design",
    });

    const singleLayer = design.layers.find((layer) => layer.id === "line_1");
    const multiLayer = design.layers.find((layer) => layer.id === "line_2");
    expect(singleLayer?.type === "text" ? singleLayer.text : "").toBe("WINNER 2026");
    expect(multiLayer?.type === "text" ? multiLayer.text : "").toBe("Line one\nLine two");
  });

  it("renders icon uploads and image preset choices from the same block value slot", () => {
    const values = createDefaultFormValues(DEFAULT_TEMPLATE);
    values.badge_icon = {
      assetId: "uploaded_icon",
      previewUrl: "https://example.com/icon.png",
      sourceWidthPx: 1000,
      sourceHeightPx: 1000,
      cropScale: 1.25,
      cropXRatio: 0.4,
      cropYRatio: -0.2,
    };
    values.uploaded_logo = "preset-logo";
    values.design_confirmation = true;

    const template = {
      ...DEFAULT_TEMPLATE,
      blocks: DEFAULT_TEMPLATE.blocks.map((block) =>
        block.id === "uploaded_logo" && block.type === "image_upload"
          ? {
              ...block,
              visibleWhen: undefined,
              required: false,
              defaultOptionId: "preset-logo",
              options: [
                {
                  id: "preset-logo",
                  label: "Preset logo",
                  previewUrl: "https://example.com/logo.png",
                  productionAssetId: "preset_logo",
                  sourceWidthPx: 1200,
                  sourceHeightPx: 800,
                },
              ],
            }
          : block.id === "design_style"
            ? { ...block, defaultValue: "preset" }
            : block,
      ),
    };

    const design = buildDesignFromForm({ template, values, designId: "media_design" });
    const uploadedLayer = design.layers.find((layer) => layer.blockId === "badge_icon");
    expect(uploadedLayer?.assetId).toBe("uploaded_icon");
    expect(uploadedLayer?.type === "image" ? uploadedLayer.cropScale : 0).toBe(1.25);
    expect(uploadedLayer?.type === "image" ? uploadedLayer.cropXRatio : 0).toBe(0.4);
    expect(design.layers.find((layer) => layer.blockId === "uploaded_logo")?.assetId).toBe("preset_logo");
  });

  it("calculates cover crop geometry from frame and image dimensions", () => {
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

  it("limits multi-line text by configured characters and lines", () => {
    const block = DEFAULT_TEMPLATE.blocks.find((entry) => entry.id === "line_2");
    if (!block || block.type !== "text_multi") throw new Error("Missing multi-line fixture");

    expect(limitTextBlockValue(block, "ONE\nTWO\nTHREE")).toBe("ONE\nTWO");
    expect(limitTextBlockValue({ ...block, maxChars: 5 }, "123456")).toBe("12345");
  });

  it("ignores hidden upload requirements until upload mode is selected", () => {
    const values = createDefaultFormValues(DEFAULT_TEMPLATE);
    values.design_confirmation = true;
    expect(validateCustomizationValues({ template: DEFAULT_TEMPLATE, values }).valid).toBe(true);

    values.design_style = "upload";
    const result = validateCustomizationValues({ template: DEFAULT_TEMPLATE, values });
    expect(result.issues.map((issue) => issue.blockId)).toEqual(
      expect.arrayContaining(["uploaded_logo", "artwork_rights"]),
    );
  });

  it("excludes hidden blocks from validation and rendering", () => {
    const hiddenTemplate = {
      ...DEFAULT_TEMPLATE,
      blocks: DEFAULT_TEMPLATE.blocks.map((block) =>
        block.id === "line_1" ? { ...block, hidden: true } : block,
      ),
    };
    const values = createDefaultFormValues(hiddenTemplate);
    values.design_confirmation = true;
    const design = buildDesignFromForm({
      template: hiddenTemplate,
      values,
      designId: "hidden_design",
    });
    expect(design.layers.some((layer) => layer.blockId === "line_1")).toBe(false);
  });
});

describe("fitSingleLineText", () => {
  it("selects the largest size that fits without wrapping", () => {
    const result = fitSingleLineText({
      text: "CHAMPION 2026",
      minFontSizePt: 8,
      maxFontSizePt: 30,
      availableWidth: 100,
      measure: (text, size) => text.length * size * 0.5,
    });

    expect(result.fits).toBe(true);
    expect(result.fontSizePt).toBeGreaterThan(14);
    expect(result.fontSizePt).toBeLessThan(16);
  });

  it("normalizes pasted line breaks", () => {
    const result = fitSingleLineText({
      text: "WINNER\n2026",
      minFontSizePt: 8,
      maxFontSizePt: 20,
      availableWidth: 200,
      measure: (text, size) => text.length * size * 0.5,
    });

    expect(result.text).toBe("WINNER 2026");
  });
});

describe("production geometry", () => {
  it("rehydrates preview geometry from intrinsic image ratios", () => {
    const preview = fitPreviewIntoBox({
      intrinsicWidthPx: 2400,
      intrinsicHeightPx: 3000,
      maxWidthPx: 680,
      maxHeightPx: 680,
    });
    expect(preview.widthPx).toBe(544);
    expect(preview.heightPx).toBe(680);

    const block = DEFAULT_TEMPLATE.blocks.find((entry) => entry.id === "line_1");
    if (!block || block.type !== "text_single") throw new Error("Missing single-line block");

    const rect = getBlockPreviewRect({
      block,
      previewWidthPx: preview.widthPx,
      previewHeightPx: preview.heightPx,
    });
    expect(rect.widthPx).toBeGreaterThan(0);
    expect(rect.xPx).toBeGreaterThan(0);
    expect(rect.xPx + rect.widthPx).toBeLessThan(preview.widthPx);
  });

  it("calculates effective DPI from used pixels and physical size", () => {
    expect(
      calculateEffectiveDpi({
        sourcePixels: 1200,
        cropRatio: 0.5,
        printedMillimetres: 50.8,
      }),
    ).toBe(300);
  });

  it("writes exact millimetre dimensions and metadata to SVG", () => {
    const design = createDesign();
    const lineBlock = DEFAULT_TEMPLATE.blocks.find((entry) => entry.id === "line_1") as TextSingleBlock;
    design.layers.push({
      id: "text_fixture",
      blockId: "line_1",
      type: "text",
      xRatio: 0.5,
      yRatio: 0.42,
      rotationDeg: 0,
      text: "WINNER",
      fontId: lineBlock.fontId,
      fontSizePt: 18,
      color: lineBlock.color,
      alignment: lineBlock.alignment,
    });

    const svg = renderBlockSvg({
      template: DEFAULT_TEMPLATE,
      design,
      blockId: "line_1",
    });

    expect(svg).toContain('width="70mm"');
    expect(svg).toContain('height="12mm"');
    expect(svg).toContain("designRevision");
    expect(validateDesign({ template: DEFAULT_TEMPLATE, design }).valid).toBe(true);
  });
});
