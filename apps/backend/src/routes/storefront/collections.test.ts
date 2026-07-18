import { describe, expect, it, vi, beforeEach } from "vitest";
import { storefrontCollectionsRoute } from "./collections";
import * as dbClient from "../../db/client";
import { hydrateAndResolveTranslations } from "../../lib/catalog-translation";

vi.mock("../../lib/catalog-translation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/catalog-translation")>();
  return {
    ...actual,
    hydrateTranslations: vi.fn().mockImplementation(async (db, entityType, rows) => rows),
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
    then: vi.fn((resolve, reject) => Promise.resolve(queue.shift()).then(resolve, reject)),
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
      { id: 2, title: "Bộ Sưu Tập 2", handle: "bo-suu-tap-2", description: null, imageUrl: null },
      { id: 1, title: "Bộ Sưu Tập 1", handle: "bo-suu-tap-1", description: "First", imageUrl: "http://localhost/images/col1.png" },
    ];
    mockDb.orderBy.mockResolvedValue(rows);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue(rows);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body).toEqual({ items: rows });
  });

  it("returns empty array when no collections exist", async () => {
    mockDb.orderBy.mockResolvedValue([]);
    vi.mocked(hydrateAndResolveTranslations).mockResolvedValue([]);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body).toEqual({ items: [] });
  });
});

describe("GET /api/storefront/collections/:handle/products", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid customizable filters", async () => {
    (dbClient.getDb as any).mockReturnValue(mockDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=sometimes"
    );

    expect(res.status).toBe(400);
  });

  it("fills best-sellers customizable results with matching published fallback products", async () => {
    const queuedDb = createQueuedDb([
      { id: 7 },
      [{ id: 1, title: "Curated Cup", subtitle: null, handle: "curated-cup", status: "published" }],
      { total: 1 },
      [],
      [{ id: 11, productId: 1, isDefault: true, priceAmount: 10000, position: 0 }],
      [],
      [{ productId: 1, enabled: true }],
      [{ id: 2, title: "Fallback Cup", subtitle: null, handle: "fallback-cup", status: "published" }],
      { total: 1 },
      [],
      [{ id: 22, productId: 2, isDefault: true, priceAmount: 12000, position: 0 }],
      [],
      [{ productId: 2, enabled: true }],
    ]);
    (dbClient.getDb as any).mockReturnValue(queuedDb);

    const res = await storefrontCollectionsRoute.request(
      "/best-sellers/products?customizable=true&limit=2"
    );

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.items).toEqual([
      expect.objectContaining({ id: 1, handle: "curated-cup", customizable: true }),
      expect.objectContaining({ id: 2, handle: "fallback-cup", customizable: true }),
    ]);
    expect(body).toMatchObject({ page: 1, limit: 2, total: 2 });
  });
});
