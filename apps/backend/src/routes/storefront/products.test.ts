import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATE, type ProductCustomization } from "@trophy/customization";
import { buildListingItem, sanitizeShopperCustomization } from "./products";

const baseItem = {
  id: 1,
  title: "Champion Cup",
  subtitle: "Premium trophy",
  handle: "champion-cup",
};

const makeVariant = (overrides: {
  id: number;
  isDefault?: boolean;
  priceAmount?: number | null;
}) => ({
  id: overrides.id,
  isDefault: overrides.isDefault ?? false,
  priceAmount: overrides.priceAmount ?? null,
});

const makeMedia = (assetId: string) => ({
  assetId,
});

describe("buildListingItem", () => {
  it("returns lowest non-null variant price", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, priceAmount: 5000 }),
        makeVariant({ id: 2, priceAmount: 3000, isDefault: true }),
      ],
      new Map(),
      false,
    );

    expect(item.priceAmount).toBe(3000);
    expect(item.priceFrom).toBe(true);
  });

  it("returns null priceAmount for Contact Price (no variant prices)", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, priceAmount: null }),
        makeVariant({ id: 2, priceAmount: null }),
      ],
      new Map(),
      false,
    );

    expect(item.priceAmount).toBeNull();
    expect(item.priceFrom).toBe(false);
  });

  it("sets priceFrom false when all variants share the same price", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, priceAmount: 5000, isDefault: true }),
        makeVariant({ id: 2, priceAmount: 5000 }),
      ],
      new Map(),
      false,
    );

    expect(item.priceAmount).toBe(5000);
    expect(item.priceFrom).toBe(false);
  });

  it("sets priceFrom true when variants have different prices", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, priceAmount: 5000, isDefault: true }),
        makeVariant({ id: 2, priceAmount: 3000 }),
      ],
      new Map(),
      false,
    );

    expect(item.priceFrom).toBe(true);
  });

  it("uses default variant first media as thumbnail", () => {
    const mediaByVariant = new Map([
      [1, [makeMedia("asset_a")]],
      [2, [makeMedia("asset_b")]],
    ]);

    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, isDefault: true }),
        makeVariant({ id: 2 }),
      ],
      mediaByVariant,
      false,
    );

    expect(item.thumbnail).toBe("/api/assets/products/asset_a/content");
  });

  it("falls back to first variant with media when default has none", () => {
    const mediaByVariant = new Map([
      [2, [makeMedia("asset_b")]],
    ]);

    const item = buildListingItem(
      baseItem,
      [],
      [
        makeVariant({ id: 1, isDefault: true }),
        makeVariant({ id: 2 }),
      ],
      mediaByVariant,
      false,
    );

    expect(item.thumbnail).toBe("/api/assets/products/asset_b/content");
  });

  it("returns null thumbnail when no variant has media", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.thumbnail).toBeNull();
  });

  it("builds categorySummary from category names", () => {
    const item = buildListingItem(
      baseItem,
      ["Crystal", "Premium"],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.categorySummary).toBe("Crystal, Premium");
  });

  it("returns null categorySummary when no categories", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.categorySummary).toBeNull();
  });

  it("marks product as customizable", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      true,
    );

    expect(item.customizable).toBe(true);
  });

  it("marks product as non-customizable by default", () => {
    const item = buildListingItem(
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.customizable).toBe(false);
  });
});

describe("sanitizeShopperCustomization", () => {
  it("keeps only shopper-safe allowed clipart assets for clipart-enabled layers", () => {
    const customization: ProductCustomization = {
      productId: "1",
      enabled: true,
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layers: DEFAULT_TEMPLATE.layers.map((layer) =>
        layer.id === "badge_shape" && layer.type === "image_shape"
          ? {
              ...layer,
              sourcePolicy: "upload_or_clipart_category",
              presentation: "source_select",
              clipartCategory: { id: "sports", name: "Sports" },
              defaultClipartAsset: {
                id: "clipart_active",
                sourceAssetId: "asset_active",
                name: "Active Clipart",
                fileName: "active.svg",
                categoryId: "sports",
                previewUrl: "/api/assets/customizations/asset_active/content",
                mimeType: "image/svg+xml",
                sourceWidthPx: 200,
                sourceHeightPx: 200,
                active: true,
              },
              allowedClipartAssets: [
                {
                  id: "clipart_active",
                  sourceAssetId: "asset_active",
                  name: "Active Clipart",
                  categoryId: "sports",
                  fileName: "active.svg",
                  previewUrl: "/api/assets/customizations/asset_active/content",
                  mimeType: "image/svg+xml",
                  sourceWidthPx: 200,
                  sourceHeightPx: 200,
                  active: true,
                },
                {
                  id: "clipart_inactive",
                  sourceAssetId: "asset_inactive",
                  name: "Inactive Clipart",
                  categoryId: "sports",
                  fileName: "inactive.png",
                  previewUrl: "/api/assets/customizations/asset_inactive/content",
                  mimeType: "image/png",
                  sourceWidthPx: 200,
                  sourceHeightPx: 200,
                  active: false,
                },
              ],
            }
          : layer,
      ),
      formFields: DEFAULT_TEMPLATE.formFields,
    };

    const result = sanitizeShopperCustomization(customization);
    const imageLayer = result.layers.find((layer) => layer.id === "badge_shape");

    expect(imageLayer).toMatchObject({
      sourcePolicy: "upload_or_clipart_category",
      presentation: "source_select",
      clipartCategory: { id: "sports", name: "Sports" },
      defaultClipartAsset: { id: "clipart_active" },
    });
    expect((imageLayer as any).allowedClipartAssets).toEqual([
      expect.objectContaining({
        id: "clipart_active",
        sourceAssetId: "asset_active",
      }),
    ]);
    expect((imageLayer as any).allowedClipartAssets).toHaveLength(1);
  });
});
