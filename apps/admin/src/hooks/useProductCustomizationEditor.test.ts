import { DEFAULT_TEMPLATE } from "@trophy/customization";
import { describe, expect, it } from "vitest";
import { getProductCustomizationPublishIssue } from "./product-customization-publish";

describe("getProductCustomizationPublishIssue", () => {
  it("returns the fixed category validation message when no fixed category is selected", () => {
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
                clipartCategoryMode: "fixed",
                clipartCategory: null,
                allowedClipartCategories: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs a fixed clipart category.");
  });

  it("returns the allowed-category validation message when there are no allowed categories", () => {
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
                clipartCategoryMode: "allow_list",
                clipartCategory: null,
                allowedClipartCategories: [],
              }
            : layer,
        ),
      },
    });

    expect(issue).toBe("Badge artwork needs at least one allowed clipart category.");
  });
});
