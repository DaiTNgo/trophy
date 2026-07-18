import { describe, expect, it } from "vitest";
import {
  RECENTLY_VIEWED_STORAGE_KEY,
  getRecentlyViewedProducts,
  parseRecentlyViewedProducts,
  recordRecentlyViewedProduct,
  upsertRecentlyViewedProduct,
  type RecentlyViewedProduct,
} from "./recently-viewed";

function makeProduct(overrides?: Partial<RecentlyViewedProduct>): RecentlyViewedProduct {
  return {
    productId: 1,
    handle: "champion-cup",
    title: "Champion Cup",
    thumbnail: "/images/champion-cup.png",
    priceAmount: 5000,
    viewedAt: "2026-07-16T10:00:00.000Z",
    ...overrides,
  };
}

function createStorage(initial: string | null = null) {
  const state = new Map<string, string>();
  if (initial !== null) {
    state.set(RECENTLY_VIEWED_STORAGE_KEY, initial);
  }

  return {
    getItem(key: string) {
      return state.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      state.set(key, value);
    },
  };
}

describe("recently viewed helpers", () => {
  it("parses valid storage and ignores malformed json", () => {
    const lines = [makeProduct()];

    expect(parseRecentlyViewedProducts(JSON.stringify(lines))).toEqual(lines);
    expect(parseRecentlyViewedProducts("not-json")).toEqual([]);
    expect(parseRecentlyViewedProducts(null)).toEqual([]);
  });

  it("drops malformed items while preserving valid entries", () => {
    const raw = JSON.stringify([
      makeProduct(),
      { productId: "bad-id", handle: "bad", title: "Bad", thumbnail: null, priceAmount: null, viewedAt: "2026-07-16T10:00:00.000Z" },
      { productId: 2, handle: "", title: "No Handle", thumbnail: null, priceAmount: 1000, viewedAt: "2026-07-16T10:00:00.000Z" },
    ]);

    expect(parseRecentlyViewedProducts(raw)).toEqual([makeProduct()]);
  });

  it("moves re-viewed products to the front without duplicating them", () => {
    const current = [
      makeProduct({ productId: 1, handle: "product-1", title: "Product 1", viewedAt: "2026-07-16T09:00:00.000Z" }),
      makeProduct({ productId: 2, handle: "product-2", title: "Product 2", viewedAt: "2026-07-16T08:00:00.000Z" }),
    ];

    const next = upsertRecentlyViewedProduct(current, {
      productId: 2,
      handle: "product-2",
      title: "Product 2",
      thumbnail: null,
      priceAmount: 8000,
      viewedAt: "2026-07-16T11:00:00.000Z",
    });

    expect(next).toHaveLength(2);
    expect(next[0]?.productId).toBe(2);
    expect(next[1]?.productId).toBe(1);
  });

  it("enforces the max item limit", () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      makeProduct({
        productId: index + 1,
        handle: `product-${index + 1}`,
        title: `Product ${index + 1}`,
        viewedAt: `2026-07-16T0${index}:00:00.000Z`,
      }),
    );

    const next = upsertRecentlyViewedProduct(items, {
      productId: 99,
      handle: "product-99",
      title: "Product 99",
      thumbnail: null,
      priceAmount: 9000,
      viewedAt: "2026-07-16T12:00:00.000Z",
    });

    expect(next).toHaveLength(8);
    expect(next[0]?.productId).toBe(99);
    expect(next.some((item) => item.productId === 8)).toBe(false);
  });

  it("records viewed products into storage", () => {
    const storage = createStorage(JSON.stringify([makeProduct()]));

    const next = recordRecentlyViewedProduct(
      {
        productId: 2,
        handle: "product-2",
        title: "Product 2",
        thumbnail: null,
        priceAmount: 7000,
      },
      storage,
    );

    expect(next[0]?.productId).toBe(2);
    expect(getRecentlyViewedProducts(storage)[0]?.productId).toBe(2);
  });
});
