import { describe, expect, it } from "vitest";
import { buildCustomizationValueSummaries, type StoredCustomizationSnapshot } from "./order-utils";

describe("buildCustomizationValueSummaries", () => {
  it("uses the stored clipart name from the order snapshot", () => {
    const snapshot: StoredCustomizationSnapshot = {
      values: {
        badge_shape: {
          source: "clipart",
          clipartAssetId: "clipart_star",
          clipartAssetName: "Vintage Star",
          sourceAssetId: "asset_star",
          previewUrl: "/api/assets/customizations/asset_star/content",
          mimeType: "image/svg+xml",
          sourceWidthPx: 200,
          sourceHeightPx: 200,
          categoryId: "sports",
        },
      },
      design: { layers: [] },
      templateSnapshot: {
        layers: [],
        formFields: [
          {
            id: "badge_shape",
            layerId: "layer_badge_shape",
            label: "Badge",
            required: true,
            order: 0,
          },
        ],
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
    };

    expect(buildCustomizationValueSummaries(snapshot)).toEqual([
      {
        fieldId: "badge_shape",
        label: "Badge",
        valueSummary: "Vintage Star",
      },
    ]);
  });

  it("does not depend on later brand-asset edits once the snapshot has been written", () => {
    const snapshot: StoredCustomizationSnapshot = {
      values: {
        badge_shape: {
          source: "clipart",
          clipartAssetId: "clipart_star",
          clipartAssetName: "Original Star",
          sourceAssetId: "asset_star",
          previewUrl: "/api/assets/customizations/asset_star/content",
          mimeType: "image/svg+xml",
          sourceWidthPx: 200,
          sourceHeightPx: 200,
          categoryId: "sports",
        },
      },
      design: { layers: [] },
      templateSnapshot: {
        layers: [],
        formFields: [
          {
            id: "badge_shape",
            layerId: "layer_badge_shape",
            label: "Badge",
            required: true,
            order: 0,
          },
        ],
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
    };

    expect(buildCustomizationValueSummaries(snapshot)[0]?.valueSummary).toBe("Original Star");
  });
});
