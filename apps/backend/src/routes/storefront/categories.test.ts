import { describe, expect, it, vi, beforeEach } from "vitest";
import { storefrontCategoriesRoute } from "./categories";
import * as dbClient from "../../db/client";
import { hydrateAndResolveTranslations } from "../../lib/catalog-translation";

vi.mock("../../lib/catalog-translation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/catalog-translation")>();
  return {
    ...actual,
    hydrateTranslations: vi
      .fn()
      .mockImplementation(async (db, entityType, rows) => rows),
    hydrateAndResolveTranslations: vi.fn(),
  };
});

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

const mockDb: any = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
};

mockDb.select.mockReturnValue(mockDb);
mockDb.from.mockReturnValue(mockDb);
mockDb.where.mockReturnValue(mockDb);
mockDb.orderBy.mockReturnValue(mockDb);

function createQueuedDb(results: unknown[]) {
  const queue = [...results];
  const chain: any = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => Promise.resolve(queue.shift())),
    get: vi.fn(() => Promise.resolve(queue.shift())),
    then: vi.fn((resolve, reject) =>
      Promise.resolve(queue.shift()).then(resolve, reject),
    ),
  };

  return chain;
}

describe("GET /api/storefront/categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbClient.getDb as any).mockReturnValue(mockDb);
  });

  it("returns all public categories", async () => {
    const rows = [
      {
        id: 1,
        name: "Cúp",
        handle: "cup",
        description: "Danh mục cúp",
        imageUrl: null,
      },
    ];
    mockDb.orderBy.mockResolvedValue(rows);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue(rows);

    const res = await storefrontCategoriesRoute.request("/");
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body).toEqual({ items: rows });
  });
});

describe("GET /api/storefront/categories/:handle/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid customizable filters", async () => {
    (dbClient.getDb as any).mockReturnValue(mockDb);

    const res = await storefrontCategoriesRoute.request(
      "/cup/products?customizable=invalid",
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when a category is not found", async () => {
    const queuedDb = createQueuedDb([undefined]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCategoriesRoute.request("/non-existent/products");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "Category not found",
    });
  });

  it("returns products and availableCollections when category is found", async () => {
    const categoryRecord = { id: 1, visibility: "public" };
    const availableCollections = [
      { id: 10, title: "Bóng đá", handle: "bong-da", position: 0 },
      { id: 20, title: "Golf", handle: "golf", position: 1 },
    ];
    const items = [
      {
        id: 101,
        title: "Cúp Vàng",
        subtitle: "Cúp cao cấp",
        handle: "cup-vang",
        status: "published",
        thumbnailAssetId: null,
        hoverAssetId: null,
      },
    ];
    const totalCount = { total: 1 };
    const categoryLinks: unknown[] = [];
    const productMediaList: unknown[] = [];
    const variantList = [
      {
        id: 501,
        productId: 101,
        title: "Default",
        priceAmount: 500000,
        position: 0,
      },
    ];
    const variantMediaList: unknown[] = [];
    const variantCustomizationMediaList: unknown[] = [];
    const customizationList = [{ productId: 101, enabled: true }];

    const queuedDb = createQueuedDb([
      categoryRecord, // category lookup
      availableCollections, // available collections query
      items, // products list
      totalCount, // total count
      categoryLinks, // category rows
      productMediaList, // media rows
      variantList, // variant rows
      variantMediaList, // variant media rows
      variantCustomizationMediaList, // variant customization media
      customizationList, // customization rows
    ]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCategoriesRoute.request("/cup/products");
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body.page).toBe(1);
    expect(body.limit).toBe(20);
    expect(body.total).toBe(1);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(101);
    expect(body.items[0].title).toBe("Cúp Vàng");
    expect(body.items[0].customizable).toBe(true);
    expect(body.availableCollections).toEqual([
      { id: 10, title: "Bóng đá", handle: "bong-da" },
      { id: 20, title: "Golf", handle: "golf" },
    ]);
  });
});
