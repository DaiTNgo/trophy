import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetchMock = vi.fn();

vi.mock("./fetch", () => ({
  BACKEND_URL: "http://localhost:8787",
  backendFetch: (...args: unknown[]) => backendFetchMock(...args),
}));

import { createFullProduct, createProductOption, mapApiProductToCatalogProduct } from "./products-client";

const apiProduct = {
  id: 10,
  title: "Tournament Cup",
  handle: "tournament-cup",
  status: "draft" as const,
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

  it("preserves each variant's MISA synchronization state", () => {
    const product = mapApiProductToCatalogProduct({
      ...apiProduct,
      variants: [{
        id: 7,
        title: "Gold",
        sku: null,
        misaProductId: null,
        misaSyncStatus: "failed",
        misaLastError: "MISA integration is not configured",
        priceAmount: 1000,
        inventoryQuantity: 2,
        allowBackorder: false,
        media: [],
        customizationMedia: null,
        optionValueIds: [],
      }],
    });

    expect(product.variants[0]).toMatchObject({
      misaSyncStatus: "failed",
      misaLastError: "MISA integration is not configured",
    });
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

  it("maps declared media IDs and files into a multipart full-create request", async () => {
    backendFetchMock.mockResolvedValue({ ok: true, json: async () => ({ item: apiProduct }) });
    const file = new File(["image"], "cup.png", { type: "image/png" });
    await createFullProduct({
      mode: "draft", details: { title: { vi: "Cup", en: "" }, handle: null }, organization: {}, attributes: [], options: [],
      variants: [{ title: "Default", sku: null, priceAmount: null, inventoryQuantity: 0, allowBackorder: false, optionValues: [], media: [{ mediaId: "11111111-1111-4111-8111-111111111111", file }], customizationMedia: null }],
    });
    const options = backendFetchMock.mock.calls[0][1];
    expect(options.body).toBeInstanceOf(FormData);
    const form = options.body as FormData;
    expect(form.get("11111111-1111-4111-8111-111111111111")).toBe(file);
    expect(JSON.parse(form.get("payload") as string).variants[0].media).toEqual([{ mediaId: "11111111-1111-4111-8111-111111111111" }]);
  });
});
