import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildMisaCreateProductsPayload,
  buildMisaContactPayload,
  buildMisaSaleOrderPayload,
  createMisaProducts,
  isMisaConfigured,
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

    await createMisaProducts(bindings, [{ product_code: "SKU-1", product_name: "Cup", inactive: false }]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3]?.[0]).toBe("https://crmconnect.misa.vn/api/v2/Products");
    const init = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer token");
    expect((init.headers as Headers).get("Clientid")).toBe("client-id");
    expect(init.body).toBe(JSON.stringify([{ product_code: "SKU-1", product_name: "Cup", inactive: false }]));
  });

  it("surfaces nested MISA validation failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 0, results: [{ success: false, validate_infos: [{ error_message: "SKU already exists" }] }] }), { status: 200 }));

    await expect(createMisaProducts(bindings, [{ product_code: "SKU-1", product_name: "Cup", inactive: false }]))
      .rejects.toThrow("SKU already exists");
  });

  it("builds the agreed minimal product payload and rejects missing SKU", () => {
    expect(buildMisaCreateProductsPayload({ title: { vi: "Cup" }, variants: [{ title: { vi: "Gold" }, sku: " SKU-1 " }] }))
      .toEqual([{ product_code: "SKU-1", product_name: "Cup - Gold", inactive: false }]);
    expect(() => buildMisaCreateProductsPayload({ title: "Cup", variants: [{ title: "Gold", sku: null }] })).toThrow("SKU");
  });

  it("maps contact and sale order data using Trophy phone and SKU", () => {
    const source = {
      order: {
        orderNumber: "ORD-1", customerName: "Jane", customerPhone: "090-123", customerEmail: "jane@example.com",
        primaryAddressJson: JSON.stringify({ line1: "1 Main", city: "HCM", country: "VN" }), shippingAddressJson: null,
        totalAmount: 10000, notes: null, vatDetailsJson: null,
      },
      items: [{ id: 1, quantity: 2, unitPriceAmount: 5000, variantSnapshotJson: JSON.stringify({ sku: "SKU-1", title: "Gold" }) }],
    } as any;
    expect(buildMisaContactPayload(source)).toMatchObject({ contact_code: "TROPHY-090123", mobile: "090123" });
    expect(buildMisaSaleOrderPayload(source)).toMatchObject({ contact_name: "TROPHY-090123", sale_order_amount: 10000, sale_order_product_mappings: [{ product_code: "SKU-1", amount: 2, price: "5000" }] });
    expect(() => buildMisaSaleOrderPayload({ ...source, items: [{ ...source.items[0], variantSnapshotJson: JSON.stringify({ title: "Gold", sku: null }) }] } as never)).toThrow("has no SKU");
  });

  it("reports missing MISA credentials as unconfigured", () => {
    expect(isMisaConfigured({} as never)).toBe(false);
  });
});
