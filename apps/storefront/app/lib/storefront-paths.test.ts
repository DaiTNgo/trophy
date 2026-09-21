import { describe, expect, it } from "vitest";
import {
  getActiveCategoryHandle,
  getCategoryProductPath,
  getGenericProductPath,
  getProductPath,
} from "./storefront-paths";

describe("storefront product paths", () => {
  it("generates contextual product paths with query params", () => {
    expect(getProductPath({ productHandle: "champion-cup" }))
      .toBe("/product/champion-cup");
    expect(getProductPath({ productHandle: "champion-cup", categoryHandle: "cups" }))
      .toBe("/product/champion-cup?category=cups");
    expect(getProductPath({ productHandle: "champion-cup", collectionHandle: "golf" }))
      .toBe("/product/champion-cup?collection=golf");
    expect(getProductPath({ productHandle: "champion-cup", categoryHandle: "cups", collectionHandle: "golf", sourceContext: "category" }))
      .toBe("/product/champion-cup?category=cups&collection=golf");
    expect(getProductPath({ productHandle: "champion-cup", categoryHandle: "cups", collectionHandle: "golf", sourceContext: "collection" }))
      .toBe("/product/champion-cup?collection=golf&category=cups");
    expect(getGenericProductPath("champion-cup")).toBe("/product/champion-cup");
  });

  it("keeps the legacy category route available for redirects", () => {
    expect(getCategoryProductPath("cups", "champion-cup"))
      .toBe("/categories/cups/products/champion-cup");
  });

  it("extracts active category handle from pathname correctly", () => {
    expect(getActiveCategoryHandle("/categories/cup-kim-loai")).toBe("cup-kim-loai");
    expect(getActiveCategoryHandle("/categories/cup-pha-le/products/pha-le-1")).toBe("cup-pha-le");
    expect(getActiveCategoryHandle("/products")).toBeNull();
    expect(getActiveCategoryHandle("/")).toBeNull();
  });
});
