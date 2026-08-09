import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono, type Context } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import {
  orderItems,
  orderItemMediaTransferAssets,
  orderItemMediaTransfers,
  orders,
  r2CleanupJobs,
} from "../../db/schema";
import { getAdminSession } from "../../lib/admin-session";
import type { AppEnv } from "../../lib/env";
import {
  deleteMisaSaleOrders,
  checkMisaSaleOrderById,
  isMisaConfigured,
  MisaRequestError,
  syncMisaOrder,
} from "../../lib/misa";
import {
  buildCustomizationValueSummaries,
  parseBackgroundSnapshot,
  parseCustomizationSnapshot,
  parseDifferentShippingAddress,
  parseOrderAddress,
  parseVatDetails,
  parseProductSnapshot,
  parseVariantSnapshot,
} from "../../lib/order-utils";
import { parseJson, parseParams } from "../../lib/validation";
import { r2CleanupJobValues } from "../../lib/r2-cleanup-outbox";

const orderNumberParamsSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
});

const positiveIntParam = v.pipe(
  v.string(),
  v.transform((input) => Number(input)),
  v.number(),
  v.integer(),
  v.minValue(1),
);

const orderItemParamsSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
  itemId: positiveIntParam,
});

const orderStatusUpdateSchema = v.object({
  paymentStatus: v.optional(v.picklist(["pending", "paid", "failed", "refunded"])),
  fulfillmentStatus: v.optional(v.picklist(["unfulfilled", "partially_fulfilled", "fulfilled"])),
});

const orderItemProductionUpdateSchema = v.object({
  productionStatus: v.picklist(["not_required", "pending_review", "ready"]),
});

type OrderStatusUpdateInput = v.InferOutput<typeof orderStatusUpdateSchema>;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

function serializeAdminOrderDetail(
  orderRow: OrderRow,
  itemRows: OrderItemRow[],
) {
  const primaryAddress = parseOrderAddress(orderRow.primaryAddressJson);
  const shippingAddress = parseDifferentShippingAddress(orderRow.shippingAddressJson);
  const vat = parseVatDetails(orderRow.vatDetailsJson);

  return {
    id: orderRow.id,
    orderNumber: orderRow.orderNumber,
    status: orderRow.status,
    paymentStatus: orderRow.paymentStatus,
    fulfillmentStatus: orderRow.fulfillmentStatus,
    paymentMethod: orderRow.paymentMethod,
    customer: {
      name: orderRow.customerName,
      phone: orderRow.customerPhone,
      email: orderRow.customerEmail,
    },
    primaryAddress,
    shippingAddress,
    notes: orderRow.notes,
    vat,
    misa: {
      syncStatus: orderRow.misaSyncStatus,
      contactId: orderRow.misaContactId,
      saleOrderId: orderRow.misaSaleOrderId,
      saleOrderNo: orderRow.misaSaleOrderNo,
      lastError: orderRow.misaLastError,
      attemptCount: orderRow.misaAttemptCount,
      syncedAt: orderRow.misaSyncedAt?.toISOString() ?? null,
    },
    totals: {
      subtotalAmount: orderRow.subtotalAmount,
      totalAmount: orderRow.totalAmount,
      currencyCode: orderRow.currencyCode,
      itemCount: orderRow.itemCount,
    },
    createdAt: orderRow.createdAt.toISOString(),
    updatedAt: orderRow.updatedAt.toISOString(),
    items: itemRows.map((item) => {
      const productSnapshot = parseProductSnapshot(item.productSnapshotJson);
      const variantSnapshot = parseVariantSnapshot(item.variantSnapshotJson);
      const backgroundSnapshot = parseBackgroundSnapshot(item.backgroundSnapshotJson);
      const customizationSnapshot = parseCustomizationSnapshot(item.customizationSnapshotJson);
      return {
        id: item.id,
        quantity: item.quantity,
        unitPriceAmount: item.unitPriceAmount,
        lineSubtotalAmount: item.lineSubtotalAmount,
        productionStatus: item.productionStatus,
        product: productSnapshot,
        variant: variantSnapshot,
        background: backgroundSnapshot,
        customization: customizationSnapshot
          ? {
              values: buildCustomizationValueSummaries(customizationSnapshot),
              hasRenderedDesign: true,
              preview: {
                values: customizationSnapshot.values,
                templateSnapshot: customizationSnapshot.templateSnapshot,
              },
            }
          : null,
      };
    }),
  };
}

