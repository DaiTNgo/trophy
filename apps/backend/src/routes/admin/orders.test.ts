import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../lib/misa", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/misa")>()),
  checkMisaSaleOrderById: vi.fn(),
  deleteMisaSaleOrders: vi.fn(),
  isMisaConfigured: vi.fn(() => true),
  syncMisaOrder: vi.fn(),
}));

import { getDb } from "../../db/client";
import { checkMisaSaleOrderById, deleteMisaSaleOrders, MisaRequestError, syncMisaOrder } from "../../lib/misa";
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
    delete: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations })),
    insert: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations })),
    batch: vi.fn(async () => []),
  };

  return db;
}

function queueAdminSession(getQueue: unknown[], role = "super-admin") {
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
      role,
      banned: false,
    },
  });
}

describe("admin orders routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(deleteMisaSaleOrders).mockReset();
    vi.mocked(checkMisaSaleOrderById).mockReset();
    vi.mocked(syncMisaOrder).mockReset();
  });

  it("keeps a created SaleOrder synced when MISA returns 200 without lookup data", async () => {
    const linkedOrder = {
      id: 23,
      orderNumber: "23",
      misaSyncStatus: "synced",
      misaSaleOrderId: "9663",
      misaSaleOrderNo: "23",
      misaLastError: null,
      misaAttemptCount: 1,
      misaSyncedAt: new Date("2026-08-09T12:50:00.000Z"),
    };
    queueAdminSession(db.getQueue);
    db.getQueue.push(linkedOrder, { ...linkedOrder, misaSyncStatus: "synced", misaLastError: null });
    vi.mocked(checkMisaSaleOrderById).mockResolvedValue({ found: false, responseHadData: false });

    const res = await adminRoute.request("/orders/23/misa/check", {
      method: "POST",
      headers: { Authorization: "Bearer token-1" },
    }, {} as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ misa: { syncStatus: "synced", saleOrderId: "9663", lastError: null } });
    expect(db.mutations).toContainEqual({ misaSyncStatus: "synced", misaLastError: null });
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
      notes: "Please call before delivery.",
      vatDetailsJson: JSON.stringify({
        name: "Trophy Co.",
        taxId: "0312345678",
        email: "accounting@trophy.test",
        address: "1 Nguyen Hue, Ho Chi Minh City",
      }),
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
      misaSyncStatus: "failed",
      misaSaleOrderId: null,
      misaLastError: "MISA rejected the order items",
      misaAttemptCount: 1,
      misaSyncedAt: null,
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
    expect(body.order.notes).toBe("Please call before delivery.");
    expect(body.order.vat).toEqual({
      name: "Trophy Co.",
      taxId: "0312345678",
      email: "accounting@trophy.test",
      address: "1 Nguyen Hue, Ho Chi Minh City",
    });
    expect(body.order.misa).toEqual({
      syncStatus: "failed",
      saleOrderId: null,
      lastError: "MISA rejected the order items",
      attemptCount: 1,
      syncedAt: null,
    });
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
    expect(db.select).toHaveBeenCalledTimes(4);
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

  it("does not read live catalog data when an order snapshot is malformed", async () => {
    queueAdminSession(db.getQueue);
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-malformed",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      paymentMethod: "manual",
      customerName: "Admin test",
      customerPhone: "0123456789",
      customerEmail: "admin@example.com",
      notes: null,
      vatDetailsJson: null,
      primaryAddressJson: JSON.stringify({ line1: "1 Main St", city: "HCM", country: "VN" }),
      shippingAddressJson: null,
      shipToDifferentAddress: false,
      subtotalAmount: 5000,
      totalAmount: 5000,
      currencyCode: "VND",
      itemCount: 1,
      misaSyncStatus: "pending",
      misaSaleOrderId: null,
      misaLastError: null,
      misaAttemptCount: 0,
      misaSyncedAt: null,
      createdAt: new Date("2026-08-07T00:00:00.000Z"),
      updatedAt: new Date("2026-08-07T00:00:00.000Z"),
    });
    db.selectQueue.push([], [{
      id: 1,
      orderId: 5,
      quantity: 1,
      unitPriceAmount: 5000,
      lineSubtotalAmount: 5000,
      productionStatus: "not_required",
      productSnapshotJson: "{invalid",
      variantSnapshotJson: "{invalid",
      backgroundSnapshotJson: null,
      customizationSnapshotJson: null,
    }]);

    const response = await adminRoute.request("/orders/ORD-malformed", {
      headers: { Authorization: "Bearer token-1" },
    }, {} as never);

    expect(response.status).toBe(200);
    const body = await response.json() as any;
    expect(body.order.items[0]).toMatchObject({ product: null, variant: null, background: null });
    expect(db.select).toHaveBeenCalledTimes(4);
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
        status: "pending",
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
          paymentStatus: "paid",
          fulfillmentStatus: "fulfilled",
        }),
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db.mutations[0]).toMatchObject({
      paymentStatus: "paid",
      fulfillmentStatus: "fulfilled",
    });
    expect(db.mutations[0].updatedAt).toBeInstanceOf(Date);
    const body = (await res.json()) as any;
    expect(body.order.status).toBe("pending");
    expect(body.order.paymentStatus).toBe("paid");
    expect(body.order.fulfillmentStatus).toBe("fulfilled");
    expect(body.order.items[0].productionStatus).toBe("not_required");
  });

  it("rejects cancellation status updates", async () => {
    queueAdminSession(db.getQueue);

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

    expect(res.status).toBe(400);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("retries MISA synchronization for a super-admin and persists the reconciled link", async () => {
    const order = {
      id: 5, orderNumber: "123", status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled",
      paymentMethod: "bank_transfer", customerName: "John Doe", customerPhone: "0123456789", customerEmail: null,
      notes: null, vatDetailsJson: null, primaryAddressJson: JSON.stringify({ line1: "123 Main", city: "HCM", country: "VN" }), shippingAddressJson: null,
      subtotalAmount: 10000, totalAmount: 10000, currencyCode: "VND", itemCount: 1,
      misaSyncStatus: "failed", misaSaleOrderId: null, misaSaleOrderNo: null, misaLastError: "Timeout", misaAttemptCount: 1, misaSyncedAt: null,
      createdAt: new Date("2026-08-09T00:00:00.000Z"), updatedAt: new Date("2026-08-09T00:00:00.000Z"),
    };
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push(order, { ...order, misaSyncStatus: "synced", misaSaleOrderId: "1234", misaSaleOrderNo: "123", misaLastError: null, misaAttemptCount: 2, misaSyncedAt: new Date("2026-08-09T01:00:00.000Z") });
    db.selectQueue.push([]);
    vi.mocked(syncMisaOrder).mockResolvedValue({ saleOrderId: "1234", saleOrderNumber: "123" });

    const res = await adminRoute.request("/orders/123/misa/refresh", { method: "POST", headers: { Authorization: "Bearer token-1" } }, {} as never);

    expect(res.status).toBe(200);
    expect(vi.mocked(syncMisaOrder)).toHaveBeenCalledWith(expect.anything(), 5);
    expect(db.mutations).toContainEqual(expect.objectContaining({ misaSyncStatus: "synced", misaSaleOrderNo: "123", misaSaleOrderId: "1234", misaAttemptCount: 2 }));
  });

  it("disconnects only the local MISA SaleOrder link", async () => {
    const order = {
      id: 5, orderNumber: "123", status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled",
      paymentMethod: "bank_transfer", customerName: "John Doe", customerPhone: "0123456789", customerEmail: null,
      notes: null, vatDetailsJson: null, primaryAddressJson: JSON.stringify({ line1: "123 Main", city: "HCM", country: "VN" }), shippingAddressJson: null,
      subtotalAmount: 10000, totalAmount: 10000, currencyCode: "VND", itemCount: 1,
      misaSyncStatus: "synced", misaSaleOrderId: "1234", misaSaleOrderNo: "123", misaLastError: null, misaAttemptCount: 1, misaSyncedAt: new Date("2026-08-09T00:00:00.000Z"),
      createdAt: new Date("2026-08-09T00:00:00.000Z"), updatedAt: new Date("2026-08-09T00:00:00.000Z"),
    };
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push(order, { ...order, misaSyncStatus: "disconnected", misaSaleOrderId: null, misaSaleOrderNo: null });
    db.selectQueue.push([]);

    const res = await adminRoute.request("/orders/123/misa/disconnect", { method: "POST", headers: { Authorization: "Bearer token-1" } }, {} as never);

    expect(res.status).toBe(200);
    expect(db.mutations).toContainEqual(expect.objectContaining({ misaSyncStatus: "disconnected", misaSaleOrderId: null, misaSaleOrderNo: null }));
  });

  it("allows a super-admin to purge an unsynced abandoned order locally", async () => {
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-5",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      misaSaleOrderId: null,
    });
    db.selectQueue.push([]);

    const res = await adminRoute.request("/orders/ORD-5", {
      method: "DELETE",
      headers: { Authorization: "Bearer token-1" },
    }, {} as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ deleted: true });
    expect(vi.mocked(deleteMisaSaleOrders)).not.toHaveBeenCalled();
    expect(db.batch).toHaveBeenCalledTimes(1);
  });

  it("requires a super-admin to purge an order", async () => {
    queueAdminSession(db.getQueue, "admin");
    queueAdminSession(db.getQueue, "admin");

    const res = await adminRoute.request("/orders/ORD-5", {
      method: "DELETE",
      headers: { Authorization: "Bearer token-1" },
    }, {} as never);

    expect(res.status).toBe(403);
    expect(db.batch).not.toHaveBeenCalled();
  });

  it("deletes the MISA SaleOrder before purging a synced abandoned order", async () => {
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push({
      id: 5,
      orderNumber: "ORD-5",
      status: "pending",
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      misaSaleOrderId: "123",
    });
    db.selectQueue.push([]);

    const res = await adminRoute.request("/orders/ORD-5", {
      method: "DELETE",
      headers: { Authorization: "Bearer token-1" },
    }, {} as never);

    expect(res.status).toBe(200);
    expect(vi.mocked(deleteMisaSaleOrders)).toHaveBeenCalledWith(expect.anything(), [123]);
    expect(db.batch).toHaveBeenCalledTimes(1);
  });

  it("treats an absent MISA SaleOrder as an idempotent purge", async () => {
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push({ id: 5, orderNumber: "ORD-5", status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled", misaSaleOrderId: "123" });
    db.selectQueue.push([]);
    vi.mocked(deleteMisaSaleOrders).mockRejectedValue(new MisaRequestError("not found", 404));

    const res = await adminRoute.request("/orders/ORD-5", { method: "DELETE", headers: { Authorization: "Bearer token-1" } }, {} as never);

    expect(res.status).toBe(200);
    expect(db.batch).toHaveBeenCalledTimes(1);
  });

  it("preserves the local order when MISA deletion fails", async () => {
    queueAdminSession(db.getQueue);
    queueAdminSession(db.getQueue);
    db.getQueue.push({ id: 5, orderNumber: "ORD-5", status: "pending", paymentStatus: "pending", fulfillmentStatus: "unfulfilled", misaSaleOrderId: "123" });
    vi.mocked(deleteMisaSaleOrders).mockRejectedValue(new MisaRequestError("MISA unavailable", 503));

    const res = await adminRoute.request("/orders/ORD-5", { method: "DELETE", headers: { Authorization: "Bearer token-1" } }, {} as never);

    expect(res.status).toBe(502);
    expect(db.batch).not.toHaveBeenCalled();
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
