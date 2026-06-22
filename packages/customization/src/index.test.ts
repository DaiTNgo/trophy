import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  calculateEffectiveDpi,
  createDefaultFormValues,
  fitSingleLineText,
  limitTextBlockValue,
  renderZoneSvg,
  validateCustomizationValues,
  validateDesign,
  type CustomizationDesign,
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

describe("form-driven customization blocks", () => {
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
    expect(design.layers.some((layer) => layer.id === "background")).toBe(true);
    expect(design.layers.some((layer) => layer.id === "preset_logo")).toBe(true);
    expect(design.layers.find((layer) => layer.id === "line_1:0")?.xRatio).toBe(0.5);
  });

  it("limits textarea by configured characters and lines", () => {
    const block = DEFAULT_TEMPLATE.zones[0]!.blocks.find((entry) => entry.id === "line_2");
    if (!block || block.type !== "textarea") throw new Error("Missing textarea fixture");

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
    design.layers.push({
      id: "text_fixture",
      zoneId: "zone_front",
      type: "text",
      xRatio: 0.5,
      yRatio: 0.5,
      rotationDeg: 0,
      text: "WINNER",
      fontId: "sans-bold",
      fontSizePt: 18,
      color: "#111111",
      alignment: "center",
    });

    const svg = renderZoneSvg({
      template: DEFAULT_TEMPLATE,
      design,
      zoneId: "zone_front",
    });

    expect(svg).toContain('width="70mm"');
    expect(svg).toContain('height="28mm"');
    expect(svg).toContain("designRevision");
    expect(validateDesign({ template: DEFAULT_TEMPLATE, design }).valid).toBe(true);
  });
});
