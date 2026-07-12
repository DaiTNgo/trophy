import { describe, expect, it } from "vitest";
import { Context } from "hono";
import { toAbsoluteAssetUrl } from "./url";

describe("toAbsoluteAssetUrl", () => {
  const mockContext = {
    req: {
      url: "http://localhost:8787/api/some/route",
    },
  } as unknown as Context;

  it("returns null for null or undefined input", () => {
    expect(toAbsoluteAssetUrl(mockContext, null)).toBeNull();
    expect(toAbsoluteAssetUrl(mockContext, undefined)).toBeNull();
    expect(toAbsoluteAssetUrl(mockContext, "")).toBeNull();
  });

  it("leaves already absolute HTTP URLs unchanged", () => {
    expect(toAbsoluteAssetUrl(mockContext, "http://example.com/asset.png")).toBe("http://example.com/asset.png");
    expect(toAbsoluteAssetUrl(mockContext, "https://example.com/asset.png")).toBe("https://example.com/asset.png");
  });

  it("leaves non-backend local schemes alone", () => {
    expect(toAbsoluteAssetUrl(mockContext, "blob:http://localhost:8787/1234")).toBe("blob:http://localhost:8787/1234");
    expect(toAbsoluteAssetUrl(mockContext, "data:image/png;base64,iVBORw0KGgo")).toBe("data:image/png;base64,iVBORw0KGgo");
  });

  it("converts backend-local paths into absolute URLs using the request origin", () => {
    // With leading slash
    expect(toAbsoluteAssetUrl(mockContext, "/api/assets/products/123.png")).toBe("http://localhost:8787/api/assets/products/123.png");
    // Without leading slash (relative to root due to URL constructor behavior, but usually we have leading slashes for assets)
    expect(toAbsoluteAssetUrl(mockContext, "api/assets/products/123.png")).toBe("http://localhost:8787/api/assets/products/123.png");
  });
});
