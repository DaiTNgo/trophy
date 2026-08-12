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
  usage_unit: "Cái";
  product_properties: "Hàng hóa";
  form_layout: "Mẫu tiêu chuẩn";
};

export type MisaContactPayload = {
  form_layout: "Mẫu tiêu chuẩn";
  contact_code: string;
  contact_name: string;
  account_name: string;
  mobile: string;
  email?: string;
};

export type MisaContact = {
  id: string | null;
  contact_code: string;
  contact_name: string;
  account_name: string | null;
  email: string | null;
  mobile: string | null;
};

export type MisaSaleOrder = {
  id: string | null;
  sale_order_no: string;
};

export type MisaSaleOrderPayload = {
  sale_order_no: string;
  sale_order_name: string;
  account_name: string;
  contact_name: string;
  phone: string;
  total_summary: string;
  sale_order_amount: number;
  description: string;
  form_layout: "Mẫu tiêu chuẩn";
  billing_address?: string;
  billing_country?: string;
  billing_province?: string;
  billing_street?: string;
  billing_code?: string;
  shipping_address?: string;
  shipping_country?: string;
  shipping_province?: string;
  shipping_street?: string;
  shipping_code?: string;
  sale_order_product_mappings: Array<{
    product_code: string;
    amount: number;
    price: string;
    to_currency: number;
    description?: string;
  }>;
};

export type MisaCustomerPayload = {
  form_layout: "Mẫu tiêu chuẩn";
  account_number: string;
  account_name: string;
  is_personal: true;
  office_tel: string;
  office_email?: string;
  billing_address?: string;
  billing_country?: string;
  billing_province?: string;
  billing_street?: string;
  billing_code?: string;
  shipping_address?: string;
  shipping_country?: string;
  shipping_province?: string;
  shipping_street?: string;
  shipping_code?: string;
};

export type MisaCustomer = {
  id: string | null;
  account_number: string;
  account_name: string;
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

export class MisaRequestError extends Error {
  readonly status: number;
  readonly method: string;
  readonly resource: string;

  constructor(
    message: string,
    status: number,
    { method = 'GET', resource = '' }: { method?: string; resource?: string } = {},
  ) {
    super(message);
    this.name = "MisaRequestError";
    this.status = status;
    this.method = method;
    this.resource = resource;
  }
}

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
  if (typeof value === "string" || typeof value === "number") return String(value);
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
        const validation = asRecord(info);
        const message = validation?.error_message ?? validation?.ErrorMessage;
        const fieldName = validation?.field_name ?? validation?.FieldName;
        if (typeof message === "string" && message) {
          return typeof fieldName === "string" && fieldName
            ? `${fieldName}: ${message}`
            : message;
        }
      }
    }
  }
  return `MISA request failed with HTTP ${status}`;
}

async function readResponse(response: Response, request: { method: string; resource: string }): Promise<MisaResponse> {
  const payload = await response.json().catch(() => ({})) as MisaResponse;
  const failedResult = Array.isArray(payload.results)
    ? payload.results.find((item) => asRecord(item)?.success === false)
    : null;
  const failed = !response.ok || payload.success === false ||
    (payload.code !== undefined && ![0, 200].includes(Number(payload.code))) || Boolean(failedResult);
  if (failed) throw new MisaRequestError(responseError(payload, response.status), response.status, request);
  return payload;
}

async function requestToken(config: NonNullable<ReturnType<typeof getConfig>>) {
  const response = await fetch(config.baseUrl + "/Account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret }),
  });
  const payload = await readResponse(response, { method: 'POST', resource: '/Account' });
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
  try {
    return await readResponse(response, { method: init.method ?? 'GET', resource });
  } catch (error) {
    if (error instanceof MisaRequestError) {
      console.error("MISA request rejected", {
        method: error.method,
        resource: error.resource,
        status: error.status,
        message: error.message,
      });
    }
    throw error;
  }
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

function normalizeContact(value: unknown): MisaContact | null {
  const record = asRecord(value);
  if (!record || typeof record.contact_code !== "string" || !record.contact_code.trim()) return null;
  const id = record.id ?? record.ID;
  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : null,
    contact_code: record.contact_code,
    contact_name: typeof record.contact_name === "string" ? record.contact_name : record.contact_code,
    account_name: typeof record.account_name === "string" ? record.account_name : null,
    email: typeof record.email === "string" ? record.email : null,
    mobile: typeof record.mobile === "string" ? record.mobile : null,
  };
}

