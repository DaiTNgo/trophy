import { describe, expect, it } from "vitest";
import {
  addCartLine,
  deserializeCartLines,
  getCartItemCount,
  removeCartLine,
  serializeCartLines,
  updateCartLineQuantity,
  type AddCartLineInput,
  type CartLine,
} from "./cart";

function makeInput(overrides?: Partial<AddCartLineInput>): AddCartLineInput {
  return {
    productId: 1,
    variantId: 10,
    quantity: 1,
    customizationValues: null,
    customizationSummary: [],
    display: {
      productTitle: "Champion Cup",
      productHandle: "champion-cup",
      variantTitle: "Gold",
      sku: "SKU-1",
      thumbnail: null,
      priceAmount: 5000,
      customizable: false,
      requiresCustomization: false,
      isContactPrice: false,
    },
    ...overrides,
  };
}

function makeLine(overrides?: Partial<CartLine>): CartLine {
  return {
    id: "line-1",
    ...makeInput(),
    ...overrides,
  };
}

describe("cart helpers", () => {
  it("serializes and deserializes cart lines", () => {
    const lines = [makeLine()];

    const serialized = serializeCartLines(lines);
    const deserialized = deserializeCartLines(serialized);

    expect(deserialized).toEqual(lines);
    expect(deserializeCartLines("not-json")).toEqual([]);
    expect(deserializeCartLines(null)).toEqual([]);
  });

  it("merges non-customized lines by product and variant", () => {
    const initial = [makeLine()];
    const next = addCartLine(
      initial,
      makeInput({ quantity: 2 }),
      () => "line-2",
    );

    expect(next).toHaveLength(1);
    expect(next[0]?.quantity).toBe(3);
    expect(getCartItemCount(next)).toBe(3);
  });

  it("keeps customized lines separate unless customization values are identical", () => {
    const customizedA = makeInput({
      customizationValues: { text_1: { text: "Alice" } },
      customizationSummary: [{ fieldId: "text_1", label: "Name", valueSummary: "Alice" }],
      display: {
        ...makeInput().display,
        customizable: true,
        requiresCustomization: true,
      },
    });
    const customizedB = makeInput({
      customizationValues: { text_1: { text: "Bob" } },
      customizationSummary: [{ fieldId: "text_1", label: "Name", valueSummary: "Bob" }],
      display: {
        ...makeInput().display,
        customizable: true,
        requiresCustomization: true,
      },
    });

    const withFirst = addCartLine([], customizedA, () => "line-a");
    const withSecond = addCartLine(withFirst, customizedB, () => "line-b");
    const mergedAgain = addCartLine(withSecond, { ...customizedA, quantity: 2 }, () => "line-c");

    expect(withSecond).toHaveLength(2);
    expect(mergedAgain).toHaveLength(2);
    expect(mergedAgain[0]?.quantity).toBe(3);
    expect(mergedAgain[1]?.quantity).toBe(1);
  });

  it("keeps different selected clipart assets as separate customized cart lines", () => {
    const clipartA = makeInput({
      customizationValues: {
        badge_shape: {
          source: "clipart",
          clipartAssetId: "clipart_star",
          clipartAssetName: "Star",
          sourceAssetId: "asset_star",
          previewUrl: "/api/assets/customizations/asset_star/content",
          mimeType: "image/svg+xml",
          sourceWidthPx: 200,
          sourceHeightPx: 200,
          categoryId: "sports",
        },
      },
      customizationSummary: [{ fieldId: "badge_shape", label: "Badge", valueSummary: "Star" }],
      display: {
        ...makeInput().display,
        customizable: true,
        requiresCustomization: true,
      },
    });
    const clipartB = makeInput({
      customizationValues: {
        badge_shape: {
          source: "clipart",
          clipartAssetId: "clipart_shield",
          clipartAssetName: "Shield",
          sourceAssetId: "asset_shield",
          previewUrl: "/api/assets/customizations/asset_shield/content",
          mimeType: "image/png",
          sourceWidthPx: 200,
          sourceHeightPx: 200,
          categoryId: "sports",
        },
      },
      customizationSummary: [{ fieldId: "badge_shape", label: "Badge", valueSummary: "Shield" }],
      display: {
        ...makeInput().display,
        customizable: true,
        requiresCustomization: true,
      },
    });

    const withFirst = addCartLine([], clipartA, () => "line-a");
    const withSecond = addCartLine(withFirst, clipartB, () => "line-b");

    expect(withSecond).toHaveLength(2);
  });

  it("updates quantity and removes lines", () => {
    const lines = [
      makeLine(),
      makeLine({ id: "line-2", productId: 2, variantId: 20 }),
    ];

    const updated = updateCartLineQuantity(lines, "line-1", 4);
    expect(updated[0]?.quantity).toBe(4);

    const removedByZero = updateCartLineQuantity(updated, "line-1", 0);
    expect(removedByZero).toHaveLength(1);
    expect(removedByZero[0]?.id).toBe("line-2");

    const removedExplicitly = removeCartLine(updated, "line-2");
    expect(removedExplicitly).toHaveLength(1);
    expect(removedExplicitly[0]?.id).toBe("line-1");
  });
});
