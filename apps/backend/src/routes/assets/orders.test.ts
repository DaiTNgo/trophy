import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { assetsOrdersRoute } from "./orders";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const NON_EXISTENT_UUID = "33333333-3333-4333-8333-333333333333";

describe("assetsOrdersRoute", () => {
  let db: any;
  let env: any;

  beforeEach(() => {
    db = {
      select: vi.fn(),
    };
    vi.mocked(getDb).mockReturnValue(db as never);

    env = {
      CUSTOMIZATION_ASSETS: {
        get: vi.fn(),
      },
    };
  });

  it("returns 404 if order asset record not found in db", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    });

    const res = await assetsOrdersRoute.request(`/${NON_EXISTENT_UUID}/content`, {}, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 if order asset object not found in R2 and fallback fails", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            targetObjectKey: `orders/1/items/1/background/test.webp`,
            sourceObjectKey: `catalog/1/variants/1/test.webp`,
          }),
        }),
      }),
    });
    env.CUSTOMIZATION_ASSETS.get.mockResolvedValue(null);

    const res = await assetsOrdersRoute.request(`/${VALID_UUID_1}/content`, {}, env);
    expect(res.status).toBe(404);
  });

  it("serves order asset from targetObjectKey in R2 with cache headers", async () => {
    const mockBody = new ReadableStream();
    const mockR2Object = {
      body: mockBody,
      httpEtag: "etag-target",
      writeHttpMetadata: vi.fn((headers: Headers) => {
        headers.set("content-type", "image/webp");
      }),
    };

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            targetObjectKey: `orders/1/items/1/background/test.webp`,
            sourceObjectKey: `catalog/1/variants/1/test.webp`,
          }),
        }),
      }),
    });
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === "orders/1/items/1/background/test.webp") {
        return mockR2Object;
      }
      return null;
    });

    const res = await assetsOrdersRoute.request(`/${VALID_UUID_1}/content`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe("etag-target");
    expect(res.headers.get("cache-control")).toContain("immutable");
  });

  it("falls back to sourceObjectKey if targetObjectKey is not in R2 yet", async () => {
    const mockBody = new ReadableStream();
    const mockR2Object = {
      body: mockBody,
      httpEtag: "etag-source",
      writeHttpMetadata: vi.fn((headers: Headers) => {
        headers.set("content-type", "image/webp");
      }),
    };

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            targetObjectKey: `orders/1/items/1/background/test.webp`,
            sourceObjectKey: `catalog/1/variants/1/test.webp`,
          }),
        }),
      }),
    });
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === "catalog/1/variants/1/test.webp") {
        return mockR2Object;
      }
      return null;
    });

    const res = await assetsOrdersRoute.request(`/${VALID_UUID_1}/content`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe("etag-source");
  });

  it("serves preview from targetPreviewObjectKey or falls back to targetObjectKey", async () => {
    const mockBody = new ReadableStream();
    const mockR2Object = {
      body: mockBody,
      httpEtag: "etag-preview",
      writeHttpMetadata: vi.fn((headers: Headers) => {
        headers.set("content-type", "image/webp");
      }),
    };

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            targetObjectKey: `orders/1/items/1/background/test.source.pdf`,
            targetPreviewObjectKey: `orders/1/items/1/background/test.preview.webp`,
            sourceObjectKey: `catalog/1/test.pdf`,
          }),
        }),
      }),
    });
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === "orders/1/items/1/background/test.preview.webp") {
        return mockR2Object;
      }
      return null;
    });

    const res = await assetsOrdersRoute.request(`/${VALID_UUID_1}/preview`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe("etag-preview");
  });
});
