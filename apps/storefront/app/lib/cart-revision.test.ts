import { describe, expect, it } from "vitest";
import { type CartLine } from "./cart";
import {
  CART_LINE_REVISION_PARAM,
  canReviseCartLine,
  getCartLineRevisionPath,
  resolveCartLineRevision,
} from "./cart-revision";
import { getCategoryProductRedirectPath } from "./storefront-paths";

function makeCartLine(overrides?: Partial<CartLine>): CartLine {
  return {
    id: "line-1",
    productId: 1,
    variantId: 10,
    quantity: 2,
    customizationValues: { name: { text: "Alice" } },
    customizationSummary: [{ fieldId: "name", label: "Name", valueSummary: "Alice" }],
    display: {
      productTitle: "Champion Cup",
      productHandle: "champion-cup",
      variantTitle: "Gold",
      sku: "SKU-1",
      thumbnail: null,
      priceAmount: 5000,
      customizable: true,
      requiresCustomization: true,
      isContactPrice: false,
    },
    ...overrides,
  };
}

describe("cart line revisions", () => {
  it("builds a PDP path that contains only the cart line reference", () => {
    const path = getCartLineRevisionPath("champion-cup", "line 1");

    expect(path).toBe("/product/champion-cup?cartLine=line+1");
    expect(path).toContain(`${CART_LINE_REVISION_PARAM}=`);
    expect(path).not.toContain("Alice");
  });

  it("allows revisions only for customized cart lines", () => {
    expect(canReviseCartLine(makeCartLine())).toBe(true);
    expect(canReviseCartLine(makeCartLine({
      display: { ...makeCartLine().display, customizable: false },
    }))).toBe(false);
  });

  it("preserves the cart line reference through the generic product redirect", () => {
    expect(getCategoryProductRedirectPath("cups", "champion-cup", "?cartLine=line-1"))
      .toBe("/categories/cups/products/champion-cup?cartLine=line-1");
  });

  it("restores only a source line for the requested product", () => {
    const line = makeCartLine();

    expect(resolveCartLineRevision({
      lines: [line],
      cartLineId: line.id,
      productId: 1,
      variantIds: [10],
    })).toEqual({ status: "restored", line });
    expect(resolveCartLineRevision({
      lines: [line],
      cartLineId: line.id,
      productId: 2,
      variantIds: [10],
    })).toEqual({ status: "missing", line: null });
  });

  it("flags a missing source or obsolete variant for correction", () => {
    const line = makeCartLine();

    expect(resolveCartLineRevision({
      lines: [],
      cartLineId: line.id,
      productId: 1,
      variantIds: [10],
    })).toEqual({ status: "missing", line: null });
    expect(resolveCartLineRevision({
      lines: [line],
      cartLineId: line.id,
      productId: 1,
      variantIds: [11],
    })).toEqual({ status: "variant_missing", line });
  });
});
