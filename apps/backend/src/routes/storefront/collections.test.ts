import { describe, expect, it, vi, beforeEach } from "vitest";
import { storefrontCollectionsRoute } from "./collections";
import * as dbClient from "../../db/client";

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

describe("GET /api/storefront/collections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbClient.getDb as any).mockReturnValue(mockDb);
  });

  it("returns all collections ordered by position", async () => {
    const rows = [
      { id: 2, title: "Bộ Sưu Tập 2", handle: "bo-suu-tap-2", description: null, imageUrl: null },
      { id: 1, title: "Bộ Sưu Tập 1", handle: "bo-suu-tap-1", description: "First", imageUrl: "/images/col1.png" },
    ];
    mockDb.orderBy.mockResolvedValue(rows);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ items: rows });
  });

  it("returns empty array when no collections exist", async () => {
    mockDb.orderBy.mockResolvedValue([]);

    const res = await storefrontCollectionsRoute.request("/");
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body).toEqual({ items: [] });
  });
});