function normalizeCustomer(value: unknown): MisaCustomer | null {
  const record = asRecord(value);
  if (!record || typeof record.account_number !== "string" || !record.account_number.trim()) return null;
  const id = record.id ?? record.ID;
  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : null,
    account_number: record.account_number,
    account_name: typeof record.account_name === "string" ? record.account_name : record.account_number,
  };
}

function normalizeSaleOrder(value: unknown): MisaSaleOrder | null {
  const record = asRecord(value);
  if (!record || typeof record.sale_order_no !== "string" || !record.sale_order_no.trim()) return null;
  const id = record.id ?? record.ID;
  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : null,
    sale_order_no: record.sale_order_no,
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

export async function findMisaContactsByCodes(bindings: AppBindings, codes: string[]) {
  if (codes.length === 0) return [];
  const params = new URLSearchParams();
  for (const code of codes) params.append("code", code);
  const payload = await misaFetch(bindings, "/Contacts/code?" + params.toString());
  return Array.isArray(payload.data)
    ? payload.data.map(normalizeContact).filter((item): item is MisaContact => item !== null)
    : [];
}

export async function findMisaCustomersByCodes(bindings: AppBindings, codes: string[]) {
  if (codes.length === 0) return [];
  const params = new URLSearchParams();
  for (const code of codes) params.append("code", code);
  const payload = await misaFetch(bindings, "/Customers/code?" + params.toString());
  return Array.isArray(payload.data)
    ? payload.data.map(normalizeCustomer).filter((item): item is MisaCustomer => item !== null)
    : [];
}

export async function findMisaSaleOrdersByCodes(bindings: AppBindings, codes: string[]) {
  if (codes.length === 0) return [];
  const params = new URLSearchParams();
  for (const code of codes) params.append("code", code);
  const payload = await misaFetch(bindings, "/SaleOrders/code?" + params.toString());
  return Array.isArray(payload.data)
    ? payload.data.map(normalizeSaleOrder).filter((item): item is MisaSaleOrder => item !== null)
    : [];
}

export async function checkMisaSaleOrderById(bindings: AppBindings, saleOrderId: string) {
  const params = new URLSearchParams({ ids: saleOrderId });
  const payload = await misaFetch(bindings, "/SaleOrders/id?" + params.toString());
  const values = Array.isArray(payload.data) ? payload.data : payload.data ? [payload.data] : [];
  return {
    found: values.some((value) => extractId(value) === saleOrderId),
    responseHadData: payload.data !== undefined,
  };
}

async function fetchMisaContactsPage(bindings: AppBindings, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: "100",
    orderBy: "modified_date",
    isDescending: "true",
  });
  const payload = await misaFetch(bindings, "/Contacts?" + params.toString());
  const items = Array.isArray(payload.data)
    ? payload.data.map(normalizeContact).filter((item): item is MisaContact => item !== null)
    : [];
  return { items, totalRecords: payload.total_records ?? items.length };
}

async function findMisaContactsByEmail(bindings: AppBindings, email: string) {
  const normalizedEmail = email.trim().toLocaleLowerCase();
  if (!normalizedEmail) return [];

  for (let page = 0; ; page += 1) {
    const result = await fetchMisaContactsPage(bindings, page);
    const matches = result.items.filter((item) => item.email?.trim().toLocaleLowerCase() === normalizedEmail);
    if (matches.length > 0 || result.items.length === 0 || (page + 1) * 100 >= result.totalRecords) {
      return matches;
    }
  }
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

/** Deletes SaleOrders only. Contacts are deliberately retained in MISA. */
export async function deleteMisaSaleOrders(bindings: AppBindings, ids: number[]) {
  if (ids.length === 0) return null;
  return misaFetch(bindings, "/SaleOrders", { method: "DELETE", body: JSON.stringify(ids) });
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

function compactText(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part)).join(", ");
}

function formatOrderAddress(address: ReturnType<typeof parseOrderAddress>) {
  if (!address) return null;
  return compactText([
    address.line1,
    address.line2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]);
}

