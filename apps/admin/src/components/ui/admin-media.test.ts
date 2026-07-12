import { describe, expect, it } from "vitest";
import { shouldLoadMediaViaBlob } from "../../lib/admin-media";

describe("shouldLoadMediaViaBlob", () => {
  it("loads remote webp media through a blob URL", () => {
    expect(shouldLoadMediaViaBlob("/api/assets/customizations/asset_star/content", "image/webp")).toBe(true);
    expect(shouldLoadMediaViaBlob("https://example.test/image.webp", "image/webp")).toBe(true);
  });

  it("keeps local draft previews as-is", () => {
    expect(shouldLoadMediaViaBlob("blob:https://example.test/123", "image/webp")).toBe(false);
    expect(shouldLoadMediaViaBlob("data:image/webp;base64,abcd", "image/webp")).toBe(false);
  });

  it("does not route non-webp images through the blob loader", () => {
    expect(shouldLoadMediaViaBlob("/api/assets/customizations/asset_star/content", "image/png")).toBe(false);
  });
});
