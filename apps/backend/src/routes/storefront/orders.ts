import { and, asc, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import {
  buildDesignFromForm,
  validateCustomizationValues,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationTemplate,
} from "@trophy/customization";
import { getDb } from "../../db/client";
import {
  orderItems,
  orders,
  productCustomizations,
  productVariantMedia,
  productVariants,
  products,
} from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import {
  buildCustomizationValueSummaries,
  maskPhone,
  normalizePhoneForLookup,
  parseCustomizationSnapshot,
  parseDifferentShippingAddress,
  parseOrderAddress,
  parseProductSnapshot,
  parseVariantSnapshot,
  type StoredCustomizationSnapshot,
} from "../../lib/order-utils";
import { jsonError, parseJson } from "../../lib/validation";

type OrderStatus = "pending" | "confirmed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type FulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled";
type PaymentMethod = "manual";
type ProductionStatus = "not_required" | "pending_review";

const addressSchema = v.object({
  line1: v.pipe(v.string(), v.trim(), v.minLength(1, "Address line is required"), v.maxLength(500)),
  line2: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
  city: v.pipe(v.string(), v.trim(), v.minLength(1, "City is required"), v.maxLength(255)),
  province: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(255))),
  postalCode: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(20))),
  country: v.pipe(v.string(), v.trim(), v.minLength(1, "Country is required"), v.maxLength(100)),
});

const differentShippingAddressSchema = v.object({
  recipientName: v.pipe(v.string(), v.trim(), v.minLength(1, "Recipient name is required"), v.maxLength(255)),
  recipientPhone: v.pipe(v.string(), v.trim(), v.minLength(1, "Recipient phone is required"), v.maxLength(50)),
  address: addressSchema,
});

const orderItemInputSchema = v.object({
  productId: v.pipe(v.number(), v.integer(), v.minValue(1, "productId must be a positive integer")),
  variantId: v.pipe(v.number(), v.integer(), v.minValue(1, "variantId must be a positive integer")),
  quantity: v.pipe(v.number(), v.integer(), v.minValue(1, "quantity must be at least 1")),
  customization: v.optional(
    v.object({
      values: v.record(v.string(), v.unknown()),
    }),
  ),
});

const createOrderSchema = v.object({
  customer: v.object({
    name: v.pipe(v.string(), v.trim(), v.minLength(1, "Customer name is required"), v.maxLength(255)),
    phone: v.pipe(v.string(), v.trim(), v.minLength(1, "Customer phone is required"), v.maxLength(50)),
    email: v.optional(v.pipe(v.string(), v.trim(), v.email("Invalid email"), v.maxLength(255))),
  }),
  shipping: v.object({
    primaryAddress: addressSchema,
    shipToDifferentAddress: v.boolean(),
    differentAddress: v.optional(differentShippingAddressSchema),
  }),
  items: v.pipe(v.array(orderItemInputSchema), v.minLength(1, "At least one item is required")),
});

const resolveCartLinesSchema = v.object({
  items: v.pipe(
    v.array(
      v.object({
        productId: v.pipe(v.number(), v.integer(), v.minValue(1, "productId must be a positive integer")),
        variantId: v.pipe(v.number(), v.integer(), v.minValue(1, "variantId must be a positive integer")),
      }),
    ),
    v.minLength(1, "At least one item is required"),
  ),
});

const lookupOrderSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1, "Order number is required"), v.maxLength(255)),
  phone: v.pipe(v.string(), v.trim(), v.minLength(1, "Phone is required"), v.maxLength(50)),
});

type CreateOrderInput = v.InferOutput<typeof createOrderSchema>;
type OrderItemInput = v.InferOutput<typeof orderItemInputSchema>;
type ResolveCartLinesInput = v.InferOutput<typeof resolveCartLinesSchema>;
type LookupOrderInput = v.InferOutput<typeof lookupOrderSchema>;
type DbType = ReturnType<typeof getDb>;
type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type VariantMediaRow = typeof productVariantMedia.$inferSelect;
type CustomizationRow = typeof productCustomizations.$inferSelect;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

type BackgroundSnapshot = {
  assetId: string;
  previewUrl: string;
  widthPx: number | null;
  heightPx: number | null;
};

type CustomizationSnapshot = StoredCustomizationSnapshot;

type ItemValidationResult =
  | {
      ok: true;
      unitPrice: number;
      lineSubtotal: number;
      productSnapshot: object;
      variantSnapshot: object;
      backgroundSnapshot: BackgroundSnapshot | null;
      customizationSnapshot: CustomizationSnapshot | null;
      productionStatus: ProductionStatus;
    }
  | { ok: false; error: string; status: number };

async function lookupPublishedProduct(db: DbType, productId: number): Promise<ProductRow | null> {
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, "published")))
    .get();

  return product ?? null;
}

