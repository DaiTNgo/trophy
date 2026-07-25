import { describe, expect, it } from "vitest";
import { createCustomizationInteractionHandlers } from "@trophy/customization-react";
import { buildProductMediaCarousel, type StorefrontVariantMedia } from "./product-customization";

function media(id: string, position = 0, assetId = id): StorefrontVariantMedia {
  return {
    id,
    assetId,
    contentUrl: `https://cdn.test/${id}.png`,
    fileName: `${id}.png`,
    mimeType: "image/png",
    widthPx: 100,
    heightPx: 100,
    position,
  };
}

describe("buildProductMediaCarousel", () => {
  it("places customization media first and orders gallery media by position", () => {
    const result = buildProductMediaCarousel({
      customizationMedia: media("custom"),
      galleryMedia: [media("gallery-2", 2), media("gallery-1", 1)],
    });

    expect(result.map((entry) => entry.id)).toEqual(["custom", "gallery-1", "gallery-2"]);
  });

  it("deduplicates an asset that is present in both roles", () => {
    const result = buildProductMediaCarousel({
      customizationMedia: media("custom", 0, "shared"),
      galleryMedia: [media("gallery", 1, "shared"), media("other", 2)],
    });

    expect(result.map((entry) => entry.id)).toEqual(["custom", "other"]);
  });

  it("delivers form focus and pointer interactions without changing the callback contract", () => {
    let calls = 0;
    const handlers = createCustomizationInteractionHandlers(() => {
      calls += 1;
    });

    handlers.onFocusCapture?.();
    handlers.onPointerDown?.();

    expect(calls).toBe(2);
  });
});
