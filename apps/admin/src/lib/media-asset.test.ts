import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  convertPdfToImageFile: vi.fn(),
  getNativeMediaDimensions: vi.fn(),
}));

vi.mock("./pdf-preview", () => ({
  convertPdfToImageFile: mocks.convertPdfToImageFile,
}));
vi.mock("./image-dimensions", () => ({
  getNativeMediaDimensions: mocks.getNativeMediaDimensions,
}));

import { dimensionsMatch, readMediaAsset, toPreviewImageFile } from "./media-asset";

const pdf = () => new File(["pdf"], "bg.pdf", { type: "application/pdf" });
const png = () => new File(["png"], "bg.png", { type: "image/png" });

describe("media asset reading", () => {
  beforeEach(() => {
    mocks.convertPdfToImageFile.mockReset();
    mocks.getNativeMediaDimensions.mockReset();
  });

  it("gives a PDF a preview image and measures the original PDF", async () => {
    const preview = new File(["webp"], "bg.webp", { type: "image/webp" });
    const file = pdf();
    mocks.convertPdfToImageFile.mockResolvedValue(preview);
    mocks.getNativeMediaDimensions.mockResolvedValue({ widthPx: 595, heightPx: 842 });

    const asset = await readMediaAsset(file);

    expect(asset.previewFile).toBe(preview);
    expect(asset.dimensions).toEqual({ widthPx: 595, heightPx: 842 });
    expect(mocks.getNativeMediaDimensions).toHaveBeenCalledWith(file);
  });

  it("gives a PNG no preview image", async () => {
    mocks.getNativeMediaDimensions.mockResolvedValue({ widthPx: 800, heightPx: 600 });

    const asset = await readMediaAsset(png());

    expect(asset.previewFile).toBeUndefined();
    expect(asset.dimensions).toEqual({ widthPx: 800, heightPx: 600 });
    expect(mocks.convertPdfToImageFile).not.toHaveBeenCalled();
  });

  it("rejects a file whose dimensions cannot be read", async () => {
    mocks.getNativeMediaDimensions.mockRejectedValue(new Error("decode failed"));

    await expect(readMediaAsset(png())).rejects.toThrow("Failed to load media dimensions.");
  });

  it("passes non-PDF files through toPreviewImageFile unchanged", async () => {
    const file = png();

    expect(await toPreviewImageFile(file)).toBe(file);
  });

  it("matches only identical width and height", () => {
    const actual = { widthPx: 800, heightPx: 600 };

    expect(dimensionsMatch(actual, { widthPx: 800, heightPx: 600 })).toBe(true);
    expect(dimensionsMatch(actual, { widthPx: 800, heightPx: 601 })).toBe(false);
    expect(dimensionsMatch(actual, { widthPx: null, heightPx: null })).toBe(false);
    expect(dimensionsMatch(null, { widthPx: 800, heightPx: 600 })).toBe(false);
  });
});
