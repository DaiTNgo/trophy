import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { orderItems, orders } from "../db/schema";
import type { AppBindings } from "./env";
import {
  normalizePhoneForLookup,
  parseDifferentShippingAddress,
  parseOrderAddress,
  parseVariantSnapshot,
  parseVatDetails,
} from "./order-utils";

const DEFAULT_MISA_API_BASE_URL = "https://crmconnect.misa.vn/api/v2";

export type MisaProduct = {
  id: string | null;
  product_code: string;
  product_name: string;
  product_category: string | null;
  usage_unit: string | null;
  unit_price: string | null;
  inactive: boolean;
};

export type MisaProductPayload = {
  id?: number;
  product_code: string;
  product_name: string;
  inactive: boolean;
};

export type MisaContactPayload = {
  contact_code: string;
  contact_name: string;
  mobile: string;
  email?: string;
  lead_source: string;
  shipping_country?: string;
  shipping_province?: string;
  shipping_address?: string;
};

export type MisaSaleOrderPayload = {
  sale_order_no: string;
  sale_order_name: string;
  contact_name: string;
  phone: string;
  total_summary: string;
  sale_order_amount: number;
  shipping_contact_name: string;
  shipping_address?: string;
  shipping_province?: string;
  shipping_country?: string;
  description: string;
  billing_contact?: string;
  billing_address?: string;
  billing_email?: string;
  tax_code?: string;
  sale_order_product_mappings: Array<{
    product_code: string;
    amount: number;
    price: string;
    to_currency: number;
    description?: string;
  }>;
};

type MisaResponse = {
  success?: boolean;
  code?: number | string;
  data?: unknown;
  results?: unknown;
  total_records?: number;
  error_message?: string | null;
  ErrorMessage?: string | null;
};

type MisaOrderSource = {
  order: typeof orders.$inferSelect;
  items: Array<typeof orderItems.$inferSelect>;
};

function getConfig(bindings?: AppBindings) {
  if (!bindings?.MISA_CLIENT_ID || !bindings.MISA_CLIENT_SECRET) return null;
  return {
    baseUrl: (bindings.MISA_API_BASE_URL ?? DEFAULT_MISA_API_BASE_URL).replace(/\/$/, ""),
    clientId: bindings.MISA_CLIENT_ID,
    clientSecret: bindings.MISA_CLIENT_SECRET,
  };
}

export function isMisaConfigured(bindings: AppBindings) {
  return getConfig(bindings) !== null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function extractId(value: unknown): string | null {
  const record = asRecord(value);
  if (!record) return null;
  for (const key of ["id", "ID", "record_id", "recordId"]) {
    const candidate = record[key];
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
  }
  for (const key of ["data", "results"]) {
    const nested = record[key];
    const values = Array.isArray(nested) ? nested : [nested];
    for (const value of values) {
      const id = extractId(value);
      if (id) return id;
    }
  }
  return null;
}

function responseError(payload: MisaResponse, status: number) {
  if (payload.error_message || payload.ErrorMessage) {
    return payload.error_message ?? payload.ErrorMessage ?? `MISA request failed with HTTP ${status}`;
  }
  if (Array.isArray(payload.results)) {
    for (const result of payload.results) {
      const record = asRecord(result);
      const infos = record?.validate_infos ?? record?.validate_result;
      if (!Array.isArray(infos)) continue;
      for (const info of infos) {
        const message = asRecord(info)?.error_message ?? asRecord(info)?.ErrorMessage;
        if (typeof message === "string" && message) return message;
      }
    }
  }
  return `MISA request failed with HTTP ${status}`;
}

async function readResponse(response: Response): Promise<MisaResponse> {
  const payload = await response.json().catch(() => ({})) as MisaResponse;
  const failedResult = Array.isArray(payload.results)
    ? payload.results.find((item) => asRecord(item)?.success === false)
    : null;
  const failed = !response.ok || payload.success === false ||
    (payload.code !== undefined && ![0, 200].includes(Number(payload.code))) || Boolean(failedResult);
  if (failed) throw new Error(responseError(payload, response.status));
  return payload;
}

async function requestToken(config: NonNullable<ReturnType<typeof getConfig>>) {
  const response = await fetch(config.baseUrl + "/Account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret }),
  });
  const payload = await readResponse(response);
  if (typeof payload.data !== "string" || !payload.data) throw new Error("MISA token response did not contain a token");
  return payload.data;
}

