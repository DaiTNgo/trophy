import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { toAbsoluteAssetUrl } from "../../lib/url";
import * as v from "valibot";
import {
  buildDesignFromForm,
  validateCustomizationValues,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationTemplate,
} from "@trophy/customization";
import { getDb } from "../../db/client";
import { hydrateAndResolveTranslations } from "../../lib/catalog-translation";
import { hydrateAndResolveCustomization } from "../../lib/customization-translation";
import { localeSchema, DEFAULT_LOCALE } from "../../lib/locale";
import {
  orderItems,
  orders,
  products,
  productCustomizations,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariants,
} from "../../db/schema";
import type { AppEnv } from "../../lib/env";
import {
  buildCustomizationValueSummaries,
  maskPhone,
  normalizePhoneForLookup,
  parseBackgroundSnapshot,
  parseCustomizationSnapshot,
  parseDifferentShippingAddress,
  parseOrderAddress,
  parseVatDetails,
  parseProductSnapshot,
  parseVariantSnapshot,
  type StoredCustomizationSnapshot,
} from "../../lib/order-utils";
import { jsonError, parseJson } from "../../lib/validation";
import {
  isMisaConfigured,
  MisaRequestError,
  syncMisaOrder,
  validateMisaCheckoutCustomer,
} from "../../lib/misa";

type OrderStatus = "pending" | "confirmed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type FulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled";
type PaymentMethod = "bank_transfer" | "cash_on_delivery";
type ProductionStatus = "not_required" | "pending_review" | "ready";

function misaVatField(error: MisaRequestError) {
  const fieldName = error.message.match(/^([a-z_]+):/)?.[1];
  return {
    account_name: "vat.name",
    tax_code: "vat.taxId",
    office_email: "vat.email",
    billing_address: "vat.address",
  }[fieldName ?? ""];
}

function isDuplicateMisaTaxCode(error: MisaRequestError) {
  return /^tax_code:/i.test(error.message) && /trùng|duplicate/i.test(error.message);
}

const addressSchema = v.object({
  line1: v.pipe(v.string(), v.trim(), v.minLength(1, "Address line is required"), v.maxLength(500)),
  line2: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(500))),
  city: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1, "City is required"), v.maxLength(255))),
  province: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(255))),
  postalCode: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(20))),
  country: v.optional(v.pipe(v.string(), v.trim(), v.minLength(1, "Country is required"), v.maxLength(100))),
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
    method: v.picklist(["bank_transfer", "cash_on_delivery"]),
  }),
  items: v.pipe(v.array(orderItemInputSchema), v.minLength(1, "At least one item is required")),
  notes: v.optional(v.pipe(v.string(), v.trim(), v.maxLength(2000, "Order note is too long"))),
  vatRequested: v.optional(v.boolean(), false),
  vat: v.optional(
    v.object({
      name: v.pipe(v.string(), v.trim(), v.minLength(1, "VAT name is required"), v.maxLength(255)),
      taxId: v.pipe(v.string(), v.trim(), v.minLength(1, "VAT tax ID is required"), v.maxLength(100)),
      email: v.pipe(v.string(), v.trim(), v.minLength(1, "VAT email is required"), v.email("Invalid VAT email"), v.maxLength(255)),
      address: v.pipe(v.string(), v.trim(), v.minLength(1, "VAT address is required"), v.maxLength(1000)),
    }),
  ),
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
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
  locale: v.optional(localeSchema, DEFAULT_LOCALE),
});

const lookupOrderSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1, "Order number is required"), v.maxLength(255)),
  phone: v.pipe(v.string(), v.trim(), v.minLength(1, "Phone is required"), v.maxLength(50)),
});

const paymentInstructionsQuerySchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
  accessToken: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2048)),
});

type CreateOrderInput = v.InferOutput<typeof createOrderSchema>;
type OrderItemInput = v.InferOutput<typeof orderItemInputSchema>;
type ResolveCartLinesInput = v.InferOutput<typeof resolveCartLinesSchema>;
type LookupOrderInput = v.InferOutput<typeof lookupOrderSchema>;
type DbType = ReturnType<typeof getDb>;
type ProductRow = typeof products.$inferSelect;
type VariantRow = typeof productVariants.$inferSelect;
type VariantMediaRow = typeof productVariantMedia.$inferSelect;
type VariantCustomizationMediaRow =
  typeof productVariantCustomizationMedia.$inferSelect;
