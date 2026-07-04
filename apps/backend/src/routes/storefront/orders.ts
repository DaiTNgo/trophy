/**
 * Storefront order creation route.
 *
 * POST /api/storefront/orders
 *
 * Accepts multi-item checkout submissions. All product, variant, price, and
 * customization data is read server-side. The browser only sends productId,
 * variantId, quantity, and customization.values for each item.
 */

import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import {
  buildDesignFromForm,
  validateCustomizationValues,
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
import { jsonError, parseJson } from "../../lib/validation";

// ─── Type aliases for status columns ──────────────────────────────────────────

type OrderStatus = "pending" | "confirmed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type FulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled";
type PaymentMethod = "bank_transfer" | "cash_on_delivery";
type ProductionStatus = "not_required" | "pending_review";

// ─── Request Schema (Task 2.1) ─────────────────────────────────────────────────

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
  payment: v.object({
    method: v.picklist(["bank_transfer", "cash_on_delivery"], "Payment method must be bank_transfer or cash_on_delivery"),
  }),
  items: v.pipe(
    v.array(orderItemInputSchema),
    v.minLength(1, "At least one item is required"),
  ),
});

type CreateOrderInput = v.InferOutput<typeof createOrderSchema>;
type OrderItemInput = v.InferOutput<typeof orderItemInputSchema>;

// ─── Product & Variant Lookup (Task 2.2) ──────────────────────────────────────

type DbType = ReturnType<typeof getDb>;

type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type VariantMediaRow = typeof productVariantMedia.$inferSelect;
type CustomizationRow = typeof productCustomizations.$inferSelect;

/**
 * Look up a published product by id. Returns null if not found or not published.
 */
async function lookupPublishedProduct(db: DbType, productId: number): Promise<ProductRow | null> {
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, "published")))
    .get();
  return product ?? null;
}

/**
 * Look up a variant that belongs to the given product. Returns null if variant
 * does not exist or does not belong to the product.
 */
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

/**
 * Look up the first media item for a variant (used as background snapshot).
 */
async function lookupVariantFirstMedia(
  db: DbType,
  variantId: number,
): Promise<VariantMediaRow | null> {
  const media = await db
    .select()
    .from(productVariantMedia)
    .where(eq(productVariantMedia.variantId, variantId))
    .limit(1)
    .get();
  return media ?? null;
}

/**
 * Look up the product customization record.
 */
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

// ─── Price Validation (Task 2.3) ──────────────────────────────────────────────

type PriceValidationResult =
  | { ok: true; unitPrice: number }
  | { ok: false; reason: "contact_price" };

/**
 * Validate that the variant has a numeric price (not Contact Price).
 * Returns the unit price if valid.
 */
function validateVariantPrice(variant: VariantRow): PriceValidationResult {
  if (variant.priceAmount === null || variant.priceAmount === undefined) {
    return { ok: false, reason: "contact_price" };
  }
  return { ok: true, unitPrice: variant.priceAmount };
}

// ─── Customization Validation & Snapshot (Tasks 2.4 & 2.5) ───────────────────

type BackgroundSnapshot = {
  assetId: string;
  previewUrl: string;
  widthPx: number | null;
  heightPx: number | null;
};

type CustomizationSnapshot = {
  values: CustomizationFormValues;
  design: object;
  templateSnapshot: {
    layers: unknown[];
    formFields: unknown[];
    canvasWidthPx: number | null;
    canvasHeightPx: number | null;
  };
};

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

/**
 * Build the customization template from the stored product customization +
 * selected variant background. This mirrors buildProductCustomizationTemplate
 * from the storefront lib but runs entirely on the backend.
 */
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
  const formFields = JSON.parse(customizationRow.formFieldsJson) as unknown[];

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
    formFields: formFields as CustomizationTemplate["formFields"],
  };
}

/**
 * Validate and build snapshots for one order item.
 * Runs all lookups, price validation, and customization validation.
 */
