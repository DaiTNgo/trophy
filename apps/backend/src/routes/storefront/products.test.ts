import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_TEMPLATE, type ProductCustomization } from "@trophy/customization";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { buildListingItem, matchesSearchQuery, normalizeSearchText, sanitizeShopperCustomization, storefrontProductsRoute } from "./products";

describe("storefront search normalization", () => {
  it("matches Vietnamese text regardless of accents and case", () => {
    expect(normalizeSearchText("ÁO KHOÁC")).toBe("ao khoac");
    expect(matchesSearchQuery(["Áo khoác mùa đông"], "áo đông")).toBe(true);
  });

  it("requires every search term to be present", () => {
    expect(matchesSearchQuery(["Áo khoác mùa đông"], "áo hè")).toBe(false);
  });
});

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
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
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
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
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
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
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
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
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

    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      [],
      [
        makeVariant({ id: 1, isDefault: true }),
        makeVariant({ id: 2 }),
      ],
      mediaByVariant,
      false,
    );

    expect(item.thumbnail).toBeNull();
  });

  it("uses the explicit Product Thumbnail asset", () => {
    const item = buildListingItem(
      { req: { url: "http://localhost/" } } as any,
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map([[1, [makeMedia("variant-asset")]]]),
      false,
      new Map(),
      "product-asset",
    );

    expect(item.thumbnail).toBe("http://localhost/api/assets/products/product-asset/content");
  });

  it("returns the explicitly assigned Listing Hover Image", () => {
    const item = buildListingItem(
      { req: { url: "http://localhost/" } } as any,
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
      new Map(),
      "default-asset",
      "hover-asset",
    );

    expect(item.thumbnail).toBe("http://localhost/api/assets/products/default-asset/content");
    expect(item.hoverImage).toBe("http://localhost/api/assets/products/hover-asset/content");
  });

  it("falls back to first variant with media when default has none", () => {
    const mediaByVariant = new Map([
      [2, [makeMedia("asset_b")]],
    ]);

    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      [],
      [
        makeVariant({ id: 1, isDefault: true }),
        makeVariant({ id: 2 }),
      ],
      mediaByVariant,
      false,
    );

    expect(item.thumbnail).toBeNull();
  });

  it("returns null thumbnail when no variant has media", () => {
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.thumbnail).toBeNull();
  });

  it("uses customization media only as the thumbnail fallback when gallery media is empty", () => {
    const item = buildListingItem(
      { req: { url: "http://localhost/" } } as any,
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      true,
      new Map([[1, { assetId: "canvas-asset" }]]),
    );

    expect(item.thumbnail).toBeNull();
  });

  it("keeps gallery media ahead of customization media for thumbnails", () => {
    const item = buildListingItem(
      { req: { url: "http://localhost/" } } as any,
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map([[1, [makeMedia("gallery-asset")]]]),
      true,
      new Map([[1, { assetId: "canvas-asset" }]]),
    );

    expect(item.thumbnail).toBeNull();
  });

  it("builds categorySummary from category names", () => {
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      ["Crystal", "Premium"],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.categorySummary).toBe("Crystal, Premium");
  });

  it("returns null categorySummary when no categories", () => {
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      false,
    );

    expect(item.categorySummary).toBeNull();
  });

  it("marks product as customizable", () => {
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
      baseItem,
      [],
      [makeVariant({ id: 1, isDefault: true })],
      new Map(),
      true,
    );

    expect(item.customizable).toBe(true);
  });

  it("marks product as non-customizable by default", () => {
    const item = buildListingItem({ req: { url: "http://localhost/" } } as any, 
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
  it("keeps only shopper-safe derived clipart assets for clipart-enabled layers", () => {
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
              clipartCategoryMode: "allow_list",
              allowedClipartCategories: [{ id: "sports", name: "Sports" }],
              clipartAssets: [
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
      clipartCategoryMode: "allow_list",
      allowedClipartCategories: [{ id: "sports", name: "Sports" }],
    });
    expect((imageLayer as any).clipartAssets).toEqual([
      expect.objectContaining({
        id: "clipart_active",
        sourceAssetId: "asset_active",
      }),
    ]);
    expect((imageLayer as any).clipartAssets).toHaveLength(1);
  });

  it("preserves polygon geometry while sanitizing shopper customization", () => {
    const imageLayer = DEFAULT_TEMPLATE.layers.find(
      (layer) => layer.type === "image_shape",
    );
    if (!imageLayer || imageLayer.type !== "image_shape") {
      throw new Error("Missing image shape fixture");
    }

    const polygonShape = {
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
    };

    const customization: ProductCustomization = {
      productId: "1",
      enabled: true,
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layers: [
        {
          ...imageLayer,
          shape: polygonShape,
        },
      ],
      formFields: [],
    };

    const result = sanitizeShopperCustomization(customization);
    const resultLayer = result.layers[0];
    expect(resultLayer && resultLayer.type === "image_shape" ? resultLayer.shape : null).toEqual(polygonShape);
  });
});