function serializeMisaStatus(order: OrderRow) {
  return {
    syncStatus: order.misaSyncStatus,
    contactId: order.misaContactId,
    saleOrderId: order.misaSaleOrderId,
    saleOrderNo: order.misaSaleOrderNo,
    lastError: order.misaLastError,
    attemptCount: order.misaAttemptCount,
    syncedAt: order.misaSyncedAt?.toISOString() ?? null,
  };
}

async function getOrderDetail(db: ReturnType<typeof getDb>, orderNumber: string) {
  const orderRow = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).get();

  if (!orderRow) {
    return null;
  }

  const itemRows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderRow.id))
    .orderBy(orderItems.id);

  return serializeAdminOrderDetail(orderRow, itemRows);
}

function hasStatusUpdate(input: OrderStatusUpdateInput) {
  return Boolean(input.paymentStatus || input.fulfillmentStatus);
}

function isPurgeEligible(order: Pick<OrderRow, "status" | "paymentStatus" | "fulfillmentStatus">) {
  return order.status === "pending" &&
    order.paymentStatus === "pending" &&
    order.fulfillmentStatus === "unfulfilled";
}

async function requireSuperAdmin(c: Context<AppEnv>) {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  return session?.user && (session.user as { role?: string }).role === "super-admin";
}

function parseMisaSaleOrderId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function synchronizeOrderWithMisa(
  db: ReturnType<typeof getDb>,
  order: OrderRow,
  bindings: AppEnv["Bindings"],
) {
  try {
    const synced = await syncMisaOrder(bindings, order.id);
    await db
      .update(orders)
      .set({
        misaSyncStatus: "synced",
        misaContactId: synced.contactId,
        misaSaleOrderId: synced.saleOrderId,
        misaSaleOrderNo: synced.saleOrderNumber,
        misaLastError: null,
        misaAttemptCount: order.misaAttemptCount + 1,
        misaSyncedAt: new Date(),
      })
      .where(eq(orders.id, order.id));
    return { ok: true as const };
  } catch (error) {
    const message = error instanceof Error ? error.message : "MISA order synchronization failed";
    await db
      .update(orders)
      .set({
        misaSyncStatus: "failed",
        misaLastError: message,
        misaAttemptCount: order.misaAttemptCount + 1,
      })
      .where(eq(orders.id, order.id));
    return { ok: false as const, message };
  }
}

