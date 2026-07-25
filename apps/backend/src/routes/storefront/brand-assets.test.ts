import { describe, expect, it, vi } from "vitest";
import { storefrontBrandAssetsRoute } from "./brand-assets";

describe("storefront brand asset routes", () => {
  it("serves immutable font assets with a browser-only cache policy", async () => {
    const get = vi.fn(async () => ({
      body: new ReadableStream(),
      httpEtag: "etag-font-inter",
      writeHttpMetadata: (headers: Headers) => headers.set("content-type", "font/ttf"),
    }));
    const response = await storefrontBrandAssetsRoute.request(
      "/fonts/file/font_inter_regular",
      {},
      {
        CUSTOMIZATION_ASSETS: {
          get,
        },
      } as never,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(response.headers.get("etag")).toBe("etag-font-inter");
    expect(get).toHaveBeenCalledWith("fonts/font_inter_regular.ttf");
  });

  it("returns a typed not-found response when the font asset is absent", async () => {
    const response = await storefrontBrandAssetsRoute.request(
      "/fonts/file/font_missing",
      {},
      { CUSTOMIZATION_ASSETS: { get: async () => null } } as never,
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Font file not found" });
  });
});
