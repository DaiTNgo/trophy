import { describe, expect, it, vi, beforeEach } from "vitest";
import { storefrontCollectionsRoute } from "./collections";
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

describe("GET /api/storefront/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbClient.getDb as any).mockReturnValue(mockDb);
  });

  it("returns all collections ordered by position", async () => {
    const rows = [
      {
        id: 2,
        title: "Bộ Sưu Tập 2",
        handle: "bo-suu-tap-2",
        description: null,
        imageUrl: null,
      },
      {
        id: 1,
        title: "Bộ Sưu Tập 1",
        handle: "bo-suu-tap-1",
        description: "First",
        imageUrl: "http://localhost/images/col1.png",
      },
    ];
    mockDb.orderBy.mockResolvedValue(rows);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue(rows);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body).toEqual({
      items: rows.map((row) => ({ ...row, visibility: "public" })),
    });
  });

  it("returns empty array when no collections exist", async () => {
    mockDb.orderBy.mockResolvedValue([]);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue([]);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = (await res.json()) as any;
    expect(body).toEqual({ items: [] });
  });

  it("returns only public collections and resolves missing visibility to public", async () => {
    const rows = [
      {
        id: 1,
        title: "Public",
        handle: "public",
        description: null,
        imageUrl: null,
        visibility: "public",
      },
    ];
    mockDb.orderBy.mockResolvedValue(rows);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue(rows);

    const res = await storefrontCollectionsRoute.request("/");

    expect(res.status).toBe(200);
    expect(((await res.json()) as any).items).toEqual(rows);
    expect(mockDb.where).toHaveBeenCalled();
  });
});

describe("GET /api/storefront/collections/:handle/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid customizable filters", async () => {
    (dbClient.getDb as any).mockReturnValue(mockDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=sometimes",
    );

    expect(res.status).toBe(400);
  });

  it("returns 404 when a collection is not public", async () => {
    const queuedDb = createQueuedDb([undefined]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCollectionsRoute.request("/hidden/products");

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "Collection not found",
    });
  });

  it("returns published non-customizable products when the virtual best-sellers collection is absent", async () => {
    const queuedDb = createQueuedDb([
      undefined,
      [{ id: 10 }, { id: 8 }],
      { total: 4 },
      [
        {
          id: 8,
          title: "Fallback Cup",
          subtitle: null,
          handle: "fallback-cup",
          status: "published",
        },
        {
          id: 10,
          title: "Fallback Plate",
          subtitle: null,
          handle: "fallback-plate",
          status: "published",
        },
      ],
      { total: 2 },
      [],
      [],
      [
        {
          id: 81,
          productId: 8,
          isDefault: true,
          priceAmount: 10000,
          position: 0,
        },
        {
          id: 101,
          productId: 10,
          isDefault: true,
          priceAmount: 12000,
          position: 0,
        },
      ],
      [],
      [],
      [],
    ]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=false&limit=2",
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items).toEqual([
      expect.objectContaining({
        id: 10,
        handle: "fallback-plate",
        customizable: false,
      }),
      expect.objectContaining({
        id: 8,
        handle: "fallback-cup",
        customizable: false,
      }),
    ]);
    expect(body).toMatchObject({ page: 1, limit: 2, total: 4 });
  });

  it("keeps curated, sales-ranked, and fallback products in the virtual best-sellers order", async () => {
    const queuedDb = createQueuedDb([
      { id: 7 },
      [{ id: 7 }, { id: 9 }, { id: 13 }],
      { total: 3 },
      [
        {
          id: 13,
          title: "Fallback Cup",
          subtitle: null,
          handle: "fallback-cup",
          status: "published",
        },
        {
          id: 9,
          title: "Sales Cup",
          subtitle: null,
          handle: "sales-cup",
          status: "published",
        },
        {
          id: 7,
          title: "Curated Cup",
          subtitle: null,
          handle: "curated-cup",
          status: "published",
        },
      ],
      { total: 3 },
      [],
      [],
      [
        {
          id: 71,
          productId: 7,
          isDefault: true,
          priceAmount: 10000,
          position: 0,
        },
        {
          id: 91,
          productId: 9,
          isDefault: true,
          priceAmount: 12000,
          position: 0,
        },
        {
          id: 131,
          productId: 13,
          isDefault: true,
          priceAmount: 14000,
          position: 0,
        },
      ],
      [],
      [],
      [
        { productId: 7, enabled: true },
        { productId: 9, enabled: true },
        { productId: 13, enabled: true },
      ],
    ]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=true&limit=3",
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items.map((item: { id: number }) => item.id)).toEqual([
      7, 9, 13,
    ]);
    expect(body.items).toEqual([
      expect.objectContaining({ handle: "curated-cup", customizable: true }),
      expect.objectContaining({ handle: "sales-cup", customizable: true }),
      expect.objectContaining({ handle: "fallback-cup", customizable: true }),
    ]);
    expect(body).toMatchObject({ page: 1, limit: 3, total: 3 });
  });

  it("uses the first product media as the best-seller thumbnail", async () => {
    const queuedDb = createQueuedDb([
      undefined,
      [{ id: 10 }],
      { total: 1 },
      [
        {
          id: 10,
          title: "Media Cup",
          subtitle: null,
          handle: "media-cup",
          status: "published",
        },
      ],
      { total: 1 },
      [],
      [
        {
          productId: 10,
          url: "/api/assets/products/product-media/content",
          position: 0,
        },
      ],
      [
        {
          id: 101,
          productId: 10,
          isDefault: true,
          priceAmount: 12000,
          position: 0,
        },
      ],
      [],
      [],
      [],
    ]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=false&limit=1",
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items[0].thumbnail).toBeNull();
  });
});
