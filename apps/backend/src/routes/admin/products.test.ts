import { DEFAULT_TEMPLATE } from "@trophy/customization";
import { describe, expect, it } from "vitest";
import { productAssets } from "../../db/schema";
import {
  buildProductCustomizationInsert,
  buildVariantMediaInsertRows,
  validateCustomizationPublishReadiness,
  validatePublishable,
} from "./products";

type ProductAssetRow = typeof productAssets.$inferSelect;

const buildAsset = ({
  id,
  widthPx,
  heightPx,
}: {
  id: string;
  widthPx: number;
  heightPx: number;
}) =>
  ({
    id,
    ownerKey: "admin",
    objectKey: `product-assets/${id}.png`,
    fileName: `${id}.png`,
    mimeType: "image/png",
    widthPx,
    heightPx,
    byteSize: 1024,
    createdAt: "2026-07-03T00:00:00.000Z",
  }) satisfies ProductAssetRow;

const buildAssetsMap = (...assets: ProductAssetRow[]) =>
  new Map(assets.map((asset) => [asset.id, asset] as const));

const baseCustomization = {
  enabled: true,
  canvasWidthPx: null,
  canvasHeightPx: null,
  layers: DEFAULT_TEMPLATE.layers,
  formFields: DEFAULT_TEMPLATE.formFields,
};

describe("product full-create helpers", () => {
  it("persists draft customization even when media is incomplete", () => {
    const row = buildProductCustomizationInsert({
      productId: 42,
      customization: baseCustomization,
      submittedVariants: [
        {
          title: "Default",
          sku: null,
          priceAmount: null,
          isDefault: true,
          optionValues: [],
          media: [],
        },
      ],
      assetsById: new Map(),
      now: "2026-07-03T00:00:00.000Z",
    });

    expect(row).toMatchObject({
      productId: 42,
      enabled: true,
      canvasWidthPx: null,
      canvasHeightPx: null,
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T00:00:00.000Z",
    });
    expect(row ? JSON.parse(row.layersJson) : null).toEqual(DEFAULT_TEMPLATE.layers);
    expect(row ? JSON.parse(row.formFieldsJson) : null).toEqual(DEFAULT_TEMPLATE.formFields);
  });

  it("omits disabled customization from persistence", () => {
    const row = buildProductCustomizationInsert({
      productId: 42,
      customization: { ...baseCustomization, enabled: false },
      submittedVariants: [],
      assetsById: new Map(),
    });

    expect(row).toBeNull();
  });

  it("rejects publish when a variant has no image", () => {
    const result = validateCustomizationPublishReadiness({
      customization: baseCustomization,
      submittedVariants: [
        {
          title: "Red",
          sku: null,
          priceAmount: 1000,
          isDefault: true,
          optionValues: [],
          media: [],
        },
      ],
      assetsById: new Map(),
    });

    expect(result).toBe("Each variant needs at least one image before publish");
  });

  it("rejects publish when variant image dimensions differ", () => {
    const result = validateCustomizationPublishReadiness({
      customization: baseCustomization,
      submittedVariants: [
        {
          title: "Red",
          sku: null,
          priceAmount: 1000,
          isDefault: true,
          optionValues: [],
          media: [{ assetId: "asset_red" }],
        },
        {
          title: "Blue",
          sku: null,
          priceAmount: 1000,
          isDefault: false,
          optionValues: [],
          media: [{ assetId: "asset_blue" }],
        },
      ],
      assetsById: buildAssetsMap(
        buildAsset({ id: "asset_red", widthPx: 1200, heightPx: 900 }),
        buildAsset({ id: "asset_blue", widthPx: 1000, heightPx: 900 }),
      ),
    });

    expect(result).toBe("All variant images must share the same size before publish");
  });

  it("rejects publish when the customization model is invalid", () => {
    const result = validateCustomizationPublishReadiness({
      customization: {
        ...baseCustomization,
        formFields: [{ ...DEFAULT_TEMPLATE.formFields[0], layerId: "missing_layer" }],
      },
      submittedVariants: [
        {
          title: "Red",
          sku: null,
          priceAmount: 1000,
          isDefault: true,
          optionValues: [],
          media: [{ assetId: "asset_red" }],
        },
      ],
      assetsById: buildAssetsMap(
        buildAsset({ id: "asset_red", widthPx: 1200, heightPx: 900 }),
      ),
    });

    expect(result).toContain("references a missing layer");
  });

  it("accepts publish when images and customization are valid", () => {
    const publishReadiness = validateCustomizationPublishReadiness({
      customization: baseCustomization,
      submittedVariants: [
        {
          title: "Red",
          sku: "RED-1",
          priceAmount: 1000,
          isDefault: true,
          optionValues: [],
          media: [{ assetId: "asset_red_1" }, { assetId: "asset_red_2" }],
        },
      ],
      assetsById: buildAssetsMap(
        buildAsset({ id: "asset_red_1", widthPx: 1200, heightPx: 900 }),
        buildAsset({ id: "asset_red_2", widthPx: 1200, heightPx: 900 }),
      ),
    });

    expect(publishReadiness).toBeNull();

    const publishable = validatePublishable({
      id: 7,
      title: "Champion Cup",
      handle: "champion-cup",
      subtitle: null,
      description: null,
      status: "draft",
      hasVariants: false,
      collectionId: null,
      createdAt: "2026-07-03T00:00:00.000Z",
      updatedAt: "2026-07-03T00:00:00.000Z",
      collection: null,
      categories: [],
      attributes: [],
      media: [],
      options: [
        {
          id: 10,
          productId: 7,
          title: "Default option",
          position: 0,
          values: [
            {
              id: 100,
              optionId: 10,
              value: "Default option value",
              position: 0,
            },
          ],
        },
      ],
      customization: {
        productId: "7",
        enabled: true,
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
        layers: DEFAULT_TEMPLATE.layers,
        formFields: DEFAULT_TEMPLATE.formFields,
        layerCount: DEFAULT_TEMPLATE.layers.length,
        formFieldCount: DEFAULT_TEMPLATE.formFields.length,
      },
      variants: [
        {
          id: 1,
          productId: 7,
          title: "Default",
          sku: "SKU-1",
          priceAmount: 1000,
          inventoryQuantity: 0,
          allowBackorder: false,
          isDefault: true,
          position: 0,
          createdAt: "2026-07-03T00:00:00.000Z",
          updatedAt: "2026-07-03T00:00:00.000Z",
          media: [
            {
              id: "asset_red_1",
              fileName: "asset_red_1.png",
              mimeType: "image/png",
              widthPx: 1200,
              heightPx: 900,
              byteSize: 1024,
              position: 0,
              contentUrl: "/api/assets/products/asset_red_1/content",
            },
          ],
          optionValueIds: [100],
          optionValues: [
            {
              id: 100,
              value: "Default option value",
              optionId: 10,
              optionTitle: "Default option",
            },
          ],
        },
      ],
    });

    expect(publishable).toBeNull();
  });

  it("preserves stable media ordering per variant", () => {
    const rows = buildVariantMediaInsertRows(
      [{ id: 11 }, { id: 12 }],
      [
        { media: [{ assetId: "asset_a" }, { assetId: "asset_b" }] },
        { media: [{ assetId: "asset_c" }] },
      ],
    );

    expect(rows).toEqual([
      { variantId: 11, assetId: "asset_a", position: 0 },
      { variantId: 11, assetId: "asset_b", position: 1 },
      { variantId: 12, assetId: "asset_c", position: 0 },
    ]);
  });
});
