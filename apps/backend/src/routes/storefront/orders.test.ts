import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { storefrontOrdersRoute } from "./orders";

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
  const returningQueue: unknown[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    valuesCalls,
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
  };

  return db;
}

describe("storefront orders route", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
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
    items: [
      {
        productId: 1,
        variantId: 10,
        quantity: 2,
      },
    ],
  };

  it("creates an order without requiring payment.method and normalizes the stored phone", async () => {
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
    expect(body.order.orderNumber).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(body.order.paymentStatus).toBe("pending");

    expect(db.valuesCalls[0]).toMatchObject({
      paymentMethod: "manual",
      customerPhone: "0123456789",
    });
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

  it("resolves a valid cart line with shopper-safe display data", async () => {
    db.getQueue.push(
      { id: 1, title: "Champion Cup", handle: "champion-cup", status: "published" },
      { id: 10, productId: 1, title: "Gold", sku: "SKU-1", priceAmount: 5000 },
      { enabled: true },
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
            thumbnail: "/api/assets/products/asset-1/content",
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
        }),
        variantSnapshotJson: JSON.stringify({
          id: 10,
          title: "Gold",
          sku: "SKU-1",
          priceAmount: 5000,
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
    expect(JSON.stringify(body)).not.toContain("design");
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