async function lookupVariantById(db: DbType, variantId: number): Promise<VariantRow | null> {
  const variant = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).get();
  return variant ?? null;
}

async function lookupVariantForProduct(
  db: DbType,
  variantId: number,
  productId: number,
): Promise<VariantRow | null> {
  const variant = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .get();

  return variant ?? null;
}

async function lookupVariantFirstMedia(db: DbType, variantId: number): Promise<VariantMediaRow | null> {
  const media = await db
    .select()
    .from(productVariantMedia)
    .where(eq(productVariantMedia.variantId, variantId))
    .orderBy(asc(productVariantMedia.position), asc(productVariantMedia.assetId))
    .limit(1)
    .get();

  return media ?? null;
}

async function lookupProductCustomization(
  db: DbType,
  productId: number,
): Promise<CustomizationRow | null> {
  const row = await db
    .select()
    .from(productCustomizations)
    .where(eq(productCustomizations.productId, productId))
    .get();

  return row ?? null;
}

function validateVariantPrice(variant: VariantRow) {
  if (variant.priceAmount === null || variant.priceAmount === undefined) {
    return { ok: false as const, reason: "contact_price" as const };
  }

  return { ok: true as const, unitPrice: variant.priceAmount };
}

function buildBackendCustomizationTemplate(
  productId: number,
  productTitle: string,
  customizationRow: CustomizationRow,
  backgroundUrl: string | null,
  backgroundWidthPx: number | null,
  backgroundHeightPx: number | null,
  backgroundAssetId: string | null,
): CustomizationTemplate {
  const layers = JSON.parse(customizationRow.layersJson) as unknown[];
  const formFields = JSON.parse(customizationRow.formFieldsJson) as CustomizationFormField[];

  const background =
    backgroundUrl && backgroundAssetId
      ? {
          assetId: backgroundAssetId,
          previewUrl: backgroundUrl,
          widthPx: backgroundWidthPx ?? 0,
          heightPx: backgroundHeightPx ?? 0,
        }
      : null;

  return {
    id: `product_${productId}`,
    productId: String(productId),
    name: `${productTitle} customization`,
    revision: 1,
    status: "published",
    background,
    layers: layers as CustomizationTemplate["layers"],
    formFields,
  };
}

async function validateAndBuildItemSnapshot(
  db: DbType,
  item: OrderItemInput,
): Promise<ItemValidationResult> {
  const product = await lookupPublishedProduct(db, item.productId);
  if (!product) {
    return {
      ok: false,
      error: `Product ${item.productId} not found or not available`,
      status: 422,
    };
  }

  const variant = await lookupVariantForProduct(db, item.variantId, item.productId);
  if (!variant) {
    return {
      ok: false,
      error: `Variant ${item.variantId} does not belong to product ${item.productId}`,
      status: 422,
    };
  }

  const priceResult = validateVariantPrice(variant);
  if (!priceResult.ok) {
    return {
      ok: false,
      error: `Variant ${item.variantId} has no price (Contact Price items cannot be ordered)`,
      status: 422,
    };
  }

  const firstMedia = await lookupVariantFirstMedia(db, item.variantId);
  const backgroundSnapshot: BackgroundSnapshot | null = firstMedia
    ? {
        assetId: firstMedia.assetId,
        previewUrl: `/api/assets/products/${firstMedia.assetId}/content`,
        widthPx: null,
        heightPx: null,
      }
    : null;

  const customizationRow = await lookupProductCustomization(db, item.productId);
  const isCustomizable = customizationRow?.enabled === true;

  if (isCustomizable && !item.customization?.values) {
    return {
      ok: false,
      error: `Product ${item.productId} requires customization values`,
      status: 422,
    };
  }

  if (!isCustomizable && item.customization?.values) {
    return {
      ok: false,
      error: `Product ${item.productId} does not support customization`,
      status: 422,
    };
  }

  let customizationSnapshot: CustomizationSnapshot | null = null;
  let productionStatus: ProductionStatus = "not_required";

  if (isCustomizable && customizationRow && item.customization?.values) {
    const values = item.customization.values as CustomizationFormValues;
    const template = buildBackendCustomizationTemplate(
      product.id,
      product.title,
      customizationRow,
      backgroundSnapshot?.previewUrl ?? null,
      backgroundSnapshot?.widthPx ?? null,
      backgroundSnapshot?.heightPx ?? null,
      backgroundSnapshot?.assetId ?? null,
    );

    const validationResult = validateCustomizationValues({ template, values });
    if (!validationResult.valid) {
      const messages = validationResult.issues.map((issue) => issue.message).join("; ");
      return {
        ok: false,
        error: `Customization validation failed: ${messages}`,
        status: 422,
      };
    }

    customizationSnapshot = {
      values,
      design: buildDesignFromForm({ template, values }),
      templateSnapshot: {
        layers: JSON.parse(customizationRow.layersJson) as unknown[],
        formFields: JSON.parse(customizationRow.formFieldsJson) as CustomizationFormField[],
        canvasWidthPx: customizationRow.canvasWidthPx,
        canvasHeightPx: customizationRow.canvasHeightPx,
      },
    };
    productionStatus = "pending_review";
  }

  const productSnapshot = {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
  };

  const variantSnapshot = {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    priceAmount: variant.priceAmount,
  };

  return {
    ok: true,
    unitPrice: priceResult.unitPrice,
    lineSubtotal: priceResult.unitPrice * item.quantity,
    productSnapshot,
    variantSnapshot,
    backgroundSnapshot,
    customizationSnapshot,
    productionStatus,
  };
}

function generateOrderNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

async function loadOrderWithItemsByNumber(db: DbType, orderNumber: string) {
  const order = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).get();

  if (!order) {
    return null;
  }

  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id)).orderBy(orderItems.id);
  return { order, items };
}

function buildLookupOrderResponse(order: OrderRow, items: OrderItemRow[]) {
  const primaryAddress = parseOrderAddress(order.primaryAddressJson);
  const shippingAddress = parseDifferentShippingAddress(order.shippingAddressJson);

  return {
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      fulfillmentStatus: order.fulfillmentStatus,
      totalAmount: order.totalAmount,
      currencyCode: order.currencyCode,
      itemCount: order.itemCount,
      createdAt: order.createdAt.toISOString(),
      customer: {
        name: order.customerName,
        phoneMasked: maskPhone(order.customerPhone),
        email: order.customerEmail,
      },
      primaryAddress,
      shippingAddress,
      items: items.map((item) => {
        const productSnapshot = parseProductSnapshot(item.productSnapshotJson);
        const variantSnapshot = parseVariantSnapshot(item.variantSnapshotJson);
        const customizationSnapshot = parseCustomizationSnapshot(item.customizationSnapshotJson);

        return {
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          lineSubtotalAmount: item.lineSubtotalAmount,
          productTitle: productSnapshot?.title ?? "Unknown product",
          productHandle: productSnapshot?.handle ?? null,
          variantTitle: variantSnapshot?.title ?? "Unknown variant",
          sku: variantSnapshot?.sku ?? null,
          customizationValues: buildCustomizationValueSummaries(customizationSnapshot),
        };
      }),
    },
  };
}

