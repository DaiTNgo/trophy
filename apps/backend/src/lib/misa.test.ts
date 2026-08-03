import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db/client";
import {
  buildMisaCreateProductsPayload,
  buildMisaContactPayload,
  buildMisaSaleOrderPayload,
  createMisaProducts,
  findMisaContactsByCodes,
  isMisaConfigured,
  syncMisaOrder,
  updateMisaProducts,
} from "./misa";

const bindings = {
  MISA_CLIENT_ID: "client-id",
  MISA_CLIENT_SECRET: "client-secret",
  DB: {},
} as never;

afterEach(() => vi.restoreAllMocks());

describe("MISA client", () => {
  it("sends token and Clientid headers when creating a missing product", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 }))
      ;

    await createMisaProducts(bindings, [{ product_code: "1", product_name: "Cup", inactive: false, usage_unit: "Cái", product_properties: "Hàng hóa", form_layout: "Mẫu tiêu chuẩn" }]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Products");
    const init = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer token");
    expect((init.headers as Headers).get("Clientid")).toBe("client-id");
    expect(init.body).toBe(JSON.stringify([{ product_code: "1", product_name: "Cup", inactive: false, usage_unit: "Cái", product_properties: "Hàng hóa", form_layout: "Mẫu tiêu chuẩn" }]));
  });

  it("looks up an existing MISA contact by contact code before creating an order", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 99, contact_code: "TROPHY-090123", contact_name: "Jane" }] }), { status: 200 }));

    await expect(findMisaContactsByCodes(bindings, ["TROPHY-090123"])).resolves.toEqual([
      { id: "99", contact_code: "TROPHY-090123", contact_name: "Jane", email: null, mobile: null },
    ]);

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Contacts/code?code=TROPHY-090123");
    expect((fetchMock.mock.calls[1]?.[1] as RequestInit).method).toBeUndefined();
  });

  it("reuses an existing MISA contact without posting a duplicate during order synchronization", async () => {
    const order = {
      id: 5,
      orderNumber: "ORD-5",
      customerName: "Jane",
      customerPhone: "090-123",
      customerEmail: null,
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 10000,
      notes: null,
      vatDetailsJson: null,
    };
    const items = [{
      id: 1,
      quantity: 2,
      unitPriceAmount: 5000,
      lineSubtotalAmount: 10000,
      variantSnapshotJson: JSON.stringify({ id: 42, title: "Gold", sku: null }),
    }];
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(items).then(resolve, reject),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValueOnce(orderQuery).mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [{ id: 99, contact_code: "TROPHY-090123", contact_name: "Jane" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 123 } }), { status: 200 }));

    await expect(syncMisaOrder(bindings, 5)).resolves.toEqual({ contactId: "99", saleOrderId: "123" });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Contacts/code?code=TROPHY-090123",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
    ]);
  });

  it("creates a phone-based contact without email when the matched MISA email has a different phone", async () => {
    const order = {
      id: 6,
      orderNumber: "ORD-6",
      customerName: "Jane",
      customerPhone: "090-123",
      customerEmail: "jane@example.com",
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 10000,
      notes: null,
      vatDetailsJson: null,
    };
    const items = [{
      id: 1,
      quantity: 2,
      unitPriceAmount: 5000,
      lineSubtotalAmount: 10000,
      variantSnapshotJson: JSON.stringify({ id: 42, title: "Gold", sku: null }),
    }];
    const orderQuery = { from: vi.fn().mockReturnThis(), where: vi.fn().mockReturnThis(), get: vi.fn().mockResolvedValue(order) };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve(items).then(resolve, reject),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi.fn().mockReturnValueOnce(orderQuery).mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ total_records: 1, data: [{ id: 100, contact_code: "MISA-EXISTING", contact_name: "Jane", email: "JANE@example.com", mobile: "090-999" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 101 } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { id: 124 } }), { status: 200 }));

    await expect(syncMisaOrder(bindings, 6)).resolves.toEqual({ contactId: "101", saleOrderId: "124" });

    const contactRequest = fetchMock.mock.calls[5]?.[1] as RequestInit;
    expect(JSON.parse(String(contactRequest.body))).toEqual([{
      form_layout: "Mẫu tiêu chuẩn",
      contact_code: "TROPHY-090123",
      contact_name: "Jane",
      mobile: "090123",
    }]);
    const saleOrderRequest = fetchMock.mock.calls[7]?.[1] as RequestInit;
    expect(JSON.parse(String(saleOrderRequest.body))).toMatchObject([{ contact_name: "TROPHY-090123" }]);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Contacts?page=0&pageSize=100&orderBy=modified_date&isDescending=true");
    expect(fetchMock.mock.calls[5]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Contacts");
  });

  it("surfaces nested MISA validation failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, results: [{ success: false, validate_infos: [{ error_message: "SKU already exists" }] }] }), { status: 200 }));

    await expect(createMisaProducts(bindings, [{ product_code: "1", product_name: "Cup", inactive: false, usage_unit: "Cái", product_properties: "Hàng hóa", form_layout: "Mẫu tiêu chuẩn" }]))
      .rejects.toThrow("SKU already exists");
  });

  it("sends the agreed form when updating a MISA product", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 }));
    const product = { product_code: "42", product_name: "Cup - Gold", inactive: false, usage_unit: "Cái" as const, product_properties: "Hàng hóa" as const, form_layout: "Mẫu tiêu chuẩn" as const };

    await updateMisaProducts(bindings, [product]);

    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Products");
    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify([product]));
  });

  it("builds the agreed variant-ID MISA product form", () => {
    expect(buildMisaCreateProductsPayload({ title: { vi: "Cup" }, variants: [{ id: 42, title: { vi: "Gold" } }] }))
      .toEqual([{ product_code: "42", product_name: "Cup - Gold", inactive: false, usage_unit: "Cái", product_properties: "Hàng hóa", form_layout: "Mẫu tiêu chuẩn" }]);
  });

  it("maps contact and sale order data using Trophy phone and variant ID", () => {
    const source = {
      order: {
        orderNumber: "ORD-1", customerName: "Jane", customerPhone: "090-123", customerEmail: "jane@example.com",
        primaryAddressJson: JSON.stringify({ line1: "1 Main", city: "HCM", country: "VN" }), shippingAddressJson: null,
        totalAmount: 10000, notes: null, vatDetailsJson: null,
      },
      items: [{ id: 1, quantity: 2, unitPriceAmount: 5000, lineSubtotalAmount: 10000, variantSnapshotJson: JSON.stringify({ id: 42, sku: "SKU-1", title: "Gold" }) }],
    } as any;
    expect(buildMisaContactPayload(source)).toEqual({
      form_layout: "Mẫu tiêu chuẩn",
      contact_code: "TROPHY-090123",
      contact_name: "Jane",
      mobile: "090123",
      email: "jane@example.com",
    });
    expect(buildMisaSaleOrderPayload(source)).toEqual({
      sale_order_no: "ORD-1",
      sale_order_name: "Trophy order ORD-1",
      contact_name: "TROPHY-090123",
      phone: "090123",
      sale_order_amount: 10000,
      total_summary: "10000",
      description: "Trophy checkout order",
      form_layout: "Mẫu tiêu chuẩn",
      sale_order_product_mappings: [{ product_code: "42", amount: 2, price: "5000", to_currency: 10000, description: "Gold" }],
    });
    expect(() => buildMisaSaleOrderPayload({ ...source, items: [{ ...source.items[0], variantSnapshotJson: JSON.stringify({ title: "Gold", sku: "SKU-1" }) }] } as never)).toThrow("has no variant ID");
  });

  it("reports missing MISA credentials as unconfigured", () => {
    expect(isMisaConfigured({} as never)).toBe(false);
  });
});
