import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { assetsProductsRoute } from "./products";

const VALID_UUID_1 = "11111111-1111-4111-8111-111111111111";
const VALID_UUID_2 = "22222222-2222-4222-8222-222222222222";
const NON_EXISTENT_UUID = "33333333-3333-4333-8333-333333333333";

describe("assetsProductsRoute", () => {
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

  it("returns 404 if asset record not found in db", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue(null),
        }),
      }),
    });

    const res = await assetsProductsRoute.request(`/${NON_EXISTENT_UUID}/content`, {}, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 if asset object not found in R2", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            objectKey: `catalog/1/assets/${VALID_UUID_1}.pdf`,
            previewObjectKey: `catalog/1/assets/${VALID_UUID_1}.webp`,
          }),
        }),
      }),
    });
    env.CUSTOMIZATION_ASSETS.get.mockResolvedValue(null);

    const res = await assetsProductsRoute.request(`/${VALID_UUID_1}/content`, {}, env);
    expect(res.status).toBe(404);
  });

  it("returns preview content on GET /:id/content when available", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            objectKey: `catalog/1/assets/${VALID_UUID_1}.pdf`,
            previewObjectKey: `catalog/1/assets/${VALID_UUID_1}.webp`,
          }),
        }),
      }),
    });

    const mockBody = new Uint8Array([1, 2, 3]);
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === `catalog/1/assets/${VALID_UUID_1}.webp`) {
        return {
          body: mockBody,
          httpEtag: "etag-webp",
          writeHttpMetadata: (headers: Headers) => {
            headers.set("content-type", "image/webp");
          },
        };
      }
      return null;
    });

    const res = await assetsProductsRoute.request(`/${VALID_UUID_1}/content`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("etag")).toBe("etag-webp");
  });

  it("returns original content on GET /:id/export", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            fileName: "test.pdf",
            objectKey: `catalog/1/assets/${VALID_UUID_1}.pdf`,
            previewObjectKey: `catalog/1/assets/${VALID_UUID_1}.webp`,
          }),
        }),
      }),
    });

    const mockBody = new Uint8Array([1, 2, 3]);
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === `catalog/1/assets/${VALID_UUID_1}.pdf`) {
        return {
          body: mockBody,
          httpEtag: "etag-pdf",
          writeHttpMetadata: (headers: Headers) => {
            headers.set("content-type", "application/pdf");
          },
        };
      }
      return null;
    });

    const res = await assetsProductsRoute.request(`/${VALID_UUID_1}/export`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("etag")).toBe("etag-pdf");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="test.pdf"');
  });

  it("returns preview object on GET /:id/preview when previewObjectKey is set", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_1,
            objectKey: `catalog/1/assets/${VALID_UUID_1}.pdf`,
            previewObjectKey: `catalog/1/assets/${VALID_UUID_1}/preview.webp`,
          }),
        }),
      }),
    });

    const mockBody = new Uint8Array([4, 5, 6]);
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === `catalog/1/assets/${VALID_UUID_1}/preview.webp`) {
        return {
          body: mockBody,
          httpEtag: "etag-webp",
          writeHttpMetadata: (headers: Headers) => {
            headers.set("content-type", "image/webp");
          },
        };
      }
      return null;
    });

    const res = await assetsProductsRoute.request(`/${VALID_UUID_1}/preview`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/webp");
    expect(res.headers.get("etag")).toBe("etag-webp");
    expect(env.CUSTOMIZATION_ASSETS.get).toHaveBeenCalledWith(`catalog/1/assets/${VALID_UUID_1}/preview.webp`);
  });

  it("falls back to objectKey on GET /:id/preview when previewObjectKey is null", async () => {
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            id: VALID_UUID_2,
            objectKey: `catalog/1/assets/${VALID_UUID_2}.png`,
            previewObjectKey: null,
          }),
        }),
      }),
    });

    const mockBody = new Uint8Array([7, 8, 9]);
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      if (key === `catalog/1/assets/${VALID_UUID_2}.png`) {
        return {
          body: mockBody,
          httpEtag: "etag-png",
          writeHttpMetadata: (headers: Headers) => {
            headers.set("content-type", "image/png");
          },
        };
      }
      return null;
    });

    const res = await assetsProductsRoute.request(`/${VALID_UUID_2}/preview`, {}, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(env.CUSTOMIZATION_ASSETS.get).toHaveBeenCalledWith(`catalog/1/assets/${VALID_UUID_2}.png`);
  });
});