export const storefrontOrdersRoute = new Hono<AppEnv>()
  .post("/resolve", async (c) => {
    const parsed = await parseJson(c, resolveCartLinesSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const input: ResolveCartLinesInput = parsed.output;
    const db = getDb(c.env);

    const results = await Promise.all(
      input.items.map(async (item) => {
        const product = await lookupPublishedProduct(db, item.productId);
        if (!product) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            valid: false,
            reason: "product_unavailable",
          };
        }

        const variant = await lookupVariantById(db, item.variantId);
        if (!variant) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            valid: false,
            reason: "variant_missing",
          };
        }

        if (variant.productId !== item.productId) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            valid: false,
            reason: "variant_mismatch",
          };
        }

        const customization = await lookupProductCustomization(db, item.productId);
        const firstMedia = await lookupVariantFirstMedia(db, item.variantId);

        if (variant.priceAmount === null || variant.priceAmount === undefined) {
          return {
            productId: item.productId,
            variantId: item.variantId,
            valid: false,
            reason: "contact_price",
            product: {
              title: product.title,
              handle: product.handle,
              variantTitle: variant.title,
              sku: variant.sku,
              thumbnail: firstMedia ? `/api/assets/products/${firstMedia.assetId}/content` : null,
              priceAmount: null,
              customizable: customization?.enabled === true,
              requiresCustomization: customization?.enabled === true,
              isContactPrice: true,
            },
          };
        }

        return {
          productId: item.productId,
          variantId: item.variantId,
          valid: true,
          reason: null,
          product: {
            title: product.title,
            handle: product.handle,
            variantTitle: variant.title,
            sku: variant.sku,
            thumbnail: firstMedia ? `/api/assets/products/${firstMedia.assetId}/content` : null,
            priceAmount: variant.priceAmount,
            customizable: customization?.enabled === true,
            requiresCustomization: customization?.enabled === true,
            isContactPrice: false,
          },
        };
      }),
    );

    return c.json({ items: results }, 200);
  })
  .post("/lookup", async (c) => {
    const parsed = await parseJson(c, lookupOrderSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const input: LookupOrderInput = parsed.output;
    const normalizedPhone = normalizePhoneForLookup(input.phone);
    if (!normalizedPhone) {
      return jsonError(c, 422, "Phone must include at least one digit");
    }

    const db = getDb(c.env);
    const loaded = await loadOrderWithItemsByNumber(db, input.orderNumber);
    if (!loaded) {
      return jsonError(c, 404, "Order not found");
    }

    if (normalizePhoneForLookup(loaded.order.customerPhone) !== normalizedPhone) {
      return jsonError(c, 404, "Order not found");
    }

    return c.json(buildLookupOrderResponse(loaded.order, loaded.items), 200);
  })
  .post("/", async (c) => {
    const parsed = await parseJson(c, createOrderSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const input: CreateOrderInput = parsed.output;
    if (input.shipping.shipToDifferentAddress && !input.shipping.differentAddress) {
      return jsonError(
        c,
        400,
        "Different shipping address details are required when shipToDifferentAddress is true",
      );
    }

    const normalizedCustomerPhone = normalizePhoneForLookup(input.customer.phone);
    if (!normalizedCustomerPhone) {
      return jsonError(c, 422, "Customer phone must include at least one digit");
    }

    const db = getDb(c.env);
    const validatedItems: Array<{
      input: OrderItemInput;
      unitPrice: number;
      lineSubtotal: number;
      productSnapshot: object;
      variantSnapshot: object;
      backgroundSnapshot: BackgroundSnapshot | null;
      customizationSnapshot: CustomizationSnapshot | null;
      productionStatus: ProductionStatus;
    }> = [];

    for (const item of input.items) {
      const result = await validateAndBuildItemSnapshot(db, item);
      if (!result.ok) {
        return c.json({ error: result.error }, result.status as 422);
      }

      validatedItems.push({
        input: item,
        unitPrice: result.unitPrice,
        lineSubtotal: result.lineSubtotal,
        productSnapshot: result.productSnapshot,
        variantSnapshot: result.variantSnapshot,
        backgroundSnapshot: result.backgroundSnapshot,
        customizationSnapshot: result.customizationSnapshot,
        productionStatus: result.productionStatus,
      });
    }

    const subtotalAmount = validatedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
    const totalAmount = subtotalAmount;
    const itemCount = validatedItems.reduce((sum, item) => sum + item.input.quantity, 0);
    const orderNumber = generateOrderNumber();
    const now = Date.now();

    const primaryAddressJson = JSON.stringify(input.shipping.primaryAddress);
    const shippingAddressJson =
      input.shipping.shipToDifferentAddress && input.shipping.differentAddress
        ? JSON.stringify({
            ...input.shipping.differentAddress,
            recipientPhone: normalizePhoneForLookup(input.shipping.differentAddress.recipientPhone),
          })
        : null;

    const [insertedOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        status: "pending" satisfies OrderStatus,
        paymentStatus: "pending" satisfies PaymentStatus,
        fulfillmentStatus: "unfulfilled" satisfies FulfillmentStatus,
        paymentMethod: "manual" satisfies PaymentMethod,
        customerName: input.customer.name,
        customerPhone: normalizedCustomerPhone,
        customerEmail: input.customer.email ?? null,
        primaryAddressJson,
        shippingAddressJson,
        shipToDifferentAddress: input.shipping.shipToDifferentAddress,
        subtotalAmount,
        totalAmount,
        currencyCode: "VND",
        itemCount,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .returning({ id: orders.id, createdAt: orders.createdAt });

    if (!insertedOrder) {
      return jsonError(c, 422, "Failed to create order");
    }

    for (const item of validatedItems) {
      await db.insert(orderItems).values({
        orderId: insertedOrder.id,
        productId: item.input.productId,
        variantId: item.input.variantId,
        quantity: item.input.quantity,
        unitPriceAmount: item.unitPrice,
        lineSubtotalAmount: item.lineSubtotal,
        productSnapshotJson: JSON.stringify(item.productSnapshot),
        variantSnapshotJson: JSON.stringify(item.variantSnapshot),
        backgroundSnapshotJson: item.backgroundSnapshot ? JSON.stringify(item.backgroundSnapshot) : null,
        customizationSnapshotJson: item.customizationSnapshot ? JSON.stringify(item.customizationSnapshot) : null,
        productionStatus: item.productionStatus,
        createdAt: new Date(now),
      });
    }

    return c.json(
      {
        order: {
          id: insertedOrder.id,
          orderNumber,
          status: "pending" satisfies OrderStatus,
          paymentStatus: "pending" satisfies PaymentStatus,
          fulfillmentStatus: "unfulfilled" satisfies FulfillmentStatus,
          totalAmount,
          currencyCode: "VND",
          itemCount,
          createdAt: new Date(now).toISOString(),
        },
      },
      201,
    );
  });
