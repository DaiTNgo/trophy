import { DEFAULT_TEMPLATE } from "@trophy/customization";
import { describe, expect, it } from "vitest";
import { productAssets } from "../../db/schema";
import {
  buildProductCustomizationInsert,
  buildVariantCustomizationMediaInsertRows,
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

const buildPublishableProduct = (
  title: string | { vi?: string; en?: string },
): Parameters<typeof validatePublishable>[0] =>
  ({
    id: 7,
    title,
    handle: "champion-cup",
    subtitle: null,
    description: null,
    status: "draft",
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
    customization: null,
    variants: [
      {
        id: 1,
        productId: 7,
        title: "Default",
        sku: "SKU-1",
        misaProductId: null,
        misaSyncStatus: "pending",
        misaLastError: null,
        misaSyncedAt: null,
        priceAmount: 1000,
        inventoryQuantity: 0,
        allowBackorder: false,
        isDefault: true,
        position: 0,
        createdAt: "2026-07-03T00:00:00.000Z",
        updatedAt: "2026-07-03T00:00:00.000Z",
        media: [],
        customizationMedia: null,
        attributes: [],
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
  }) as Parameters<typeof validatePublishable>[0];

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

  it("persists edited polygon geometry without dropping corner radius", () => {
    const polygonLayer = DEFAULT_TEMPLATE.layers.find(
      (layer) => layer.type === "image_shape",
    );
    if (!polygonLayer || polygonLayer.type !== "image_shape") {
      throw new Error("Missing image shape fixture");
    }

    const customization = {
      ...baseCustomization,
      layers: [
        {
          ...polygonLayer,
          shape: {
            type: "vector" as const,
            lockAspectRatio: false,
            vectorPath: {
              closed: true,
              points: [
                { id: "top", type: "corner" as const, xRatio: 0.5, yRatio: 0, cornerRadius: 0.08 },
                { id: "right", type: "corner" as const, xRatio: 1, yRatio: 1 },
                { id: "left", type: "corner" as const, xRatio: 0, yRatio: 1 },
              ],
            },
          },
        },
      ],
    };

    const row = buildProductCustomizationInsert({
      productId: 42,
      customization,
      submittedVariants: [],
      assetsById: new Map(),
    });

    expect(JSON.parse(row!.layersJson)[0].shape.vectorPath.points[0].cornerRadius).toBe(0.08);
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

  it("rejects publish when a variant has no customization media", () => {
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
          customizationMedia: null,
        },
      ],
      assetsById: new Map(),
    });

    expect(result).toBe("Each variant needs Customization Media before publish");
  });

  it("rejects publish when customization media dimensions differ", () => {
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
          customizationMedia: { assetId: "asset_red" },
        },
        {
          title: "Blue",
          sku: null,
          priceAmount: 1000,
          isDefault: false,
          optionValues: [],
          media: [],
          customizationMedia: { assetId: "asset_blue" },
        },
      ],
      assetsById: buildAssetsMap(
        buildAsset({ id: "asset_red", widthPx: 1200, heightPx: 900 }),
        buildAsset({ id: "asset_blue", widthPx: 1000, heightPx: 900 }),
      ),
    });

    expect(result).toBe("All Customization Media assets must share the same size before publish");
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
          media: [],
          customizationMedia: { assetId: "asset_red" },
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
          customizationMedia: { assetId: "asset_red_1" },
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
          misaProductId: null,
          misaSyncStatus: "pending",
          misaLastError: null,
          misaSyncedAt: null,
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
          customizationMedia: {
            id: "asset_red_1",
            fileName: "asset_red_1.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 1024,
            contentUrl: "/api/assets/products/asset_red_1/content",
          },
          attributes: [],
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

  it("allows publish when product title has Vietnamese but no English translation", () => {
    expect(validatePublishable(buildPublishableProduct({ vi: "Cúp vô địch", en: "" }))).toBeNull();
  });

  it("rejects publish when product title is missing Vietnamese text", () => {
    expect(validatePublishable(buildPublishableProduct({ vi: "", en: "Champion Cup" }))).toBe(
      "Product title requires Vietnamese text before publish",
    );
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

  it("stores one customization asset per variant without adding it to the gallery rows", () => {
    expect(
      buildVariantCustomizationMediaInsertRows(
        [{ id: 11 }, { id: 12 }],
        [
          { customizationMedia: { assetId: "canvas_a" } },
          { customizationMedia: null },
        ],
      ),
    ).toEqual([{ variantId: 11, assetId: "canvas_a" }]);
  });
});
