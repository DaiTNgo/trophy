import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";

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
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
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
});
