import { DEFAULT_TEMPLATE } from "@trophy/customization";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../lib/misa", () => ({
  isMisaConfigured: vi.fn(() => false),
  syncMisaOrder: vi.fn(),
  validateMisaCheckoutCustomer: vi.fn(),
  MisaRequestError: class MisaRequestError extends Error {
    resource = "/Customers";
  },
}));

import { getDb } from "../../db/client";
import { isMisaConfigured, MisaRequestError, validateMisaCheckoutCustomer } from "../../lib/misa";
import { createCheckoutAccessToken, storefrontOrdersRoute } from "./orders";

function createQueryChain({
  getQueue,
  selectQueue,
}: {
  getQueue: unknown[];
  selectQueue: unknown[];
}) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    values: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const valuesCalls: unknown[] = [];
  const updateValuesCalls: unknown[] = [];
  const returningQueue: unknown[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    valuesCalls,
    updateValuesCalls,
    returningQueue,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
    insert: vi.fn(() => {
      const chain = createQueryChain({ getQueue, selectQueue });
      chain.values = vi.fn((value: unknown) => {
        valuesCalls.push(value);
        return chain;
      });
      chain.returning = vi.fn(async () => returningQueue.shift() ?? []);
      return chain;
    }),
    update: vi.fn(() => {
      const chain = createQueryChain({ getQueue, selectQueue });
      chain.set = vi.fn((value: unknown) => {
        updateValuesCalls.push(value);
        return chain;
      });
      return chain;
    }),
  };

  return db;
}