async function validateAndBuildItemSnapshot(
  db: DbType,
  item: OrderItemInput,
): Promise<ItemValidationResult> {
  // Task 2.2 – look up published product
  const product = await lookupPublishedProduct(db, item.productId);
  if (!product) {
    return {
      ok: false,
      error: `Product ${item.productId} not found or not available`,
      status: 422,
    };
  }

  // Task 2.2 – validate variant belongs to product
  const variant = await lookupVariantForProduct(db, item.variantId, item.productId);
  if (!variant) {
    return {
      ok: false,
      error: `Variant ${item.variantId} does not belong to product ${item.productId}`,
      status: 422,
    };
  }

  // Task 2.3 – reject Contact Price variants
  const priceResult = validateVariantPrice(variant);
  if (!priceResult.ok) {
    return {
      ok: false,
      error: `Variant ${item.variantId} has no price (Contact Price items cannot be ordered)`,
      status: 422,
    };
  }
  const { unitPrice } = priceResult;
  const lineSubtotal = unitPrice * item.quantity;

  // Background snapshot from first variant media
  const firstMedia = await lookupVariantFirstMedia(db, item.variantId);
  const backgroundSnapshot: BackgroundSnapshot | null = firstMedia
    ? {
        assetId: firstMedia.assetId,
        previewUrl: `/api/storefront/products/assets/${firstMedia.assetId}/content`,
        widthPx: null,
        heightPx: null,
      }
    : null;

  // Task 2.4 – customization validation
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

  // Task 2.5 – build customization snapshot for customizable products
  if (isCustomizable && customizationRow && item.customization?.values) {
    const values = item.customization.values as CustomizationFormValues;

    const template = buildBackendCustomizationTemplate(
      product.id,
      product.title,
      customizationRow,
      backgroundSnapshot ? backgroundSnapshot.previewUrl : null,
      backgroundSnapshot ? backgroundSnapshot.widthPx : null,
      backgroundSnapshot ? backgroundSnapshot.heightPx : null,
      backgroundSnapshot ? backgroundSnapshot.assetId : null,
    );

    const validationResult = validateCustomizationValues({ template, values });
    if (!validationResult.valid) {
      const messages = validationResult.issues.map((i) => i.message).join("; ");
      return {
        ok: false,
        error: `Customization validation failed: ${messages}`,
        status: 422,
      };
    }

    // Build the backend-rendered design snapshot
    const design = buildDesignFromForm({ template, values });

    customizationSnapshot = {
      values,
      design,
      templateSnapshot: {
        layers: JSON.parse(customizationRow.layersJson) as unknown[],
        formFields: JSON.parse(customizationRow.formFieldsJson) as unknown[],
        canvasWidthPx: customizationRow.canvasWidthPx,
        canvasHeightPx: customizationRow.canvasHeightPx,
      },
    };
    productionStatus = "pending_review";
  }

  // Compact snapshots for storage
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
    unitPrice,
    lineSubtotal,
    productSnapshot,
    variantSnapshot,
    backgroundSnapshot,
    customizationSnapshot,
    productionStatus,
  };
}

// ─── Order Number Generator (Task 3.3) ────────────────────────────────────────

/**
 * Generate a shopper-facing order number: ORD- prefix + timestamp + random hex.
 * Distinct from the auto-increment integer DB id.
 */
function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${ts}-${rand}`;
}

// ─── Route Handler ─────────────────────────────────────────────────────────────

export const storefrontOrdersRoute = new Hono<AppEnv>()
  /**
   * POST /api/storefront/orders
   *
   * Task 3.1: Public storefront endpoint, protected by storefront CORS set in app.ts.
   */
  .post("/", async (c) => {
    const parsed = await parseJson(c, createOrderSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const input: CreateOrderInput = parsed.output;

    // Task 3.5: Validate different shipping address when shipToDifferentAddress is true
    if (input.shipping.shipToDifferentAddress && !input.shipping.differentAddress) {
      return jsonError(c, 400, "Different shipping address details are required when shipToDifferentAddress is true");
    }

    const db = getDb(c.env);

    // Task 2.6: Validate ALL items before writing (fail-fast, no partial orders)
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

    // Calculate totals
    const subtotalAmount = validatedItems.reduce((sum, i) => sum + i.lineSubtotal, 0);
    const totalAmount = subtotalAmount;
    const itemCount = validatedItems.reduce((sum, i) => sum + i.input.quantity, 0);

    // Task 3.3: Generate shopper-facing order number
    const orderNumber = generateOrderNumber();

    // Task 3.2: Persist the order with initial statuses
    const now = Date.now();

    const primaryAddressJson = JSON.stringify(input.shipping.primaryAddress);
    const shippingAddressJson = input.shipping.shipToDifferentAddress && input.shipping.differentAddress
      ? JSON.stringify(input.shipping.differentAddress)
      : null;

    const [insertedOrder] = await db
      .insert(orders)
      .values({
        orderNumber,
        status: "pending" satisfies OrderStatus,
        paymentStatus: "pending" satisfies PaymentStatus,
        fulfillmentStatus: "unfulfilled" satisfies FulfillmentStatus,
        paymentMethod: input.payment.method satisfies PaymentMethod,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
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

    const orderId = insertedOrder.id;

    // Persist all order items
    for (const item of validatedItems) {
      await db.insert(orderItems).values({
        orderId,
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

    // Task 3.4: Return confirmation summary
    return c.json(
      {
        order: {
          id: orderId,
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