type CustomizationRow = typeof productCustomizations.$inferSelect;
type OrderRow = typeof orders.$inferSelect;
type OrderItemRow = typeof orderItems.$inferSelect;

const CHECKOUT_ACCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LOCAL_CHECKOUT_ACCESS_SECRET = "trophy-local-checkout-access-secret";

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

async function lookupPublishedProduct(db: DbType, productId: number, locale: "vi" | "en"): Promise<ProductRow | null> {
  const product = await db
    .select()
    .from(products)
    .where(and(eq(products.id, productId), eq(products.status, "published"), isNull(products.deletedAt)))
    .get();

  if (!product) return null;
  const hydrated = await hydrateAndResolveTranslations(db, 'product', [product], p => String(p.id), [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}], [{fieldName: 'title', objectKey: 'title'}, {fieldName: 'subtitle', objectKey: 'subtitle'}], locale);
  return hydrated[0];
}

async function lookupVariantById(db: DbType, variantId: number): Promise<VariantRow | null> {
  const variant = await db.select().from(productVariants).where(eq(productVariants.id, variantId)).get();
  return variant ?? null;
}

async function lookupProductThumbnailAssetId(db: DbType, productId: number) {
  const product = await db
    .select({ thumbnailAssetId: products.thumbnailAssetId })
    .from(products)
    .where(eq(products.id, productId))
    .get();
  return product?.thumbnailAssetId ?? null;
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

async function lookupVariantCustomizationMedia(
  db: DbType,
  variantId: number,
): Promise<VariantCustomizationMediaRow | null> {
  const media = await db
    .select()
    .from(productVariantCustomizationMedia)
    .where(eq(productVariantCustomizationMedia.variantId, variantId))
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
  c: Context<AppEnv>,
  db: DbType,
  item: OrderItemInput,
  locale: "vi" | "en"
): Promise<ItemValidationResult> {
  const product = await lookupPublishedProduct(db, item.productId, locale);
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
  const customizationRow = await lookupProductCustomization(db, item.productId);
  const customizationMedia = customizationRow?.enabled
    ? await lookupVariantCustomizationMedia(db, item.variantId)
    : null;
  const backgroundAssetId = customizationMedia?.assetId ?? firstMedia?.assetId;
  const backgroundSnapshot: BackgroundSnapshot | null = backgroundAssetId
    ? {
        assetId: backgroundAssetId,
        previewUrl: toAbsoluteAssetUrl(c, `/api/assets/products/${backgroundAssetId}/content`) as string,
        widthPx: null,
        heightPx: null,
      }
    : null;
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

    const parsedCustomization = {
      layers: JSON.parse(customizationRow.layersJson),
      formFields: JSON.parse(customizationRow.formFieldsJson)
    };
    await hydrateAndResolveCustomization(db, parsedCustomization, locale);

    customizationSnapshot = {
      values,
      design: buildDesignFromForm({ template, values }),
      templateSnapshot: {
        layers: parsedCustomization.layers as CustomizationTemplate["layers"],
        formFields: parsedCustomization.formFields as CustomizationFormField[],
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
    thumbnail: backgroundSnapshot?.previewUrl ?? null,
  };

  const variantSnapshot = {
    id: variant.id,
    title: variant.title,
    sku: variant.sku,
    priceAmount: variant.priceAmount,
    misaProductCode: variant.misaProductCode ?? String(variant.id),
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

function paymentReferenceForOrderId(orderId: number) {
  return `PT-${orderId}`;
}

function toBase64Url(value: string) {
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return atob(padded);
}

function bytesToBase64Url(bytes: Uint8Array) {
  return toBase64Url(String.fromCharCode(...bytes));
}

function base64UrlToBytes(value: string) {
  return Uint8Array.from(fromBase64Url(value), (character) => character.charCodeAt(0));
}

async function signCheckoutAccessToken(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(`trophy-checkout-access:${secret}`),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function createCheckoutAccessToken(
  bindings: AppEnv["Bindings"] | undefined,
  orderNumber: string,
  now = Date.now(),
) {
  const payload = toBase64Url(JSON.stringify({ orderNumber, expiresAt: now + CHECKOUT_ACCESS_TTL_MS }));
  const signature = await signCheckoutAccessToken(payload, bindings?.BETTER_AUTH_SECRET ?? LOCAL_CHECKOUT_ACCESS_SECRET);
  return { token: `${payload}.${signature}`, expiresAt: new Date(now + CHECKOUT_ACCESS_TTL_MS) };
}

async function verifyCheckoutAccessToken(
  bindings: AppEnv["Bindings"] | undefined,
  orderNumber: string,
  token: string,
) {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;

  let claims: { orderNumber?: unknown; expiresAt?: unknown };
  try {
    claims = JSON.parse(fromBase64Url(payload)) as { orderNumber?: unknown; expiresAt?: unknown };
  } catch {
    return false;
  }
  if (
    claims.orderNumber !== orderNumber ||
    typeof claims.expiresAt !== "number" ||
    !Number.isInteger(claims.expiresAt) ||
    claims.expiresAt < Date.now()
  ) return false;

  let expected: Uint8Array;
  let received: Uint8Array;
  try {
    expected = base64UrlToBytes(await signCheckoutAccessToken(
      payload,
      bindings?.BETTER_AUTH_SECRET ?? LOCAL_CHECKOUT_ACCESS_SECRET,
    ));
    received = base64UrlToBytes(signature);
  } catch {
    return false;
  }
  if (expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) difference |= expected[index]! ^ received[index]!;
  return difference === 0;
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
  const vat = parseVatDetails(order.vatDetailsJson);

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
      notes: order.notes,
      vat,
      items: items.map((item) => {
        const productSnapshot = parseProductSnapshot(item.productSnapshotJson);
        const variantSnapshot = parseVariantSnapshot(item.variantSnapshotJson);
        const backgroundSnapshot = parseBackgroundSnapshot(item.backgroundSnapshotJson);
        const customizationSnapshot = parseCustomizationSnapshot(item.customizationSnapshotJson);
        const customizationPreview = customizationSnapshot
          ? {
              values: customizationSnapshot.values,
              template: {
                id: `order_item_${item.id}`,
                productId: String(productSnapshot?.id ?? item.productId),
                name: productSnapshot?.title ?? "Purchased product",
                revision: 1,
                status: "published" as const,
                background: backgroundSnapshot
                  ? {
                      ...backgroundSnapshot,
                      widthPx: backgroundSnapshot.widthPx ?? customizationSnapshot.templateSnapshot.canvasWidthPx ?? 900,
                      heightPx: backgroundSnapshot.heightPx ?? customizationSnapshot.templateSnapshot.canvasHeightPx ?? 900,
                    }
                  : null,
                layers: customizationSnapshot.templateSnapshot.layers,
                formFields: customizationSnapshot.templateSnapshot.formFields,
              },
            }
          : null;

        return {
          quantity: item.quantity,
          unitPriceAmount: item.unitPriceAmount,
          lineSubtotalAmount: item.lineSubtotalAmount,
          productTitle: productSnapshot?.title ?? "Unknown product",
          productHandle: productSnapshot?.handle ?? null,
          previewImageUrl: productSnapshot?.thumbnail ?? backgroundSnapshot?.previewUrl ?? null,
          customizationPreview,
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
        const product = await lookupPublishedProduct(db, item.productId, input.locale as "vi"|"en");
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
        const thumbnailAssetId = await lookupProductThumbnailAssetId(db, item.productId);
        const thumbnail = thumbnailAssetId
          ? toAbsoluteAssetUrl(c, `/api/assets/products/${thumbnailAssetId}/content`) as string
          : null;

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
              thumbnail,
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
            thumbnail,
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
  .get("/payment-instructions", async (c) => {
    const parsed = v.safeParse(paymentInstructionsQuerySchema, {
      orderNumber: c.req.query("orderNumber"),
      accessToken: c.req.query("accessToken"),
    });
    if (!parsed.success) return jsonError(c, 400, "Invalid payment instruction access");
    if (!await verifyCheckoutAccessToken(c.env, parsed.output.orderNumber, parsed.output.accessToken)) {
      return jsonError(c, 404, "Payment instructions not found");
    }

    const order = await getDb(c.env).select().from(orders)
      .where(eq(orders.orderNumber, parsed.output.orderNumber)).get();
    if (!order) return jsonError(c, 404, "Payment instructions not found");

    return c.json({
      order: {
        orderNumber: order.orderNumber,
        paymentReference: paymentReferenceForOrderId(order.id),
        totalAmount: order.totalAmount,
        currencyCode: order.currencyCode,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        createdAt: order.createdAt.toISOString(),
      },
    }, 200);
  })
  .post("/", async (c) => {
    const parsed = await parseJson(c, createOrderSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const input: CreateOrderInput = parsed.output;
    if (input.vatRequested && !input.vat) {
      return jsonError(c, 422, "VAT details are required when requesting a VAT invoice");
    }
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
      const result = await validateAndBuildItemSnapshot(c, db, item, input.locale as "vi"|"en");
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
    const now = Date.now();

    const primaryAddressJson = JSON.stringify(input.shipping.primaryAddress);
    const shippingAddressJson =
      input.shipping.shipToDifferentAddress && input.shipping.differentAddress
        ? JSON.stringify({
            ...input.shipping.differentAddress,
            recipientPhone: normalizePhoneForLookup(input.shipping.differentAddress.recipientPhone),
          })
        : null;

    if (isMisaConfigured(c.env) && input.vat?.taxId) {
      try {
        await validateMisaCheckoutCustomer(c.env, {
          order: {
            customerName: input.customer.name,
            customerPhone: normalizedCustomerPhone,
            customerEmail: input.customer.email ?? null,
            primaryAddressJson,
            shippingAddressJson,
            vatDetailsJson: JSON.stringify(input.vat),
          },
        });
      } catch (error) {
        if (error instanceof MisaRequestError && error.resource === "/Customers" &&
          misaVatField(error) && !isDuplicateMisaTaxCode(error)) {
          return c.json({ error: error.message, field: misaVatField(error) }, 422);
        }
      }
    }

    const [insertedOrder] = await db
      .insert(orders)
      .values({
        // `orderNumber` is non-nullable, but the final increment number exists
        // only after SQLite assigns the row ID. This value never leaves the request.
        orderNumber: `creating-${crypto.randomUUID()}`,
        status: "pending" satisfies OrderStatus,
        paymentStatus: "pending" satisfies PaymentStatus,
        fulfillmentStatus: "unfulfilled" satisfies FulfillmentStatus,
        paymentMethod: input.payment.method satisfies PaymentMethod,
        customerName: input.customer.name,
        customerPhone: normalizedCustomerPhone,
        customerEmail: input.customer.email ?? null,
        notes: input.notes || null,
        vatDetailsJson: input.vat ? JSON.stringify(input.vat) : null,
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

    const orderNumber = String(insertedOrder.id);
    await db
      .update(orders)
      .set({ orderNumber })
      .where(eq(orders.id, insertedOrder.id));

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

    if (isMisaConfigured(c.env)) {
      try {
        const synced = await syncMisaOrder(c.env, insertedOrder.id);
        await db.update(orders).set({
          misaSyncStatus: "synced",
          misaSaleOrderId: synced.saleOrderId,
          misaSaleOrderNo: synced.saleOrderNumber,
          misaLastError: null,
          misaAttemptCount: 1,
          misaSyncedAt: new Date(),
        }).where(eq(orders.id, insertedOrder.id));
      } catch (error) {
        await db.update(orders).set({
          misaSyncStatus: "failed",
          misaLastError: error instanceof Error ? error.message : "MISA order synchronization failed",
          misaAttemptCount: 1,
        }).where(eq(orders.id, insertedOrder.id));
      }
    }

    const checkoutAccess = await createCheckoutAccessToken(c.env, orderNumber);
    return c.json(
      {
        order: {
          id: insertedOrder.id,
          orderNumber,
          paymentReference: paymentReferenceForOrderId(insertedOrder.id),
          status: "pending" satisfies OrderStatus,
          paymentStatus: "pending" satisfies PaymentStatus,
          fulfillmentStatus: "unfulfilled" satisfies FulfillmentStatus,
          totalAmount,
          currencyCode: "VND",
          itemCount,
          createdAt: new Date(now).toISOString(),
          checkoutAccessToken: checkoutAccess.token,
          checkoutAccessExpiresAt: checkoutAccess.expiresAt.toISOString(),
        },
      },
      201,
    );
  });
