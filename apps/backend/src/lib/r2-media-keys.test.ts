import { describe, expect, it } from "vitest";
import {
  buildCatalogProductMediaKey,
  buildCatalogVariantCustomizationBackgroundKey,
  buildCatalogVariantMediaKey,
  buildBrandFontKey,
  buildClipartKey,
  buildOrderBackgroundKey,
  buildOrderClipartKey,
  buildOrderUploadKey,
  buildShopperDraftUploadKey,
} from "./r2-media-keys";
import {
  canTransitionOrderMediaTransfer,
  protectsShopperDraftSource,
  shopperDraftExpiry,
} from "./order-media-transfer";

describe("semantic R2 media keys", () => {
  it("groups shopper draft uploads by field without using shopper data", () => {
    expect(
      buildShopperDraftUploadKey({
        draftId: "draft_123",
        fieldId: "team_logo",
        assetId: "asset_123",
        extension: "png",
      }),
    ).toBe("shopper-drafts/draft_123/uploads/team_logo/asset_123.source.png");
  });

  it("groups immutable order media by order item and role", () => {
    const order = { orderNumber: "TRO-20260807-001", orderId: 12, itemId: 34 };

    expect(buildOrderBackgroundKey({ ...order, assetId: "background_1", extension: "webp" })).toBe(
      "orders/TRO-20260807-001-12/items/34/background/background_1.source.webp",
    );
    expect(buildOrderUploadKey({ ...order, fieldId: "front_logo", assetId: "upload_1", extension: "jpg" })).toBe(
      "orders/TRO-20260807-001-12/items/34/uploads/front_logo/upload_1.source.jpg",
    );
    expect(buildOrderClipartKey({ ...order, fieldId: "badge", sourceAssetId: "clipart_1", extension: "svg" })).toBe(
      "orders/TRO-20260807-001-12/items/34/clipart/badge/clipart_1.source.svg",
    );
  });

  it("uses product and variant ownership namespaces", () => {
    expect(buildCatalogProductMediaKey({ productId: 11, assetId: "asset_1", extension: "webp" })).toBe(
      "catalog/products/11/media/asset_1.source.webp",
    );
    expect(buildCatalogVariantMediaKey({ productId: 11, variantId: 21, assetId: "asset_1", extension: "png" })).toBe(
      "catalog/products/11/variants/21/media/asset_1.source.png",
    );
    expect(
      buildCatalogVariantCustomizationBackgroundKey({ productId: 11, variantId: 21, assetId: "asset_2", extension: "webp" }),
    ).toBe("catalog/products/11/variants/21/customization-background/asset_2.source.webp");
    expect(buildClipartKey({ categoryId: "sports", assetId: "star_1", extension: "svg" })).toBe(
      "clipart/sports/star_1.source.svg",
    );
    expect(buildBrandFontKey("font_1")).toBe("fonts/font_1.ttf");
  });

  it("rejects unsafe key segments", () => {
    expect(() =>
      buildShopperDraftUploadKey({
        draftId: "draft/123",
        fieldId: "email@example.com",
        assetId: "asset_123",
        extension: "png",
      }),
    ).toThrow("R2 key segment contains unsupported characters");
  });
});

describe("order media transfer lifecycle", () => {
  it("allows retry from failed transfer and protects its shopper source", () => {
    expect(canTransitionOrderMediaTransfer("failed", "pending")).toBe(true);
    expect(canTransitionOrderMediaTransfer("complete", "pending")).toBe(false);
    expect(protectsShopperDraftSource("failed")).toBe(true);
    expect(protectsShopperDraftSource("complete")).toBe(false);
  });

  it("expires unprotected shopper drafts after exactly seven days", () => {
    expect(shopperDraftExpiry(new Date("2026-08-07T00:00:00.000Z")).toISOString()).toBe(
      "2026-08-14T00:00:00.000Z",
    );
  });
});
