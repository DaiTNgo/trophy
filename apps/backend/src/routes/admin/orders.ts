import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { orderItems, orders } from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import {
  buildCustomizationValueSummaries,
  parseBackgroundSnapshot,
  parseCustomizationSnapshot,
  parseDifferentShippingAddress,
  parseOrderAddress,
  parseProductSnapshot,
  parseVariantSnapshot,
} from "../../lib/order-utils";
import { parseJson, parseParams } from "../../lib/validation";

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
  status: v.optional(v.picklist(["pending", "confirmed", "cancelled"])),
  paymentStatus: v.optional(v.picklist(["pending", "paid", "failed", "refunded", "cancelled"])),
  fulfillmentStatus: v.optional(v.picklist(["unfulfilled", "partially_fulfilled", "fulfilled"])),
});

const orderItemProductionUpdateSchema = v.object({
  productionStatus: v.picklist(["not_required", "pending_review", "ready"]),
});

type OrderStatusUpdateInput = v.InferOutput<typeof orderStatusUpdateSchema>;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

function serializeAdminOrderDetail(orderRow: OrderRow, itemRows: OrderItemRow[]) {
  const primaryAddress = parseOrderAddress(orderRow.primaryAddressJson);
  const shippingAddress = parseDifferentShippingAddress(orderRow.shippingAddressJson);

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
  return Boolean(input.status || input.paymentStatus || input.fulfillmentStatus);
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