describe("GET /:handle customization locale resolution", () => {
  const badgeShapeLayer = DEFAULT_TEMPLATE.layers.find(
    (layer) => layer.type === "image_shape",
  );

  function buildCustomizationRow() {
    if (!badgeShapeLayer || badgeShapeLayer.type !== "image_shape") {
      throw new Error("Missing image shape fixture");
    }
    return {
      productId: 1,
      enabled: true,
      canvasWidthPx: 1200,
      canvasHeightPx: 900,
      layersJson: JSON.stringify([
        {
          ...badgeShapeLayer,
          sourcePolicy: "upload_or_clipart_category",
          presentation: "source_select",
          clipartCategoryMode: "allow_list",
          allowedClipartCategories: [{ id: "sports", name: "Sports" }],
        },
        DEFAULT_TEMPLATE.layers.find((layer) => layer.id === "line_1"),
      ]),
      formFieldsJson: JSON.stringify([
        {
          id: "field_player_name",
          type: "text",
          label: "Tên cầu thủ",
          placeholder: "Nhập tên",
          helpText: null,
          required: true,
        },
      ]),
    };
  }

  function createQueryChain({
    getQueue,
    selectQueue,
  }: {
    getQueue: unknown[];
    selectQueue: unknown[];
  }) {
    const chain: any = {
      from: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      offset: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      leftJoin: vi.fn(() => chain),
      returning: vi.fn(() => chain),
      values: vi.fn(() => chain),
      get: vi.fn(async () => getQueue.shift() ?? null),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
    };
    return chain;
  }

  function createMockDb() {
    const getQueue: unknown[] = [];
    const selectQueue: unknown[] = [];
    const db: any = {
      getQueue,
      selectQueue,
      select: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
      insert: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
      update: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
      delete: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
    };
    return db;
  }

  function queueProductDetail(db: ReturnType<typeof createMockDb>) {
    db.getQueue.push({
      id: 1,
      title: "Áo đấu",
      subtitle: null,
      handle: "ao-dau",
      description: null,
      thumbnailAssetId: null,
      hoverAssetId: null,
      status: "published",
      deletedAt: null,
    });
    // product title/subtitle/description hydration
    db.selectQueue.push([]);
    // Promise.all: categories, attributes, options, variants, media, variant media, variant customization media
    for (let i = 0; i < 7; i += 1) {
      db.selectQueue.push([]);
    }
    // NOTE: product_category/attribute/option/option_value hydrations receive empty
    // row arrays and early-return without querying.
    // customization form field label/helpText/placeholder translations (en)
    db.selectQueue.push([
      {
        ownerType: "customization_form_field",
        ownerKey: "field_player_name",
        fieldName: "label",
        locale: "en",
        value: "Player name",
      },
    ]);
    // clipart categories + assets rows
    db.selectQueue.push([
      { id: "sports", name: "Thể thao" },
    ]);
    db.selectQueue.push([
      {
        id: "clip_star",
        sourceAssetId: "asset_star",
        name: "Ngôi sao",
        fileName: "star.svg",
        categoryId: "sports",
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 100,
        sourceHeightPx: 100,
        active: true,
      },
    ]);
    // clipart category + asset name translations (en)
    db.selectQueue.push([
      { ownerType: "clipart_category", ownerKey: "sports", fieldName: "name", locale: "en", value: "Sports" },
    ]);
    db.selectQueue.push([
      { ownerType: "clipart_asset", ownerKey: "clip_star", fieldName: "name", locale: "en", value: "Star" },
    ]);
  }

  it("resolves form fields, sample text and clipart names per requested locale", async () => {
    const db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    queueProductDetail(db);
    db.getQueue.push(buildCustomizationRow());

    const res = await storefrontProductsRoute.request("/ao-dau?locale=en");

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    const customization = data.item.customization;

    expect(customization.formFields[0].label).toBe("Player name");
    expect(customization.formFields[0].placeholder).toBe("Nhập tên");
    const textLayer = customization.layers.find((layer: any) => layer.id === "line_1");
    expect(textLayer.text.sampleText).toBe("LEAGUE CHAMPION");
    const imageLayer = customization.layers.find((layer: any) => layer.id === badgeShapeLayer?.id);
    expect(imageLayer.allowedClipartCategories[0]).toMatchObject({ id: "sports", name: "Sports" });
    expect(imageLayer.clipartAssets[0]).toMatchObject({ id: "clip_star", name: "Star" });
  });

  it("falls back to canonical Vietnamese values when no locale is requested", async () => {
    const db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    queueProductDetail(db);
    db.getQueue.push(buildCustomizationRow());

    const res = await storefrontProductsRoute.request("/ao-dau");

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    const customization = data.item.customization;

    expect(customization.formFields[0].label).toBe("Tên cầu thủ");
    const textLayer = customization.layers.find((layer: any) => layer.id === "line_1");
    expect(textLayer.text.sampleText).toBe("LEAGUE CHAMPION");
    const imageLayer = customization.layers.find((layer: any) => layer.id === badgeShapeLayer?.id);
    expect(imageLayer.allowedClipartCategories[0]).toMatchObject({ id: "sports", name: "Thể thao" });
    expect(imageLayer.clipartAssets[0]).toMatchObject({ id: "clip_star", name: "Ngôi sao" });
  });
});
