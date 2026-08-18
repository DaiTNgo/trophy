import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db/client";
import {
  buildMisaCreateProductsPayload,
  buildMisaCustomerPayload,
  buildMisaContactPayload,
  buildMisaSaleOrderPayload,
  createMisaProducts,
  deleteMisaSaleOrders,
  findMisaContactsByCodes,
  isMisaConfigured,
  checkMisaSaleOrderById,
  syncMisaOrder,
  updateMisaProducts,
  validateMisaCheckoutCustomer,
} from "./misa";

const bindings = {
  MISA_CLIENT_ID: "client-id",
  MISA_CLIENT_SECRET: "client-secret",
  DB: {},
} as never;

afterEach(() => vi.restoreAllMocks());

describe("MISA client", () => {
  it("checks SaleOrder presence by the MISA ID returned by create", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: 9663, sale_order_no: "16" }] }),
          { status: 200 },
        ),
      );

    await expect(checkMisaSaleOrderById(bindings, "9663")).resolves.toEqual({
      found: true,
      responseHadData: true,
    });
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/SaleOrders/id?ids=9663",
    );
  });

  it("deletes MISA SaleOrders by numeric ID", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 }),
      );

    await deleteMisaSaleOrders(bindings, [123]);

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
    );
    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(init.method).toBe("DELETE");
    expect(init.body).toBe("[123]");
  });

  it("stores the MISA SaleOrder ID returned in results data", async () => {
    const order = {
      id: 8,
      orderNumber: "8",
      customerName: "Jane",
      customerPhone: "090-123",
      customerEmail: null,
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 10000,
      notes: null,
      vatDetailsJson: null,
    };
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve([
          {
            id: 1,
            quantity: 1,
            unitPriceAmount: 10000,
            lineSubtotalAmount: 10000,
            variantSnapshotJson: JSON.stringify({
              id: 42,
              title: "Gold",
              sku: null,
            }),
          },
        ]).then(resolve),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(orderQuery)
        .mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 77 } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ success: true, data: 9655 }],
            code: 200,
          }),
          { status: 200 },
        ),
      );

    await expect(syncMisaOrder(bindings, 8)).resolves.toMatchObject({
      saleOrderId: "9655",
    });

    const customerRequest = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(JSON.parse(String(customerRequest.body))).toEqual([
      {
        form_layout: "Mẫu tiêu chuẩn",
        account_number: "KH-090123",
        account_name: "Jane",
        is_personal: true,
        office_tel: "090123",
      },
    ]);
    const saleOrderRequest = fetchMock.mock.calls[5]?.[1] as RequestInit;
    expect(JSON.parse(String(saleOrderRequest.body))).toMatchObject([
      {
        account_name: "KH-090123",
        shipping_contact_name: "Jane",
      },
    ]);
    expect(JSON.parse(String(saleOrderRequest.body))[0]).not.toHaveProperty(
      "contact_name",
    );
  });

  it("increments the Customer account number after MISA rejects the base code", async () => {
    const source = {
      order: {
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: null,
        primaryAddressJson: null,
        shippingAddressJson: null,
        vatDetailsJson: null,
      },
    } as never;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error_message: "account_number: Giá trị đã bị trùng.",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error_message: "account_number: Giá trị đã bị trùng.",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 77 } }), { status: 200 }),
      );

    await expect(
      validateMisaCheckoutCustomer(bindings, source),
    ).resolves.toEqual({
      customerCode: "KH-090123-2",
    });
    expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({
      body: expect.stringContaining('"account_number":"KH-090123"'),
    });
    expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({
      body: expect.stringContaining('"account_number":"KH-090123-1"'),
    });
    expect(fetchMock.mock.calls[5]?.[1]).toMatchObject({
      body: expect.stringContaining('"account_number":"KH-090123-2"'),
    });
  });

  it("sends token and Clientid headers when creating a missing product", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 }),
      );
    await createMisaProducts(bindings, [
      {
        product_code: "1",
        product_name: "Cup",
        inactive: false,
        usage_unit: "Cái",
        product_properties: "Hàng hóa",
        form_layout: "Mẫu tiêu chuẩn",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/Products",
    );
    const init = fetchMock.mock.calls[3]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect((init.headers as Headers).get("Authorization")).toBe("Bearer token");
    expect((init.headers as Headers).get("Clientid")).toBe("client-id");
    expect(init.body).toBe(
      JSON.stringify([
        {
          product_code: "1",
          product_name: "Cup",
          inactive: false,
          usage_unit: "Cái",
          product_properties: "Hàng hóa",
          form_layout: "Mẫu tiêu chuẩn",
        },
      ]),
    );
  });

  it("looks up an existing MISA contact by contact code before creating an order", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 99, contact_code: "LH-090123", contact_name: "Jane" }],
          }),
          { status: 200 },
        ),
      );

    await expect(
      findMisaContactsByCodes(bindings, ["LH-090123"]),
    ).resolves.toEqual([
      {
        contact_code: "LH-090123",
        contact_name: "Jane",
        account_name: null,
        email: null,
        mobile: null,
      },
    ]);

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/Contacts/code?code=LH-090123",
    );
    expect(
      (fetchMock.mock.calls[1]?.[1] as RequestInit).method,
    ).toBeUndefined();
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
      vatDetailsJson: JSON.stringify({
        name: "Trophy Co.",
        taxId: "0314042508",
        email: "accounting@trophy.test",
        address: "1 Nguyen Hue",
      }),
    };
    const items = [
      {
        id: 1,
        quantity: 2,
        unitPriceAmount: 5000,
        lineSubtotalAmount: 10000,
        variantSnapshotJson: JSON.stringify({
          id: 42,
          title: "Gold",
          sku: null,
        }),
      },
    ];
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(items).then(resolve, reject),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(orderQuery)
        .mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              { id: 77, account_number: "KH-090123", account_name: "Jane" },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ id: 99, contact_code: "LH-090123", contact_name: "Jane" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 123 } }), { status: 200 }),
      );

    await expect(syncMisaOrder(bindings, 5)).resolves.toEqual({
      saleOrderId: "123",
      saleOrderNumber: "ORD-5",
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders/code?code=ORD-5",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Customers",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Contacts/code?code=LH-090123",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Contacts",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
    ]);

    const contactRequest = fetchMock.mock.calls[7]?.[1] as RequestInit;
    expect(contactRequest.method).toBe("PUT");
    expect(JSON.parse(String(contactRequest.body))).toEqual([
      {
        form_layout: "Mẫu tiêu chuẩn",
        contact_code: "LH-090123",
        account_name: "KH-TAX-0314042508",
      },
    ]);
    const saleOrderRequest = fetchMock.mock.calls[9]?.[1] as RequestInit;
    expect(JSON.parse(String(saleOrderRequest.body))).toMatchObject([
      {
        account_name: "KH-TAX-0314042508",
        contact_name: "LH-090123",
      },
    ]);
  });

  it("reconnects an order to an existing MISA SaleOrder before creating another", async () => {
    const order = {
      id: 7,
      orderNumber: "123",
      customerName: "Jane",
      customerPhone: "090-123",
      customerEmail: null,
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 10000,
      notes: null,
      vatDetailsJson: null,
    };
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve([]).then(resolve),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(orderQuery)
        .mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: 555, sale_order_no: "123" }] }),
          { status: 200 },
        ),
      );

    await expect(syncMisaOrder(bindings, 7)).resolves.toEqual({
      saleOrderId: "555",
      saleOrderNumber: "123",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("recreates a deleted MISA customer and retries the SaleOrder once", async () => {
    const order = {
      id: 8,
      orderNumber: "124",
      customerName: "Jane",
      customerPhone: "090-123",
      customerEmail: null,
      primaryAddressJson: null,
      shippingAddressJson: null,
      totalAmount: 10000,
      notes: null,
      vatDetailsJson: JSON.stringify({
        name: "Trophy Co.",
        taxId: "0314042508",
        email: "accounting@trophy.test",
        address: "1 Nguyen Hue",
      }),
    };
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve([
          {
            id: 1,
            quantity: 1,
            unitPriceAmount: 10000,
            lineSubtotalAmount: 10000,
            variantSnapshotJson: JSON.stringify({ id: 42, title: "Gold" }),
          },
        ]).then(resolve),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(orderQuery)
        .mockReturnValueOnce(itemsQuery),
    } as never);

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [{ account_number: "KH-090123", account_name: "Jane" }],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [
              {
                contact_code: "LH-090123",
                contact_name: "Jane",
                account_name: "KH-TAX-0314042508",
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error_message: "Không thể lưu do khách hàng đã bị xóa.",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 88 } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 555 } }), { status: 200 }),
      );

    await expect(syncMisaOrder(bindings, 8)).resolves.toEqual({
      saleOrderId: "555",
      saleOrderNumber: "124",
    });

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders/code?code=124",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Customers",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Contacts/code?code=LH-090123",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/Customers",
      "https://crmconnect.misa.vn/api/v2/Account",
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
    ]);
    const recreatedCustomer = fetchMock.mock.calls[9]?.[1] as RequestInit;
    expect(JSON.parse(String(recreatedCustomer.body))).toMatchObject([
      {
        account_number: "KH-TAX-0314042508",
        account_name: "Trophy Co.",
        is_personal: false,
      },
    ]);
  });

  it("creates a SaleOrder without Contact when MISA rejects a duplicate Contact email", async () => {
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
      vatDetailsJson: JSON.stringify({
        name: "Trophy Co.",
        taxId: "0314042508",
        email: "accounting@trophy.test",
        address: "1 Nguyen Hue",
      }),
    };
    const items = [
      {
        id: 1,
        quantity: 2,
        unitPriceAmount: 5000,
        lineSubtotalAmount: 10000,
        variantSnapshotJson: JSON.stringify({
          id: 42,
          title: "Gold",
          sku: null,
        }),
      },
    ];
    const orderQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(order),
    };
    const itemsQuery = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      then: (
        resolve: (value: unknown) => unknown,
        reject?: (reason: unknown) => unknown,
      ) => Promise.resolve(items).then(resolve, reject),
    };
    vi.mocked(getDb).mockReturnValue({
      select: vi
        .fn()
        .mockReturnValueOnce(orderQuery)
        .mockReturnValueOnce(itemsQuery),
    } as never);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 77 } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: false,
            error_message: "email: Giá trị của Email cá nhân đã bị trùng.",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: 124 } }), { status: 200 }),
      );

    await expect(syncMisaOrder(bindings, 6)).resolves.toEqual({
      saleOrderId: "124",
      saleOrderNumber: "ORD-6",
    });

    const firstContactRequest = fetchMock.mock.calls[7]?.[1] as RequestInit;
    expect(JSON.parse(String(firstContactRequest.body))).toEqual([
      {
        form_layout: "Mẫu tiêu chuẩn",
        contact_code: "LH-090123",
        contact_name: "Jane",
        account_name: "KH-TAX-0314042508",
        mobile: "090123",
        email: "jane@example.com",
      },
    ]);
    const saleOrderRequest = fetchMock.mock.calls[9]?.[1] as RequestInit;
    expect(JSON.parse(String(saleOrderRequest.body))).toMatchObject([
      {
        account_name: "KH-TAX-0314042508",
        description: expect.stringContaining(
          "Email jane@example.com da ton tai tren MISA",
        ),
      },
    ]);
    expect(JSON.parse(String(saleOrderRequest.body))[0]).not.toHaveProperty(
      "contact_name",
    );
    expect(fetchMock.mock.calls[7]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/Contacts",
    );
    expect(fetchMock.mock.calls[9]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/SaleOrders",
    );
  });

  it("surfaces nested MISA validation failures", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 0,
            results: [
              {
                success: false,
                validate_infos: [{ error_message: "SKU already exists" }],
              },
            ],
          }),
          { status: 200 },
        ),
      );

    await expect(
      createMisaProducts(bindings, [
        {
          product_code: "1",
          product_name: "Cup",
          inactive: false,
          usage_unit: "Cái",
          product_properties: "Hàng hóa",
          form_layout: "Mẫu tiêu chuẩn",
        },
      ]),
    ).rejects.toThrow("SKU already exists");
  });

  it("sends the agreed form when updating a MISA product", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: "token" }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 0, data: [] }), { status: 200 }),
      );
    const product = {
      product_code: "42",
      product_name: "Cup - Gold",
      inactive: false,
      usage_unit: "Cái" as const,
      product_properties: "Hàng hóa" as const,
      form_layout: "Mẫu tiêu chuẩn" as const,
    };

    await updateMisaProducts(bindings, [product]);

    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      "https://crmconnect.misa.vn/api/v2/Products",
    );
    const init = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(init.method).toBe("PUT");
    expect(init.body).toBe(JSON.stringify([product]));
  });

  it("builds the agreed variant-ID MISA product form", () => {
    expect(
      buildMisaCreateProductsPayload({
        title: { vi: "Cup" },
        variants: [{ id: 42, title: { vi: "Gold" } }],
      }),
    ).toEqual([
      {
        product_code: "42",
        product_name: "Cup - Gold",
        inactive: false,
        usage_unit: "Cái",
        product_properties: "Hàng hóa",
        form_layout: "Mẫu tiêu chuẩn",
      },
    ]);
  });

  it("maps contact and sale order data using Trophy phone and variant ID", () => {
    const source = {
      order: {
        orderNumber: "ORD-1",
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: "jane@example.com",
        createdAt: new Date("2026-08-15T17:00:00.000Z"),
        primaryAddressJson: JSON.stringify({
          line1: "1 Main",
          city: "HCM",
          country: "VN",
        }),
        shippingAddressJson: null,
        totalAmount: 10000,
        notes: null,
        vatDetailsJson: null,
      },
      items: [
        {
          id: 1,
          quantity: 2,
          unitPriceAmount: 5000,
          lineSubtotalAmount: 10000,
          variantSnapshotJson: JSON.stringify({
            id: 42,
            sku: "SKU-1",
            title: "Gold",
          }),
        },
      ],
    } as any;
    expect(buildMisaCustomerPayload(source)).toEqual({
      form_layout: "Mẫu tiêu chuẩn",
      account_number: "KH-090123",
      account_name: "Jane",
      is_personal: true,
      office_tel: "090123",
      office_email: "jane@example.com",
      billing_address: "1 Main, HCM, VN",
      shipping_address: "1 Main, HCM, VN",
    });
    expect(buildMisaContactPayload(source, "KH-090123")).toEqual({
      form_layout: "Mẫu tiêu chuẩn",
      contact_code: "LH-090123",
      contact_name: "Jane",
      account_name: "KH-090123",
      mobile: "090123",
      email: "jane@example.com",
    });
    expect(buildMisaSaleOrderPayload(source)).toEqual({
      sale_order_no: "PT-ORD-1",
      sale_order_name: "Đơn hàng bán cho Jane",
      sale_order_date: "16/08/2026",
      account_name: "KH-090123",
      shipping_contact_name: "Jane",
      billing_account: "KH-090123",
      phone: "090123",
      sale_order_amount: 10000,
      to_currency_summary: "10000",
      description: [
        "DIA CHI THANH TOAN",
        "1 Main, HCM, VN",
        "",
        "DIA CHI GIAO HANG",
        "1 Main, HCM, VN",
        "",
        "GHI CHU KHACH",
        "Trophy checkout order",
      ].join("\n"),
      form_layout: "Mẫu tiêu chuẩn",
      billing_address: "1 Main, HCM, VN",
      shipping_address: "1 Main, HCM, VN",
      sale_order_product_mappings: [
        {
          product_code: "42",
          amount: 2,
          shipping_amount: 2,
          price: "5000",
          to_currency: 10000,
          description: "Gold",
        },
      ],
    });
    expect(() =>
      buildMisaSaleOrderPayload({
        ...source,
        items: [
          {
            ...source.items[0],
            variantSnapshotJson: JSON.stringify({
              title: "Gold",
              sku: "SKU-1",
            }),
          },
        ],
      } as never),
    ).toThrow("has no variant ID");
  });

  it("includes the short payment reference in the MISA sale order description", () => {
    const source = {
      order: {
        id: 123,
        orderNumber: "ORD-1",
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: null,
        primaryAddressJson: null,
        shippingAddressJson: null,
        totalAmount: 10000,
        notes: "Please call before delivery.",
        vatDetailsJson: null,
      },
      items: [
        {
          id: 1,
          quantity: 1,
          unitPriceAmount: 10000,
          lineSubtotalAmount: 10000,
          variantSnapshotJson: JSON.stringify({
            id: 42,
            sku: "SKU-1",
            title: "Gold",
          }),
        },
      ],
    } as any;

    expect(buildMisaSaleOrderPayload(source).description).toBe(
      "MA THANH TOAN: PT-123\n\nGHI CHU KHACH\nPlease call before delivery.",
    );
  });

  it("includes the Trophy admin order URL from the configured admin origin", () => {
    const source = {
      order: {
        id: 53,
        orderNumber: "53",
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: null,
        primaryAddressJson: null,
        shippingAddressJson: null,
        totalAmount: 10000,
        notes: null,
        vatDetailsJson: null,
      },
      items: [
        {
          id: 1,
          quantity: 1,
          unitPriceAmount: 10000,
          lineSubtotalAmount: 10000,
          variantSnapshotJson: JSON.stringify({ id: 42, title: "Gold" }),
        },
      ],
    } as any;

    expect(
      buildMisaSaleOrderPayload(
        source,
        undefined,
        undefined,
        undefined,
        false,
        false,
        "https://trophy-admin.pages.dev/",
      ).description,
    ).toContain("TROPHY ADMIN\nhttps://trophy-admin.pages.dev/orders/53");
  });

  it("maps billing and shipping addresses and preserves VAT request details in the order description", () => {
    const source = {
      order: {
        orderNumber: "ORD-VAT-1",
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: "jane@example.com",
        primaryAddressJson: JSON.stringify({
          line1: "1 Nguyen Hue",
          line2: "Floor 2",
          city: "Ho Chi Minh City",
          province: "Ho Chi Minh City",
          postalCode: "700000",
          country: "VN",
        }),
        shippingAddressJson: JSON.stringify({
          recipientName: "John",
          recipientPhone: "090-456",
          address: { line1: "2 Le Loi", city: "Da Nang", country: "VN" },
        }),
        totalAmount: 10000,
        notes: "Please call before delivery.",
        vatDetailsJson: JSON.stringify({
          name: "Trophy Co.",
          taxId: "0314042508",
          email: "accounting@trophy.test",
          address: "1 Nguyen Hue, Ho Chi Minh City",
        }),
      },
      items: [
        {
          id: 1,
          quantity: 1,
          unitPriceAmount: 10000,
          lineSubtotalAmount: 10000,
          variantSnapshotJson: JSON.stringify({
            id: 42,
            sku: "SKU-1",
            title: "Gold",
          }),
        },
      ],
    } as any;

    expect(buildMisaCustomerPayload(source)).toMatchObject({
      form_layout: "Mẫu tiêu chuẩn",
      account_number: "KH-TAX-0314042508",
      account_name: "Trophy Co.",
      is_personal: false,
      tax_code: "0314042508",
      office_email: "accounting@trophy.test",
      billing_address: "1 Nguyen Hue, Ho Chi Minh City",
    });
    expect(buildMisaSaleOrderPayload(source)).toMatchObject({
      description: [
        "DIA CHI THANH TOAN",
        "1 Nguyen Hue, Floor 2, Ho Chi Minh City, Ho Chi Minh City, 700000, VN",
        "",
        "DIA CHI GIAO HANG",
        "2 Le Loi, Da Nang, VN",
        "",
        "YEU CAU XUAT HOA DON",
        "Don vi: Trophy Co.",
        "MST: 0314042508",
        "Email hoa don: accounting@trophy.test",
        "Dia chi hoa don: 1 Nguyen Hue, Ho Chi Minh City",
        "",
        "GHI CHU KHACH",
        "Please call before delivery.",
      ].join("\n"),
      shipping_address: "2 Le Loi, Da Nang, VN",
    });
  });

  it("creates an unlinked SaleOrder payload with an admin warning when the VAT tax code already exists", () => {
    const source = {
      order: {
        orderNumber: "ORD-VAT-DUPLICATE",
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: "jane@example.com",
        primaryAddressJson: null,
        shippingAddressJson: null,
        totalAmount: 10000,
        notes: null,
        vatDetailsJson: JSON.stringify({
          name: "Trophy Co.",
          taxId: "0314042508",
          email: "accounting@trophy.test",
          address: "1 Nguyen Hue",
        }),
      },
      items: [
        {
          id: 1,
          quantity: 1,
          unitPriceAmount: 10000,
          lineSubtotalAmount: 10000,
          variantSnapshotJson: JSON.stringify({
            id: 42,
            sku: "SKU-1",
            title: "Gold",
          }),
        },
      ],
    } as any;

    expect(
      buildMisaSaleOrderPayload(source, undefined, undefined, undefined, true),
    ).toMatchObject({
      sale_order_no: "PT-ORD-VAT-DUPLICATE",
      description: expect.stringContaining(
        "MST 0314042508 da ton tai tren MISA",
      ),
    });
    expect(
      buildMisaSaleOrderPayload(source, undefined, undefined, undefined, true),
    ).not.toHaveProperty("account_name");
    expect(
      buildMisaSaleOrderPayload(source, undefined, undefined, undefined, true),
    ).not.toHaveProperty("contact_name");
  });

  it("uses a normalized VAT tax ID as the stable MISA company customer key", () => {
    const source = {
      order: {
        customerName: "Jane",
        customerPhone: "090-123",
        customerEmail: "jane@example.com",
        primaryAddressJson: null,
        shippingAddressJson: null,
        vatDetailsJson: JSON.stringify({
          name: "Trophy Co.",
          taxId: " 0314 042 508 ",
        }),
      },
      items: [],
    } as any;

    expect(buildMisaCustomerPayload(source)).toMatchObject({
      account_number: "KH-TAX-0314042508",
      account_name: "Trophy Co.",
      is_personal: false,
      tax_code: "0314042508",
    });
  });

  it("reports missing MISA credentials as unconfigured", () => {
    expect(isMisaConfigured({} as never)).toBe(false);
  });
});