type MisaAddressFields = {
  address?: string;
  country?: string;
  province?: string;
  street?: string;
  code?: string;
};

function buildMisaAddressFields(address: ReturnType<typeof parseOrderAddress>): MisaAddressFields {
  const addressText = formatOrderAddress(address);
  if (!address || !addressText) return {};
  return {
    address: addressText,
    ...(address.country ? { country: address.country } : {}),
    ...(address.province ?? address.city ? { province: address.province ?? address.city } : {}),
    ...(address.line1 ? { street: address.line1 } : {}),
    ...(address.postalCode ? { code: address.postalCode } : {}),
  };
}

function prefixMisaAddressFields(prefix: "billing" | "shipping", fields: MisaAddressFields) {
  return {
    ...(fields.address ? { [`${prefix}_address`]: fields.address } : {}),
    ...(fields.country ? { [`${prefix}_country`]: fields.country } : {}),
    ...(fields.province ? { [`${prefix}_province`]: fields.province } : {}),
    ...(fields.street ? { [`${prefix}_street`]: fields.street } : {}),
    ...(fields.code ? { [`${prefix}_code`]: fields.code } : {}),
  };
}

function buildMisaOrderDescription(source: MisaOrderSource) {
  const note = source.order.notes?.trim() || "Trophy checkout order";
  const vat = parseVatDetails(source.order.vatDetailsJson);
  const billingAddress = parseOrderAddress(source.order.primaryAddressJson);
  const differentShippingAddress = parseDifferentShippingAddress(source.order.shippingAddressJson);
  const shippingAddress = differentShippingAddress?.address ?? billingAddress;
  const paymentReference = Number.isInteger(source.order.id) && source.order.id > 0
    ? `MA THANH TOAN: PT-${source.order.id}`
    : null;
  const addressLines = [
    formatOrderAddress(billingAddress) ? `DIA CHI THANH TOAN\n${formatOrderAddress(billingAddress)}` : null,
    formatOrderAddress(shippingAddress) ? `DIA CHI GIAO HANG\n${formatOrderAddress(shippingAddress)}` : null,
  ].filter((value): value is string => Boolean(value));
  if (!vat || !Object.values(vat).some(Boolean)) {
    return [paymentReference, ...addressLines, `GHI CHU KHACH\n${note}`].filter(Boolean).join("\n\n");
  }

  const vatLines = [
    "YEU CAU XUAT HOA DON",
    ...(vat.type ? [`Loai: ${vat.type}`] : []),
    ...(vat.name ? [`Don vi: ${vat.name}`] : []),
    ...(vat.taxId ? [`MST: ${vat.taxId}`] : []),
    ...(vat.email ? [`Email hoa don: ${vat.email}`] : []),
    ...(vat.address ? [`Dia chi hoa don: ${vat.address}`] : []),
  ];
  return [paymentReference, ...addressLines, vatLines.join("\n"), `GHI CHU KHACH\n${note}`].filter(Boolean).join("\n\n");
}

export function buildMisaCreateProductsPayload(source: { title: unknown; variants: Array<{ id: number; title: unknown; misaProductCode?: string | null }> }) {
  const title = localized(source.title);
  return source.variants.map((variant) => {
    const name = [title, localized(variant.title)].filter(Boolean).join(" - ");
    if (!name) throw new Error("Every variant needs a product name before publishing to MISA");
    return {
      product_code: variant.misaProductCode ?? String(variant.id),
      product_name: name,
      inactive: false,
      usage_unit: "Cái",
      product_properties: "Hàng hóa",
      form_layout: "Mẫu tiêu chuẩn",
    } satisfies MisaProductPayload;
  });
}

export function buildMisaCustomerPayload(source: MisaOrderSource): MisaCustomerPayload {
  const phone = normalizePhoneForLookup(source.order.customerPhone);
  const billingAddress = parseOrderAddress(source.order.primaryAddressJson);
  const differentShippingAddress = parseDifferentShippingAddress(source.order.shippingAddressJson);
  const shippingAddress = differentShippingAddress?.address ?? billingAddress;
  return {
    form_layout: "Mẫu tiêu chuẩn",
    account_number: `TROPHY-${phone}`,
    account_name: source.order.customerName,
    is_personal: true,
    office_tel: phone,
    ...(source.order.customerEmail ? { office_email: source.order.customerEmail.trim() } : {}),
    ...prefixMisaAddressFields("billing", buildMisaAddressFields(billingAddress)),
    ...prefixMisaAddressFields("shipping", buildMisaAddressFields(shippingAddress)),
  };
}

