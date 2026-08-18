import { describe, expect, it } from "vitest";
import { buildRasterExportSvg, rasterExportExtension } from "./raster-export";

describe("raster preview export", () => {
  it("uses the encoder result to choose a download extension", () => {
    expect(rasterExportExtension("image/webp")).toBe("webp");
    expect(rasterExportExtension("image/png")).toBe("png");
  });

  it("serializes a rotated vector image clip and crop", () => {
    const template: any = { background: { widthPx: 1000, heightPx: 800, previewUrl: "data:image/png;base64,AA==" } };
    const design: any = { layers: [{ id: "shape", type: "image_shape", zIndex: 0, previewUrl: "data:image/png;base64,AA==", sourceWidthPx: 400, sourceHeightPx: 300, cropScale: 1, cropXRatio: 0, cropYRatio: 0, cropRotationDeg: 17, geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.4, heightRatio: 0.3, rotationDeg: 12 }, shape: { type: "vector", vectorPath: { closed: true, points: [{ id: "a", type: "corner", xRatio: 0, yRatio: 0 }, { id: "b", type: "corner", xRatio: 1, yRatio: 0 }, { id: "c", type: "corner", xRatio: 0.5, yRatio: 1 }] } } }] };
    const svg = buildRasterExportSvg(template, design);
    expect(svg).toContain('clipPath id="export-clip-shape"');
    expect(svg).toContain("rotate(17");
    expect(svg).toContain("rotate(12");
    expect(svg).toContain("scale(400 240)");
  });
});
