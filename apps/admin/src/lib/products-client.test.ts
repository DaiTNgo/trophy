import { beforeEach, describe, expect, it, vi } from "vitest";

const backendFetchMock = vi.fn();

vi.mock("./fetch", () => ({
  BACKEND_URL: "http://localhost:8787",
  backendFetch: (...args: unknown[]) => backendFetchMock(...args),
}));

import {
  activateCustomization,
  atomicCreateVariant,
  createFullProduct,
  createProductOption,
  mapApiProductToCatalogProduct,
  repairCustomization,
  deactivateCustomization,
  reactivateCustomization,
  permanentlyDeleteCustomization,
  deleteProductVariant,
  setProductListingMedia,
} from "./products-client";

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

  it("submits both Listing Media roles atomically", async () => {
    backendFetchMock.mockResolvedValue({ ok: true, json: async () => ({ item: apiProduct }) });

    await setProductListingMedia("10", {
      defaultAssetId: "11111111-1111-4111-8111-111111111111",
      hoverAssetId: "22222222-2222-4222-8222-222222222222",
    });

    expect(backendFetchMock).toHaveBeenCalledWith(
      "/api/admin/products/10/listing-media",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          defaultAssetId: "11111111-1111-4111-8111-111111111111",
          hoverAssetId: "22222222-2222-4222-8222-222222222222",
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

  it("keeps customization setup files local until the activation command is submitted", async () => {
    backendFetchMock.mockResolvedValue({ ok: true, json: async () => ({ item: apiProduct }) });
    const first = new File(["image"], "first.png", { type: "image/png" });
    const second = new File(["image"], "second.png", { type: "image/png" });

    await activateCustomization("10", "2026-08-09T00:00:00.000Z", {
      layers: [], formFields: [],
      backgrounds: [{ variantId: "1", file: first, widthPx: 1200, heightPx: 900 }, { variantId: "2", file: second, widthPx: 1200, heightPx: 900 }],
    });

    const [path, options] = backendFetchMock.mock.calls[0];
    expect(path).toBe("/api/admin/products/10/customization/activate");
    const form = (options as RequestInit).body as FormData;
    expect(JSON.parse(form.get("payload") as string)).toEqual({ layers: [], formFields: [], backgrounds: { 1: { widthPx: 1200, heightPx: 900 }, 2: { widthPx: 1200, heightPx: 900 } } });
    expect(form.get("1")).toBe(first);
    expect(form.get("2")).toBe(second);
    expect((options as RequestInit).headers).toEqual({ "If-Match": "2026-08-09T00:00:00.000Z" });
  });

  it("submits only repair backgrounds and atomic variant media references", async () => {
    backendFetchMock.mockResolvedValue({ ok: true, json: async () => ({ item: apiProduct }) });
    const repair = new File(["image"], "repair.png", { type: "image/png" });
    await repairCustomization("10", "2026-08-09T00:00:00.000Z", {
      layers: [],
      formFields: [],
      backgrounds: [{ variantId: "7", file: repair, widthPx: 1200, heightPx: 900 }],
    });
    const repairForm = (backendFetchMock.mock.calls[0][1] as RequestInit).body as FormData;
    expect(repairForm.get("7")).toBe(repair);
    expect(JSON.parse(repairForm.get("payload") as string)).toEqual({ layers: [], formFields: [], backgrounds: { 7: { widthPx: 1200, heightPx: 900 } } });

    const gallery = new File(["image"], "gallery.png", { type: "image/png" });
    const background = new File(["image"], "background.png", { type: "image/png" });
    await atomicCreateVariant("10", "2026-08-09T00:00:00.000Z", {
      title: { vi: "Blue", en: "Blue" }, sku: null, priceAmount: 1000,
      inventoryQuantity: 0, allowBackorder: false, optionValueIds: [], attributes: [],
      galleryMedia: [{ mediaId: "gallery_1", file: gallery }],
      customizationMedia: { mediaId: "background_1", file: background, widthPx: 1200, heightPx: 900 },
    });
    const atomicForm = (backendFetchMock.mock.calls[1][1] as RequestInit).body as FormData;
    expect(atomicForm.get("gallery_1")).toBe(gallery);
    expect(atomicForm.get("background_1")).toBe(background);
    expect(JSON.parse(atomicForm.get("payload") as string)).toMatchObject({
      galleryMedia: [{ mediaId: "gallery_1" }],
      customizationMedia: { mediaId: "background_1", widthPx: 1200, heightPx: 900 },
    });
    expect((backendFetchMock.mock.calls[0][1] as RequestInit).headers).toEqual({ "If-Match": "2026-08-09T00:00:00.000Z" });
    expect((backendFetchMock.mock.calls[1][1] as RequestInit).headers).toEqual({ "If-Match": "2026-08-09T00:00:00.000Z" });
  });

  it("sends the Product revision for direct lifecycle and variant deletion commands", async () => {
    backendFetchMock.mockResolvedValue({ ok: true, json: async () => ({ item: apiProduct }) });
    const revision = "2026-08-09T00:00:00.000Z";

    await deactivateCustomization("10", revision);
    await reactivateCustomization("10", revision);
    await permanentlyDeleteCustomization("10", revision);
    await deleteProductVariant("10", 7, revision);

    for (const [, options] of backendFetchMock.mock.calls) {
      expect((options as RequestInit).headers).toEqual({ "If-Match": revision });
    }
  });
});