export function buildMisaContactPayload(source: MisaOrderSource, accountCode: string, includeEmail = true): MisaContactPayload {
  const phone = normalizePhoneForLookup(source.order.customerPhone);
  return {
    form_layout: "Mẫu tiêu chuẩn",
    contact_code: `TROPHY-${phone}`,
    contact_name: source.order.customerName,
    account_name: accountCode,
    mobile: phone,
    ...(includeEmail && source.order.customerEmail ? { email: source.order.customerEmail.trim() } : {}),
  };
}

export function buildMisaSaleOrderPayload(
  source: MisaOrderSource,
  accountCode?: string,
  contactCode?: string,
  saleOrderNumber = source.order.orderNumber,
): MisaSaleOrderPayload {
  const billingAddress = parseOrderAddress(source.order.primaryAddressJson);
  const differentShippingAddress = parseDifferentShippingAddress(source.order.shippingAddressJson);
  const shippingAddress = differentShippingAddress?.address ?? billingAddress;
  const mappings = source.items.map((item) => {
    const variant = parseVariantSnapshot(item.variantSnapshotJson);
    if (!variant || !Number.isInteger(variant.id) || variant.id <= 0) {
      throw new Error(`Order ${source.order.orderNumber} item ${item.id} has no variant ID for MISA`);
    }
    return {
      product_code: variant.misaProductCode ?? String(variant.id),
      amount: item.quantity,
      price: String(item.unitPriceAmount),
      to_currency: item.lineSubtotalAmount,
      description: variant.title,
    };
  });
  return {
    sale_order_no: `PT-${saleOrderNumber}`,
    sale_order_name: `Trophy order ${saleOrderNumber}`,
    account_name: accountCode ?? `TROPHY-${normalizePhoneForLookup(source.order.customerPhone)}`,
    contact_name: contactCode ?? `TROPHY-${normalizePhoneForLookup(source.order.customerPhone)}`,
    phone: normalizePhoneForLookup(source.order.customerPhone),
    total_summary: String(source.order.totalAmount),
    sale_order_amount: source.order.totalAmount,
    description: buildMisaOrderDescription(source),
    form_layout: "Mẫu tiêu chuẩn",
    ...prefixMisaAddressFields("billing", buildMisaAddressFields(billingAddress)),
    ...prefixMisaAddressFields("shipping", buildMisaAddressFields(shippingAddress)),
    sale_order_product_mappings: mappings,
  };
}

function isDuplicateSaleOrderError(error: unknown) {
  if (!(error instanceof MisaRequestError)) return false;
  return /trùng|duplicate|sale_order_no/i.test(error.message);
}

async function ensureMisaCustomer(bindings: AppBindings, source: MisaOrderSource) {
  const customer = buildMisaCustomerPayload(source);
  const existing = await findMisaCustomersByCodes(bindings, [customer.account_number]);
  const existingCustomer = existing.find((item) => item.account_number === customer.account_number);
  if (!existingCustomer) {
    await misaFetch(bindings, "/Customers", { method: "POST", body: JSON.stringify([customer]) });
  }
  return { customerCode: existingCustomer?.account_number ?? customer.account_number };
}