describe("storefront orders route", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(isMisaConfigured).mockReturnValue(false);
    vi.mocked(validateMisaCheckoutCustomer).mockReset();
  });

  const validPayload = {
    customer: {
      name: "John Doe",
      phone: "(012) 345-6789",
      email: "john@example.com",
    },
    shipping: {
      primaryAddress: {
        line1: "123 Main St",
        city: "Ho Chi Minh City",
        country: "VN",
      },
      shipToDifferentAddress: false,
    },
    payment: { method: "bank_transfer" },
    notes: "Please call before delivery.",
    vat: {
      type: "Company",
      name: "Trophy Co.",
      taxId: "0314042508",
      email: "accounting@trophy.test",
      address: "1 Nguyen Hue, Ho Chi Minh City",
    },
    items: [
      {
        productId: 1,
        variantId: 10,
        quantity: 2,
      },
    ],
  };

  it("creates a bank transfer order, stores the selected payment method, and returns signed checkout access", async () => {
    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { assetId: "asset-1", position: 0 },
      null,
    );
    db.returningQueue.push([{ id: 123, createdAt: new Date("2026-07-05T00:00:00.000Z") }]);

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as any;
    expect(body.order.orderNumber).toBe("123");
    expect(body.order.paymentReference).toBe("PT-123");
    expect(body.order.paymentStatus).toBe("pending");

    expect(db.valuesCalls[0]).toMatchObject({
      paymentMethod: "bank_transfer",
      customerPhone: "0123456789",
      notes: "Please call before delivery.",
      vatDetailsJson: JSON.stringify(validPayload.vat),
    });
    expect(db.updateValuesCalls[0]).toEqual({ orderNumber: "123" });
    expect(body.order.checkoutAccessToken).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(body.order.checkoutAccessExpiresAt).toBeTruthy();
  });

  it("returns payment instructions only with a valid signed checkout token", async () => {
    const orderNumber = "ORD-ABC-1234";
    const bindings = { BETTER_AUTH_SECRET: "test-secret" } as never;
    const { token } = await createCheckoutAccessToken(bindings, orderNumber);
    db.getQueue.push({
      id: 123,
      orderNumber,
      totalAmount: 10000,
      currencyCode: "VND",
      paymentMethod: "bank_transfer",
      paymentStatus: "pending",
      createdAt: new Date("2026-08-09T00:00:00.000Z"),
    });

    const res = await storefrontOrdersRoute.request(
      `/payment-instructions?orderNumber=${orderNumber}&accessToken=${encodeURIComponent(token)}`,
      undefined,
      bindings,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      order: {
        orderNumber,
        paymentReference: "PT-123",
        totalAmount: 10000,
        currencyCode: "VND",
        paymentMethod: "bank_transfer",
        paymentStatus: "pending",
        createdAt: "2026-08-09T00:00:00.000Z",
      },
    });
  });

  it("rejects payment instructions with an invalid checkout token", async () => {
    const res = await storefrontOrdersRoute.request(
      "/payment-instructions?orderNumber=ORD-ABC-1234&accessToken=invalid.token",
    );

    expect(res.status).toBe(404);
  });

  it("returns 400 for structural validation errors", async () => {
    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, items: [] }),
    });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Validation failed",
    });
  });

  it("returns MISA VAT validation errors before creating a checkout order", async () => {
    vi.mocked(isMisaConfigured).mockReturnValue(true);
    vi.mocked(validateMisaCheckoutCustomer).mockRejectedValue(
      new MisaRequestError("tax_code: Giá trị của trường không hợp lệ", 200, { resource: "/Customers" }),
    );
    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { assetId: "asset-1", position: 0 },
      null,
    );
    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        vat: { ...validPayload.vat, taxId: "0312345678" },
      }),
    });

    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toEqual({
      error: "tax_code: Giá trị của trường không hợp lệ",
      field: "vat.taxId",
    });
    expect(db.valuesCalls).toEqual([]);
  });

  it("resolves a valid cart line with shopper-safe display data", async () => {
    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { enabled: true },
      null,
      { assetId: "asset-1", position: 0 },
    );

    const res = await storefrontOrdersRoute.request("/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ productId: 1, variantId: 10 }] }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [
        {
          productId: 1,
          variantId: 10,
          valid: true,
          reason: null,
          product: {
            title: "Champion Cup",
            handle: "champion-cup",
            variantTitle: "Gold",
            sku: "SKU-1",
            thumbnail: null,
            priceAmount: 5000,
            customizable: true,
            requiresCustomization: true,
            isContactPrice: false,
          },
        },
      ],
    });
  });

  it("marks stale and contact-price cart lines with explicit reasons", async () => {
    db.getQueue.push(
      null,
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 2, title: "Other", sku: "SKU-OTHER", priceAmount: 5000 },
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: null },
      null,
      null,
      { assetId: "asset-1", position: 0 },
    );

    const res = await storefrontOrdersRoute.request("/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { productId: 1, variantId: 10 },
          { productId: 1, variantId: 10 },
          { productId: 1, variantId: 10 },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.items[0]).toMatchObject({ valid: false, reason: "product_unavailable" });
    expect(body.items[1]).toMatchObject({ valid: false, reason: "variant_mismatch" });
    expect(body.items[2]).toMatchObject({ valid: false, reason: "contact_price" });
  });

  it("uses the first product media as the cart thumbnail before variant media", async () => {
    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { enabled: false },
      { id: 50, productId: 1, url: "/api/assets/products/product-asset/content", position: 0 },
      { assetId: "variant-asset", position: 0 },
    );

    const res = await storefrontOrdersRoute.request("/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ productId: 1, variantId: 10 }] }),
    });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({
      items: [{ product: { thumbnail: null } }],
    });
  });

  it("looks up an order by order number and matching phone", async () => {
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-ABC-1234",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "manual",
      customerName: "John Doe",
      customerPhone: "0123456789",
      customerEmail: "john@example.com",
      primaryAddressJson: JSON.stringify({ line1: "123 Main St", city: "HCM", country: "VN" }),
      shippingAddressJson: null,
      shipToDifferentAddress: false,
      subtotalAmount: 10000,
      totalAmount: 10000,
      currencyCode: "VND",
      itemCount: 2,
      createdAt: new Date("2026-07-05T00:00:00.000Z"),
      updatedAt: new Date("2026-07-05T00:00:00.000Z"),
    });
    db.selectQueue.push([
      {
        id: 1,
        orderId: 5,
        quantity: 2,
        unitPriceAmount: 5000,
        lineSubtotalAmount: 10000,
        productSnapshotJson: JSON.stringify({
          id: 1,
          title: "Champion Cup",
          handle: "champion-cup",
          status: "published",
          thumbnail: "http://localhost/api/assets/products/asset-1/content",
        }),
        variantSnapshotJson: JSON.stringify({
          id: 10,
          title: "Gold",
          sku: "SKU-1",
          priceAmount: 5000,
        }),
        backgroundSnapshotJson: JSON.stringify({
          assetId: "asset-1",
          previewUrl: "http://localhost/api/assets/products/asset-1/content",
          widthPx: null,
          heightPx: null,
        }),
        customizationSnapshotJson: JSON.stringify({
          values: {
            text_1: { text: "Alice" },
          },
          design: { layers: [] },
          templateSnapshot: {
            layers: [],
            formFields: [{ id: "text_1", layerId: "layer-1", label: "Name", required: true, order: 0 }],
            canvasWidthPx: 100,
            canvasHeightPx: 100,
          },
        }),
      },
    ]);

    const res = await storefrontOrdersRoute.request("/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: "ORD-ABC-1234", phone: "0123 456 789" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.order.customer.phoneMasked).toBe("******6789");
    expect(body.order.items[0].customizationValues).toEqual([
      { fieldId: "text_1", label: "Name", valueSummary: "Alice" },
    ]);
    expect(body.order.items[0].previewImageUrl).toBe("http://localhost/api/assets/products/asset-1/content");
    expect(body.order.items[0].customizationPreview.values.text_1).toEqual({ text: "Alice" });
    expect(body.order.items[0].customizationPreview.template.formFields[0].id).toBe("text_1");
    expect(JSON.stringify(body)).not.toContain("design");
  });

  it("falls back to the persisted background image for older item snapshots", async () => {
    db.getQueue.push({
      id: 6,
      orderNumber: "ORD-LEGACY-1234",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      customerName: "Legacy Buyer",
      customerPhone: "0123456789",
      customerEmail: null,
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 5000,
      currencyCode: "VND",
      itemCount: 1,
      createdAt: new Date("2026-07-05T00:00:00.000Z"),
    });
    db.selectQueue.push([
      {
        id: 2,
        orderId: 6,
        quantity: 1,
        unitPriceAmount: 5000,
        lineSubtotalAmount: 5000,
        productSnapshotJson: JSON.stringify({
          id: 1,
          title: "Legacy Cup",
          handle: "legacy-cup",
          status: "published",
        }),
        variantSnapshotJson: JSON.stringify({ id: 11, title: "Silver", sku: null, priceAmount: 5000 }),
        backgroundSnapshotJson: JSON.stringify({
          assetId: "legacy-asset",
          previewUrl: "http://localhost/api/assets/products/legacy-asset/content",
          widthPx: null,
          heightPx: null,
        }),
        customizationSnapshotJson: null,
      },
    ]);

    const res = await storefrontOrdersRoute.request("/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: "ORD-LEGACY-1234", phone: "0123456789" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.order.items[0].previewImageUrl).toBe("http://localhost/api/assets/products/legacy-asset/content");
  });

  it("summarizes selected icon values in order lookups", async () => {
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-ICON-1234",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "manual",
      customerName: "John Doe",
      customerPhone: "0123456789",
      customerEmail: "john@example.com",
      primaryAddressJson: JSON.stringify({ line1: "123 Main St", city: "HCM", country: "VN" }),
      shippingAddressJson: null,
      shipToDifferentAddress: false,
      subtotalAmount: 10000,
      totalAmount: 10000,
      currencyCode: "VND",
      itemCount: 1,
      createdAt: new Date("2026-07-05T00:00:00.000Z"),
      updatedAt: new Date("2026-07-05T00:00:00.000Z"),
    });
    db.selectQueue.push([
      {
        id: 1,
        orderId: 5,
        quantity: 1,
        unitPriceAmount: 10000,
        lineSubtotalAmount: 10000,
        productSnapshotJson: JSON.stringify({
          id: 1,
          title: "Champion Cup",
          handle: "champion-cup",
          status: "published",
        }),
        variantSnapshotJson: JSON.stringify({
          id: 10,
          title: "Gold",
          sku: "SKU-1",
          priceAmount: 10000,
        }),
        customizationSnapshotJson: JSON.stringify({
          values: {
            badge_shape: {
              source: "clipart",
              clipartAssetId: "clipart_star",
              clipartAssetName: "Star",
              sourceAssetId: "asset_star",
              previewUrl: "/api/assets/customizations/asset_star/content",
              mimeType: "image/svg+xml",
              sourceWidthPx: 200,
              sourceHeightPx: 200,
              categoryId: "sports",
            },
          },
          design: { layers: [] },
          templateSnapshot: {
            layers: [],
            formFields: [{ id: "badge_shape", layerId: "layer-1", label: "Badge", required: true, order: 0 }],
            canvasWidthPx: 100,
            canvasHeightPx: 100,
          },
        }),
      },
    ]);

    const res = await storefrontOrdersRoute.request("/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: "ORD-ICON-1234", phone: "0123456789" }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.order.items[0].customizationValues).toEqual([
      { fieldId: "badge_shape", label: "Badge", valueSummary: "Star" },
    ]);
  });

  it("stores selected clipart snapshot metadata when creating an order", async () => {
    const iconLayers = DEFAULT_TEMPLATE.layers.map((layer) =>
      layer.id === "badge_shape" && layer.type === "image_shape"
        ? {
            ...layer,
            sourcePolicy: "upload_or_clipart_category" as const,
            presentation: "source_select" as const,
            clipartCategoryMode: "allow_list" as const,
            allowedClipartCategories: [{ id: "sports", name: "Sports" }],
            clipartAssets: [
              {
                id: "clipart_star",
                sourceAssetId: "asset_star",
                name: "Star",
                categoryId: "sports",
                fileName: "star.svg",
                previewUrl: "/api/assets/customizations/asset_star/content",
                mimeType: "image/svg+xml",
                sourceWidthPx: 200,
                sourceHeightPx: 200,
                active: true,
              },
            ],
          }
        : layer,
    );

    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { assetId: "asset-1", position: 0 },
      {
        enabled: true,
        canvasWidthPx: 1200,
        canvasHeightPx: 900,
        layersJson: JSON.stringify(iconLayers),
        formFieldsJson: JSON.stringify(DEFAULT_TEMPLATE.formFields),
      },
      { variantId: 10, assetId: "customization-asset-1" },
    );
    db.returningQueue.push([{ id: 123, createdAt: new Date("2026-07-05T00:00:00.000Z") }]);

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validPayload,
        items: [
          {
            productId: 1,
            variantId: 10,
            quantity: 1,
            customization: {
              values: {
                field_badge_shape: {
                  source: "clipart",
                  clipartAssetId: "clipart_star",
                  clipartAssetName: "Star",
                  sourceAssetId: "asset_star",
                  previewUrl: "/api/assets/customizations/asset_star/content",
                  mimeType: "image/svg+xml",
                  sourceWidthPx: 200,
                  sourceHeightPx: 200,
                  categoryId: "sports",
                },
              },
            },
          },
        ],
      }),
    });

    expect(res.status).toBe(201);

    const orderItemInsert = db.valuesCalls.find(
      (value: any) => value && typeof value === "object" && "customizationSnapshotJson" in value,
    ) as
      | {
          backgroundSnapshotJson: string | null;
          customizationSnapshotJson: string;
        }
      | undefined;
    const backgroundSnapshot = orderItemInsert?.backgroundSnapshotJson
      ? JSON.parse(orderItemInsert.backgroundSnapshotJson)
      : null;
    const snapshot = orderItemInsert ? JSON.parse(orderItemInsert.customizationSnapshotJson) : null;

    expect(backgroundSnapshot?.assetId).toBe("customization-asset-1");

    expect(snapshot?.values?.field_badge_shape).toMatchObject({
      source: "clipart",
      clipartAssetId: "clipart_star",
      clipartAssetName: "Star",
      sourceAssetId: "asset_star",
      mimeType: "image/svg+xml",
      categoryId: "sports",
    });
  });

  it("rejects order lookup with the wrong phone", async () => {
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-ABC-1234",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "manual",
      customerName: "John Doe",
      customerPhone: "0123456789",
      customerEmail: "john@example.com",
      primaryAddressJson: JSON.stringify({ line1: "123 Main St", city: "HCM", country: "VN" }),
      shippingAddressJson: null,
      shipToDifferentAddress: false,
      subtotalAmount: 10000,
      totalAmount: 10000,
      currencyCode: "VND",
      itemCount: 2,
      createdAt: new Date("2026-07-05T00:00:00.000Z"),
      updatedAt: new Date("2026-07-05T00:00:00.000Z"),
    });
    db.selectQueue.push([]);

    const res = await storefrontOrdersRoute.request("/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNumber: "ORD-ABC-1234", phone: "0999999999" }),
    });

    expect(res.status).toBe(404);
  });
});