async function misaFetch(
  bindings: AppBindings,
  resource: string,
  init: RequestInit = {},
) {
  const config = getConfig(bindings);
  if (!config) throw new Error("MISA integration is not configured");
  const token = await requestToken(config);
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Clientid", config.clientId);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(config.baseUrl + resource, { ...init, headers });
  return readResponse(response);
}

function normalizeProduct(value: unknown): MisaProduct | null {
  const record = asRecord(value);
  if (!record || typeof record.product_code !== "string" || !record.product_code.trim()) return null;
  const id = record.id ?? record.ID;
  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : null,
    product_code: record.product_code,
    product_name: typeof record.product_name === "string" ? record.product_name : record.product_code,
    product_category: typeof record.product_category === "string" ? record.product_category : null,
    usage_unit: typeof record.usage_unit === "string" ? record.usage_unit : null,
    unit_price: typeof record.unit_price === "number" || typeof record.unit_price === "string" ? String(record.unit_price) : null,
    inactive: record.inactive === true,
  };
}

export async function findMisaProductsByCodes(bindings: AppBindings, codes: string[]) {
  if (codes.length === 0) return [];
  const params = new URLSearchParams();
  for (const code of codes) params.append("code", code);
  const payload = await misaFetch(bindings, "/Products/code?" + params.toString());
  return Array.isArray(payload.data)
    ? payload.data.map(normalizeProduct).filter((item): item is MisaProduct => item !== null)
    : [];
}

export async function fetchMisaProducts(bindings: AppBindings, options: { query?: string; page?: number; pageSize?: number } = {}) {
  const page = Math.max(0, options.page ?? 0);
  const pageSize = Math.min(100, Math.max(1, options.pageSize ?? 100));
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), orderBy: "modified_date", isDescending: "true" });
  const payload = await misaFetch(bindings, "/Products?" + params.toString());
  const items = Array.isArray(payload.data)
    ? payload.data.map(normalizeProduct).filter((item): item is MisaProduct => item !== null)
    : [];
  const query = options.query?.trim().toLocaleLowerCase();
  const filtered = query ? items.filter((item) => [item.product_code, item.product_name, item.product_category].filter(Boolean).some((value) => value!.toLocaleLowerCase().includes(query))) : items;
  return { items: filtered, page, pageSize, totalRecords: payload.total_records ?? filtered.length };
}

export async function createMisaProducts(bindings: AppBindings, products: MisaProductPayload[]) {
  if (products.length === 0) return { created: [], existing: [] };
  const unique = Array.from(new Map(products.map((product) => [product.product_code, product])).values());
  const existing = await findMisaProductsByCodes(bindings, unique.map((product) => product.product_code));
  const existingCodes = new Set(existing.map((product) => product.product_code));
  const pending = unique.filter((product) => !existingCodes.has(product.product_code));
  if (pending.length === 0) return { created: [], existing };
  const response = await misaFetch(bindings, "/Products", { method: "POST", body: JSON.stringify(pending) });
  return { created: pending, existing, response };
}

export async function updateMisaProducts(bindings: AppBindings, products: MisaProductPayload[]) {
  return misaFetch(bindings, "/Products", { method: "PUT", body: JSON.stringify(products) });
}

export async function deleteMisaProducts(bindings: AppBindings, ids: number[]) {
  if (ids.length === 0) return null;
  return misaFetch(bindings, "/Products", { method: "DELETE", body: JSON.stringify(ids) });
}

export async function deleteMisaProductsByCodes(bindings: AppBindings, codes: string[]) {
  const existing = await findMisaProductsByCodes(bindings, codes);
  const ids = existing.map((product) => Number(product.id)).filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length !== existing.length) throw new Error("MISA did not return numeric IDs for all product codes");
  await deleteMisaProducts(bindings, ids);
  return { deleted: existing.map((product) => product.product_code) };
}

