import { describe, expect, it } from "vitest";
import { extractRequiredOrderMediaReferences } from "./order-media-references";

describe("extractRequiredOrderMediaReferences", () => {
  it("selects only the background, uploaded field assets, and selected clipart", () => {
    const references = extractRequiredOrderMediaReferences(
      { assetId: "background-1", previewUrl: "/background", widthPx: 900, heightPx: 900 },
      {
        values: {
          name: { text: "Cup" },
          logo: { assetId: "upload-1", previewUrl: "/upload", sourceWidthPx: 100, sourceHeightPx: 100 },
          crest: {
            source: "clipart",
            clipartAssetId: "clipart-row-1",
            clipartAssetName: "Star",
            sourceAssetId: "clipart-source-1",
            previewUrl: "/clipart",
            mimeType: "image/png",
            sourceWidthPx: 100,
            sourceHeightPx: 100,
            categoryId: "sports",
          },
        },
        design: {},
        templateSnapshot: { layers: [], formFields: [], canvasWidthPx: 900, canvasHeightPx: 900 },
      },
    );

    expect(references).toEqual([
      { role: "background", sourceAssetId: "background-1", fieldId: null },
      { role: "upload", sourceAssetId: "upload-1", fieldId: "logo" },
      { role: "clipart", sourceAssetId: "clipart-source-1", fieldId: "crest" },
    ]);
  });

  it("does not request media for a plain order item", () => {
    expect(extractRequiredOrderMediaReferences(null, null)).toEqual([]);
  });
});
