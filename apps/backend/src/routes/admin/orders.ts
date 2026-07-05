import { desc, eq } from "drizzle-orm";
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
import { parseParams } from "../../lib/validation";

const orderNumberParamsSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
});

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
    const orderRow = await db.select().from(orders).where(eq(orders.orderNumber, parsed.output.orderNumber)).get();

    if (!orderRow) {
      return c.json({ error: "Order not found" }, 404);
    }

    const itemRows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderRow.id))
      .orderBy(orderItems.id);

    const primaryAddress = parseOrderAddress(orderRow.primaryAddressJson);
    const shippingAddress = parseDifferentShippingAddress(orderRow.shippingAddressJson);

    return c.json(
      {
        order: {
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
                  }
                : null,
            };
          }),
        },
      },
      200,
    );
  });
