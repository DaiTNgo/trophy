import { describe, expect, it } from "vitest";
import {
  getCategoryProductPath,
  getGenericProductPath,
  getProductPath,
} from "./storefront-paths";

describe("storefront product paths", () => {
  it("uses the product-only route as the canonical product path", () => {
    expect(getProductPath({ productHandle: "champion-cup", categoryHandle: "cups" }))
      .toBe("/product/champion-cup");
    expect(getGenericProductPath("champion-cup")).toBe("/product/champion-cup");
  });

  it("keeps the legacy category route available for redirects", () => {
    expect(getCategoryProductPath("cups", "champion-cup"))
      .toBe("/categories/cups/products/champion-cup");
  });
});
