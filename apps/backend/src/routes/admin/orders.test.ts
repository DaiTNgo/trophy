import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";

function createQueryChain({
  getQueue,
  selectQueue,
  mutations,
}: {
  getQueue: unknown[];
  selectQueue: unknown[];
  mutations: unknown[];
}) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    set: vi.fn((value: unknown) => {
      mutations.push(value);
      return chain;
    }),
    get: vi.fn(async () => getQueue.shift() ?? null),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const mutations: unknown[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    mutations,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations })),
    update: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations })),
  };

  return db;
}

function queueAdminSession(getQueue: unknown[]) {
  getQueue.push({
    session: {
      id: "session-1",
      token: "token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    },
    user: {
      id: "user-1",
      name: "admin",
      username: "admin",
      email: "admin@trophy.local",
      role: "super-admin",
      banned: false,
    },
  });
}

describe("admin orders routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  it("rejects unauthenticated order list access", async () => {
    const res = await adminRoute.request("/orders", undefined, {} as never);
    expect(res.status).toBe(401);
  });

  it("lists backend orders for an authenticated admin", async () => {
    queueAdminSession(db.getQueue);
    db.selectQueue.push([], [
      {
        orderNumber: "ORD-1",
        status: "pending",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        customerName: "John Doe",
        customerEmail: "john@example.com",
        totalAmount: 10000,
        currencyCode: "VND",
        itemCount: 2,
        createdAt: new Date("2026-07-05T00:00:00.000Z"),
      },
    ]);

    const res = await adminRoute.request(
      "/orders",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      orders: [
        {
          orderNumber: "ORD-1",
          status: "pending",
          paymentStatus: "pending",
          fulfillmentStatus: "unfulfilled",
          customerName: "John Doe",
          customerEmail: "john@example.com",
          totalAmount: 10000,
          currencyCode: "VND",
          itemCount: 2,
          createdAt: "2026-07-05T00:00:00.000Z",
        },
      ],
    });
  });

  it("returns structured admin order detail", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-1",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "manual",
      customerName: "John Doe",
      customerPhone: "0123456789",
      customerEmail: "john@example.com",
      primaryAddressJson: JSON.stringify({ line1: "123 Main St", city: "HCM", country: "VN" }),
      shippingAddressJson: JSON.stringify({
        recipientName: "Jane Doe",
        recipientPhone: "0987654321",
        address: { line1: "45 Other St", city: "Hanoi", country: "VN" },
      }),
      shipToDifferentAddress: true,
      subtotalAmount: 10000,
      totalAmount: 10000,
      currencyCode: "VND",
      itemCount: 2,
      createdAt: new Date("2026-07-05T00:00:00.000Z"),
      updatedAt: new Date("2026-07-05T01:00:00.000Z"),
    });
    db.selectQueue.push([], [
      {
        id: 1,
        orderId: 5,
        quantity: 2,
        unitPriceAmount: 5000,
        lineSubtotalAmount: 10000,
        productionStatus: "pending_review",
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
        backgroundSnapshotJson: JSON.stringify({
          assetId: "asset-1",
          previewUrl: "/api/assets/products/asset-1/content",
          widthPx: null,
          heightPx: null,
        }),
        customizationSnapshotJson: JSON.stringify({
          values: { text_1: { text: "Alice" } },
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

    const res = await adminRoute.request(
      "/orders/ORD-1",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.order.customer.phone).toBe("0123456789");
    expect(body.order.items[0].customization).toEqual({
      values: [{ fieldId: "text_1", label: "Name", valueSummary: "Alice" }],
      hasRenderedDesign: true,
      preview: {
        values: { text_1: { text: "Alice" } },
        templateSnapshot: {
          layers: [],
          formFields: [{ id: "text_1", layerId: "layer-1", label: "Name", required: true, order: 0 }],
          canvasWidthPx: 100,
          canvasHeightPx: 100,
        },
      },
    });
    expect(JSON.stringify(body)).not.toContain("productSnapshotJson");
  });

  it("returns 404 when an admin order detail is missing", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push(null);

    const res = await adminRoute.request(
      "/orders/ORD-missing",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      {} as never,
    );

    expect(res.status).toBe(404);
  });

  it("rejects empty admin order status updates", async () => {
    queueAdminSession(db.getQueue);

    const res = await adminRoute.request(
      "/orders/ORD-1/status",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
      {} as never,
    );

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("updates admin order status fields and returns refreshed detail", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push(
      { id: 5 },
      {
        id: 5,
        orderNumber: "ORD-1",
        status: "cancelled",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
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
        updatedAt: new Date("2026-07-05T02:00:00.000Z"),
      },
    );
    db.selectQueue.push([], [], [
      {
        id: 1,
        orderId: 5,
        quantity: 1,
        unitPriceAmount: 10000,
        lineSubtotalAmount: 10000,
        productionStatus: "not_required",
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
        backgroundSnapshotJson: null,
        customizationSnapshotJson: null,
      },
    ]);

    const res = await adminRoute.request(
      "/orders/ORD-1/status",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
          paymentStatus: "paid",
          fulfillmentStatus: "fulfilled",
        }),
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.mutations[0]).toMatchObject({
      status: "cancelled",
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
    });
    expect(db.mutations[0].updatedAt).toBeInstanceOf(Date);
    const body = (await res.json()) as any;
    expect(body.order.status).toBe("cancelled");
    expect(body.order.paymentStatus).toBe("paid");
    expect(body.order.fulfillmentStatus).toBe("fulfilled");
    expect(body.order.items[0].productionStatus).toBe("not_required");
  });

  it("allows cancelling pending payment when cancelling an admin order", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push(
      { id: 5 },
      {
        id: 5,
        orderNumber: "ORD-1",
        status: "cancelled",
        paymentStatus: "cancelled",
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
        updatedAt: new Date("2026-07-05T02:00:00.000Z"),
      },
    );
    db.selectQueue.push([], [], []);

    const res = await adminRoute.request(
      "/orders/ORD-1/status",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "cancelled",
          paymentStatus: "cancelled",
        }),
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(db.mutations[0]).toMatchObject({
      status: "cancelled",
      paymentStatus: "cancelled",
    });
    const body = (await res.json()) as any;
    expect(body.order.status).toBe("cancelled");
    expect(body.order.paymentStatus).toBe("cancelled");
  });

  it("marks an admin order item ready for production", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push(
      {
        id: 5,
        orderNumber: "ORD-1",
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
        updatedAt: new Date("2026-07-05T01:00:00.000Z"),
      },
      {
        id: 10,
        orderId: 5,
        productionStatus: "pending_review",
      },
      {
        id: 5,
        orderNumber: "ORD-1",
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
        updatedAt: new Date("2026-07-05T02:00:00.000Z"),
      },
    );
    db.selectQueue.push([], [], [
      {
        id: 10,
        orderId: 5,
        quantity: 1,
        unitPriceAmount: 10000,
        lineSubtotalAmount: 10000,
        productionStatus: "ready",
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
        backgroundSnapshotJson: null,
        customizationSnapshotJson: null,
      },
    ]);

    const res = await adminRoute.request(
      "/orders/ORD-1/items/10/production",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productionStatus: "ready" }),
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(db.mutations[0]).toMatchObject({ productionStatus: "ready" });
    const body = (await res.json()) as any;
    expect(body.order.items[0].productionStatus).toBe("ready");
  });

  it("returns 404 when updating a missing admin order", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push(null);

    const res = await adminRoute.request(
      "/orders/ORD-missing/status",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-1",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentStatus: "paid" }),
      },
      {} as never,
    );

    expect(res.status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });
});