function localized(value: unknown) {
  if (typeof value === "string") return value.trim();
  const record = asRecord(value);
  return typeof record?.vi === "string" ? record.vi.trim() : "";
}

export function buildMisaCreateProductsPayload(source: { title: unknown; variants: Array<{ title: unknown; sku: string | null }> }) {
  const title = localized(source.title);
  return source.variants.map((variant) => {
    const code = variant.sku?.trim() ?? "";
    if (!code) throw new Error("Every variant needs an SKU before publishing to MISA");
    const name = [title, localized(variant.title)].filter(Boolean).join(" - ");
    if (!name) throw new Error("Every variant needs a product name before publishing to MISA");
    return { product_code: code, product_name: name, inactive: false } satisfies MisaProductPayload;
  });
}

function fullAddress(address: ReturnType<typeof parseOrderAddress>) {
  if (!address) return undefined;
  return [address.line1, address.line2, address.city, address.province, address.postalCode, address.country].filter(Boolean).join(", ");
}

export function buildMisaContactPayload(source: MisaOrderSource): MisaContactPayload {
  const address = parseOrderAddress(source.order.primaryAddressJson);
  const phone = normalizePhoneForLookup(source.order.customerPhone);
  return {
    contact_code: `TROPHY-${phone}`,
    contact_name: source.order.customerName,
    mobile: phone,
    ...(source.order.customerEmail ? { email: source.order.customerEmail } : {}),
    lead_source: "Trophy Store",
    ...(address?.country ? { shipping_country: address.country } : {}),
    ...(address?.province ? { shipping_province: address.province } : {}),
    ...(fullAddress(address) ? { shipping_address: fullAddress(address) } : {}),
  };
}

export function buildMisaSaleOrderPayload(source: MisaOrderSource): MisaSaleOrderPayload {
  const address = parseOrderAddress(source.order.primaryAddressJson);
  const different = parseDifferentShippingAddress(source.order.shippingAddressJson);
  const vat = parseVatDetails(source.order.vatDetailsJson);
  const delivery = different?.address ?? address;
  const mappings = source.items.map((item) => {
    const variant = parseVariantSnapshot(item.variantSnapshotJson);
    if (!variant?.sku) throw new Error(`Order ${source.order.orderNumber} item ${item.id} has no SKU for MISA`);
    return { product_code: variant.sku, amount: item.quantity, price: String(item.unitPriceAmount), to_currency: 1, description: variant.title };
  });
  return {
    sale_order_no: source.order.orderNumber,
    sale_order_name: `Trophy order ${source.order.orderNumber}`,
    contact_name: `TROPHY-${normalizePhoneForLookup(source.order.customerPhone)}`,
    phone: normalizePhoneForLookup(source.order.customerPhone),
    total_summary: String(source.order.totalAmount),
    sale_order_amount: source.order.totalAmount,
    shipping_contact_name: different?.recipientName ?? source.order.customerName,
    ...(delivery?.country ? { shipping_country: delivery.country } : {}),
    ...(delivery?.province ? { shipping_province: delivery.province } : {}),
    ...(fullAddress(delivery) ? { shipping_address: fullAddress(delivery) } : {}),
    description: source.order.notes ?? "Trophy checkout order",
    ...(vat?.name ? { billing_contact: vat.name } : {}),
    ...(vat?.address ? { billing_address: vat.address } : {}),
    ...(vat?.email ? { billing_email: vat.email } : {}),
    ...(vat?.taxId ? { tax_code: vat.taxId } : {}),
    sale_order_product_mappings: mappings,
  };
}

export async function syncMisaOrder(bindings: AppBindings, orderId: number) {
  const db = getDb(bindings);
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order not found");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const source = { order, items } satisfies MisaOrderSource;
  const contact = buildMisaContactPayload(source);
  const contactResponse = await misaFetch(bindings, "/Contacts", { method: "POST", body: JSON.stringify([contact]) });
  const saleOrder = buildMisaSaleOrderPayload(source);
  const saleOrderResponse = await misaFetch(bindings, "/SaleOrders", { method: "POST", body: JSON.stringify([saleOrder]) });
  return { contactId: extractId(contactResponse), saleOrderId: extractId(saleOrderResponse) };
}