export const adminOrdersRoute = new Hono<AppEnv>()
  .get("/", async (c) => {
    const db = getDb(c.env);
    const orderRows = await db
      .select({
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        customerName: orders.customerName,
        customerEmail: orders.customerEmail,
        totalAmount: orders.totalAmount,
        currencyCode: orders.currencyCode,
        itemCount: orders.itemCount,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt));

    return c.json(
      {
        orders: orderRows.map((row) => ({
          orderNumber: row.orderNumber,
          status: row.status,
          paymentStatus: row.paymentStatus,
          fulfillmentStatus: row.fulfillmentStatus,
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          totalAmount: row.totalAmount,
          currencyCode: row.currencyCode,
          itemCount: row.itemCount,
          createdAt: row.createdAt.toISOString(),
        })),
      },
      200,
    );
  })
  .get("/:orderNumber", async (c) => {
    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const db = getDb(c.env);
    const order = await getOrderDetail(db, parsed.output.orderNumber);

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ order }, 200);
  })
  .post("/:orderNumber/misa/connect", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) return parsed.response;
    if (!isMisaConfigured(c.env)) {
      return c.json({ error: "MISA integration is not configured" }, 503);
    }

    const db = getDb(c.env);
    const existingOrder = await db.select().from(orders)
      .where(eq(orders.orderNumber, parsed.output.orderNumber)).get();
    if (!existingOrder) return c.json({ error: "Order not found" }, 404);

    const result = await synchronizeOrderWithMisa(db, existingOrder, c.env);
    if (!result.ok) return c.json({ error: result.message }, 502);
    const order = await getOrderDetail(db, parsed.output.orderNumber);
    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({ order }, 200);
  })
  .post("/:orderNumber/misa/check", async (c) => {
    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) return parsed.response;
    const db = getDb(c.env);
    const existingOrder = await db.select().from(orders).where(eq(orders.orderNumber, parsed.output.orderNumber)).get();
    if (!existingOrder) return c.json({ error: "Order not found" }, 404);
    if (
      !["synced", "missing"].includes(existingOrder.misaSyncStatus) ||
      !existingOrder.misaSaleOrderId ||
      !isMisaConfigured(c.env)
    ) {
      return c.json({ misa: serializeMisaStatus(existingOrder) }, 200);
    }
    try {
      const result = await checkMisaSaleOrderById(c.env, existingOrder.misaSaleOrderId);
      console.info("MISA SaleOrder presence check", {
        orderId: existingOrder.id,
        misaSaleOrderId: existingOrder.misaSaleOrderId,
        found: result.found,
        responseHadData: result.responseHadData,
      });
      await db.update(orders).set(result.found
        ? { misaSyncStatus: "synced", misaLastError: null }
        : result.responseHadData
          ? { misaSyncStatus: "missing", misaLastError: "MISA SaleOrder no longer exists" }
          // A malformed but successful response is inconclusive. Preserve the link
          // rather than claiming that MISA deleted a record.
          : { misaSyncStatus: "synced", misaLastError: null },
      ).where(eq(orders.id, existingOrder.id));
    } catch (error) {
      await db.update(orders).set(error instanceof MisaRequestError && error.status === 404
        ? { misaSyncStatus: "missing", misaLastError: "MISA SaleOrder no longer exists" }
        : { misaLastError: error instanceof Error ? error.message : "MISA presence check failed" },
      ).where(eq(orders.id, existingOrder.id));
    }
    const checkedOrder = await db.select().from(orders).where(eq(orders.id, existingOrder.id)).get();
    if (!checkedOrder) return c.json({ error: "Order not found" }, 404);
    return c.json({ misa: serializeMisaStatus(checkedOrder) }, 200);
  })
  .post("/:orderNumber/misa/refresh", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) return parsed.response;
    if (!isMisaConfigured(c.env)) {
      return c.json({ error: "MISA integration is not configured" }, 503);
    }

    const db = getDb(c.env);
    const existingOrder = await db.select().from(orders)
      .where(eq(orders.orderNumber, parsed.output.orderNumber)).get();
    if (!existingOrder) return c.json({ error: "Order not found" }, 404);

    const result = await synchronizeOrderWithMisa(db, existingOrder, c.env);
    if (!result.ok) return c.json({ error: result.message }, 502);
    const order = await getOrderDetail(db, parsed.output.orderNumber);
    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({ order }, 200);
  })
  .post("/:orderNumber/misa/disconnect", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) return parsed.response;

    const db = getDb(c.env);
    const existingOrder = await db.select().from(orders)
      .where(eq(orders.orderNumber, parsed.output.orderNumber)).get();
    if (!existingOrder) return c.json({ error: "Order not found" }, 404);

    await db.update(orders).set({
      misaSyncStatus: "disconnected",
      misaSaleOrderId: null,
      misaSaleOrderNo: null,
      misaLastError: null,
    }).where(eq(orders.id, existingOrder.id));
    const order = await getOrderDetail(db, parsed.output.orderNumber);
    if (!order) return c.json({ error: "Order not found" }, 404);
    return c.json({ order }, 200);
  })
  .delete("/:orderNumber", async (c) => {
    if (!(await requireSuperAdmin(c))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const parsed = parseParams(c, orderNumberParamsSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const db = getDb(c.env);
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, parsed.output.orderNumber))
      .get();

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (!isPurgeEligible(order)) {
      return c.json(
        { error: "Only pending, unpaid, unfulfilled orders can be permanently deleted" },
        409,
      );
    }

    if (order.misaSaleOrderId) {
      const misaSaleOrderId = parseMisaSaleOrderId(order.misaSaleOrderId);
      if (!misaSaleOrderId) {
        return c.json({ error: "Stored MISA SaleOrder ID is invalid; local order was preserved" }, 409);
      }

      try {
        await deleteMisaSaleOrders(c.env, [misaSaleOrderId]);
      } catch (error) {
        if (!(error instanceof MisaRequestError && error.status === 404)) {
          console.error("MISA SaleOrder deletion failed; local order preserved", {
            orderNumber: order.orderNumber,
            misaSaleOrderId,
            error,
          });
          return c.json({ error: "MISA SaleOrder could not be deleted; local order was preserved" }, 502);
        }
      }
    }

    const itemRows = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const itemIds = itemRows.map((item) => item.id);
    const transferRows = itemIds.length > 0
      ? await db
        .select({ id: orderItemMediaTransfers.id })
        .from(orderItemMediaTransfers)
        .where(inArray(orderItemMediaTransfers.orderItemId, itemIds))
      : [];
    const transferIds = transferRows.map((transfer) => transfer.id);
    const assetRows = transferIds.length > 0
      ? await db
        .select({ targetObjectKey: orderItemMediaTransferAssets.targetObjectKey })
        .from(orderItemMediaTransferAssets)
        .where(inArray(orderItemMediaTransferAssets.transferId, transferIds))
      : [];

    await db.batch([
      ...(transferIds.length > 0
        ? [db.delete(orderItemMediaTransferAssets).where(inArray(orderItemMediaTransferAssets.transferId, transferIds))]
        : []),
      ...(itemIds.length > 0
        ? [db.delete(orderItemMediaTransfers).where(inArray(orderItemMediaTransfers.orderItemId, itemIds))]
        : []),
      ...(assetRows.length > 0
        ? [db.insert(r2CleanupJobs).values(r2CleanupJobValues(assetRows.map((asset) => asset.targetObjectKey))).onConflictDoNothing()]
        : []),
      db.delete(orderItems).where(eq(orderItems.orderId, order.id)),
      db.delete(orders).where(eq(orders.id, order.id)),
    ] as any);

    return c.json({ deleted: true }, 200);
  })
  .patch("/:orderNumber/status", async (c) => {
    const parsedParams = parseParams(c, orderNumberParamsSchema);
    if (!parsedParams.success) {
      return parsedParams.response;
    }

    const parsedBody = await parseJson(c, orderStatusUpdateSchema);
    if (!parsedBody.success) {
      return parsedBody.response;
    }

    if (!hasStatusUpdate(parsedBody.output)) {
      return c.json({ error: "At least one status field is required" }, 400);
    }

    const db = getDb(c.env);
    const existingOrder = await db
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, parsedParams.output.orderNumber))
      .get();

    if (!existingOrder) {
      return c.json({ error: "Order not found" }, 404);
    }

    await db
      .update(orders)
      .set({
        ...parsedBody.output,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, existingOrder.id));

    const order = await getOrderDetail(db, parsedParams.output.orderNumber);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ order }, 200);
  })
  .patch("/:orderNumber/items/:itemId/production", async (c) => {
    const parsedParams = parseParams(c, orderItemParamsSchema);
    if (!parsedParams.success) {
      return parsedParams.response;
    }

    const parsedBody = await parseJson(c, orderItemProductionUpdateSchema);
    if (!parsedBody.success) {
      return parsedBody.response;
    }

    const db = getDb(c.env);
    const orderRow = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, parsedParams.output.orderNumber))
      .get();

    if (!orderRow) {
      return c.json({ error: "Order not found" }, 404);
    }

    const itemRow = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.id, parsedParams.output.itemId), eq(orderItems.orderId, orderRow.id)))
      .get();

    if (!itemRow) {
      return c.json({ error: "Order item not found" }, 404);
    }

    await db
      .update(orderItems)
      .set({ productionStatus: parsedBody.output.productionStatus })
      .where(and(eq(orderItems.id, parsedParams.output.itemId), eq(orderItems.orderId, orderRow.id)));

    const order = await getOrderDetail(db, parsedParams.output.orderNumber);
    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    return c.json({ order }, 200);
  });
