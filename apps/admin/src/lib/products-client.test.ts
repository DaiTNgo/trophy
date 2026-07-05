import { describe, expect, it } from "vitest";
import { mapApiProductToCatalogProduct } from "./products-client";

const apiProduct = {
  id: 10,
  title: "Tournament Cup",
  handle: "tournament-cup",
  status: "draft",
  subtitle: null,
  description: null,
  categories: [],
  collection: null,
  attributes: [],
  media: [],
  options: [],
  variants: [],
  customization: null,
  updatedAt: "2026-07-04T00:00:00.000Z",
};

describe("mapApiProductToCatalogProduct", () => {
  it("maps the lowercase publish status returned by the admin product API", () => {
    expect(
      mapApiProductToCatalogProduct({
        ...apiProduct,
        status: "published",
      }).status,
    ).toBe("Published");
  });
});
