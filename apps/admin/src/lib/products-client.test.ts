import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetchMock = vi.fn();

vi.mock("./fetch", () => ({
  backendFetch: (...args: unknown[]) => backendFetchMock(...args),
}));

import { createProductOption, mapApiProductToCatalogProduct } from "./products-client";

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
  beforeEach(() => {
    backendFetchMock.mockReset();
  });

  it("maps the lowercase publish status returned by the admin product API", () => {
    expect(
      mapApiProductToCatalogProduct({
        ...apiProduct,
        status: "published",
      }).status,
    ).toBe("Published");
  });

  it("sends option values with the nested value object expected by the admin products route", async () => {
    backendFetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ item: apiProduct }),
    });

    await createProductOption("10", {
      title: { vi: "Mau sac", en: "" },
      values: [
        { value: { vi: "Do", en: "" } },
        { value: { vi: "Xanh", en: "" } },
      ],
    });

    expect(backendFetchMock).toHaveBeenCalledWith(
      "/api/admin/products/10/options",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: { vi: "Mau sac", en: "" },
          values: [
            { value: { vi: "Do", en: "" } },
            { value: { vi: "Xanh", en: "" } },
          ],
        }),
      }),
    );
  });
});