async function ensureMisaContact(bindings: AppBindings, source: MisaOrderSource, accountCode: string) {
  const contact = buildMisaContactPayload(source, accountCode);
  const existingContacts = await findMisaContactsByCodes(bindings, [contact.contact_code]);
  const existingByCode = existingContacts.find((item) => item.contact_code === contact.contact_code);
  const existingByEmail = !existingByCode && contact.email
    ? (await findMisaContactsByEmail(bindings, contact.email))[0]
    : undefined;
  const matchedEmailHasDifferentPhone = existingByEmail?.mobile &&
    normalizePhoneForLookup(existingByEmail.mobile) !== normalizePhoneForLookup(contact.mobile);
  const existingContact = existingByCode ?? (matchedEmailHasDifferentPhone ? undefined : existingByEmail);
  const contactToCreate = matchedEmailHasDifferentPhone
    ? buildMisaContactPayload(source, accountCode, false)
    : contact;
  const contactResponse = existingContact
    ? null
    : await misaFetch(bindings, "/Contacts", { method: "POST", body: JSON.stringify([contactToCreate]) });
  if (existingContact && existingContact.account_name !== accountCode) {
    await misaFetch(bindings, "/Contacts", {
      method: "PUT",
      body: JSON.stringify([{ ...contact, contact_code: existingContact.contact_code }]),
    });
  }
  return {
    contactId: existingContact?.id ?? (contactResponse ? extractId(contactResponse) : null),
    contactCode: existingContact?.contact_code ?? contactToCreate.contact_code,
  };
}

async function createMisaSaleOrder(
  bindings: AppBindings,
  source: MisaOrderSource,
  accountCode: string,
  contactCode: string,
  saleOrderNumber: string,
) {
  const saleOrder = buildMisaSaleOrderPayload(source, accountCode, contactCode, saleOrderNumber);

  const response = await misaFetch(bindings, "/SaleOrders", {
    method: "POST",
    body: JSON.stringify([saleOrder]),
  });

  const saleOrderId = extractId(response);
  if (!saleOrderId) throw new Error("MISA SaleOrder create response did not contain an ID");

  return { saleOrderId, saleOrderNumber };
}

export async function syncMisaOrder(bindings: AppBindings, orderId: number) {
  const db = getDb(bindings);
  const order = await db.select().from(orders).where(eq(orders.id, orderId)).get();
  if (!order) throw new Error("Order not found");
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const source = { order, items } satisfies MisaOrderSource;
  const originalNumber = order.orderNumber;
  const linkedNumber = order.misaSaleOrderNo ?? originalNumber;
  const existing = (await findMisaSaleOrdersByCodes(bindings, [...new Set([linkedNumber, originalNumber])]))
    .find((saleOrder) => saleOrder.sale_order_no === linkedNumber)
    ?? (linkedNumber !== originalNumber
      ? (await findMisaSaleOrdersByCodes(bindings, [originalNumber]))
        .find((saleOrder) => saleOrder.sale_order_no === originalNumber)
      : undefined);
  if (existing) {
    if (!existing.id) throw new Error("MISA SaleOrder lookup did not contain an ID");
    return {
      contactId: order.misaContactId,
      saleOrderId: existing.id,
      saleOrderNumber: existing.sale_order_no,
    };
  }

  const customer = await ensureMisaCustomer(bindings, source);
  const contact = await ensureMisaContact(bindings, source, customer.customerCode);
  try {
    return { contactId: contact.contactId, ...await createMisaSaleOrder(bindings, source, customer.customerCode, contact.contactCode, originalNumber) };
  } catch (error) {
    console.error("MISA SaleOrder synchronization failed", {
      orderId,
      orderNumber: originalNumber,
      productCodes: source.items.map((item) => parseVariantSnapshot(item.variantSnapshotJson)?.misaProductCode ?? parseVariantSnapshot(item.variantSnapshotJson)?.id),
      message: error instanceof Error ? error.message : "Unknown error",
    });
    if (!isDuplicateSaleOrderError(error)) throw error;
  }

  const afterDuplicate = (await findMisaSaleOrdersByCodes(bindings, [originalNumber]))
    .find((saleOrder) => saleOrder.sale_order_no === originalNumber);
  if (afterDuplicate) {
    if (!afterDuplicate.id) throw new Error("MISA SaleOrder lookup did not contain an ID");
    return {
      contactId: contact.contactId,
      saleOrderId: afterDuplicate.id,
      saleOrderNumber: afterDuplicate.sale_order_no,
    };
  }

  for (let revision = 2; revision <= 99; revision += 1) {
    const saleOrderNumber = `${originalNumber}-R${revision}`;
    try {
      return { contactId: contact.contactId, ...await createMisaSaleOrder(bindings, source, customer.customerCode, contact.contactCode, saleOrderNumber) };
    } catch (error) {
      if (!isDuplicateSaleOrderError(error)) throw error;
    }
  }

  throw new Error("MISA SaleOrder revision limit reached");
}
