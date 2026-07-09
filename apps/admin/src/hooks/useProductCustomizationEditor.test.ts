import { DEFAULT_TEMPLATE } from "@trophy/customization";
import { describe, expect, it } from "vitest";
import { getProductCustomizationPublishIssue } from "./product-customization-publish";

describe("getProductCustomizationPublishIssue", () => {
  it("returns the default clipart validation message when no default clipart asset is selected", () => {
    const issue = getProductCustomizationPublishIssue({
      productId: "product_1",
      initialCustomization: {
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
      template: {
        ...DEFAULT_TEMPLATE,
        background: {
          assetId: "asset_1",
          previewUrl: "/asset.png",
          widthPx: 1200,
          heightPx: 900,
        },
        layers: DEFAULT_TEMPLATE.layers.map((layer) =>
          layer.id === "badge_shape" && layer.type === "image_shape"
            ? {
                ...layer,
                sourcePolicy: "clipart_category_only",
                clipartCategory: { id: "sports", name: "Sports" },
                defaultClipartAsset: null,
                allowedClipartAssets: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs active allowed clipart media.");
  });

  it("returns the clipart category validation message when there are no active allowed assets", () => {
    const issue = getProductCustomizationPublishIssue({
      productId: "product_1",
      initialCustomization: {
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
      },
      template: {
        ...DEFAULT_TEMPLATE,
        background: {
          assetId: "asset_1",
          previewUrl: "/asset.png",
          widthPx: 1200,
          heightPx: 900,
        },
        layers: DEFAULT_TEMPLATE.layers.map((layer) =>
          layer.id === "badge_shape" && layer.type === "image_shape"
            ? {
                ...layer,
                sourcePolicy: "upload_or_clipart_category",
                presentation: "side_by_side",
                clipartCategory: { id: "sports", name: "Sports" },
                defaultClipartAsset: null,
                allowedClipartAssets: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs active allowed clipart media.");
  });
});
