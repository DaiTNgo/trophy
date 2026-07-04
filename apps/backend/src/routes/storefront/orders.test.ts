import { describe, expect, it, vi, beforeEach } from "vitest";
import { storefrontOrdersRoute } from "./orders";
import * as dbClient from "../../db/client";

// Mock the DB client
vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

// Create a chainable mock DB
const mockDb: any = {
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  limit: vi.fn(),
  get: vi.fn(),
  insert: vi.fn(),
  values: vi.fn(),
  returning: vi.fn(),
};

mockDb.select.mockReturnValue(mockDb);
mockDb.from.mockReturnValue(mockDb);
mockDb.where.mockReturnValue(mockDb);
mockDb.limit.mockReturnValue(mockDb);
mockDb.insert.mockReturnValue(mockDb);
mockDb.values.mockReturnValue(mockDb);
mockDb.returning.mockReturnValue(mockDb);

describe("POST /api/storefront/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dbClient.getDb as any).mockReturnValue(mockDb);
  });

  const validPayload = {
    customer: {
      name: "John Doe",
      phone: "0123456789",
      email: "john@example.com",
    },
    shipping: {
      primaryAddress: {
        line1: "123 Main St",
        city: "Ho Chi Minh City",
        country: "Vietnam",
      },
      shipToDifferentAddress: false,
    },
    payment: {
      method: "cash_on_delivery",
    },
    items: [
      {
        productId: 1,
        variantId: 10,
        quantity: 2,
      },
    ],
  };

  it("returns 400 for structural validation errors (missing items)", async () => {
    const payload = { ...validPayload, items: [] };
    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body).toHaveProperty("error");
    expect(body.issues[0].message).toContain("At least one item is required");
  });

  it("returns 400 when shipToDifferentAddress is true but details are missing", async () => {
    const payload = {
      ...validPayload,
      shipping: {
        ...validPayload.shipping,
        shipToDifferentAddress: true,
      },
    };
    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    expect(res.status).toBe(400);
    const body = await res.json() as any;
    expect(body.error).toContain("Different shipping address details are required");
  });

  it("returns 422 when product is not found", async () => {
    mockDb.get.mockResolvedValueOnce(null); // Product lookup fails

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toContain("Product 1 not found");
  });

  it("returns 422 when variant has Contact Price (null price)", async () => {
    // 1. Product lookup
    mockDb.get.mockResolvedValueOnce({ id: 1, title: "Test Product", status: "published" });
    // 2. Variant lookup
    mockDb.get.mockResolvedValueOnce({ id: 10, productId: 1, priceAmount: null });

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toContain("Contact Price items cannot be ordered");
  });

  it("returns 422 when customization is required but missing", async () => {
    mockDb.get.mockResolvedValueOnce({ id: 1, title: "Test Product", status: "published" });
    mockDb.get.mockResolvedValueOnce({ id: 10, productId: 1, priceAmount: 5000 });
    mockDb.get.mockResolvedValueOnce({ assetId: "img1" }); // Media lookup
    mockDb.get.mockResolvedValueOnce({ enabled: true, layersJson: "[]", formFieldsJson: "[]" }); // Customization lookup

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(422);
    const body = await res.json() as any;
    expect(body.error).toContain("requires customization values");
  });

  it("successfully creates an order and returns the expected shape", async () => {
    // 1. Product
    mockDb.get.mockResolvedValueOnce({ id: 1, title: "Test Product", status: "published" });
    // 2. Variant
    mockDb.get.mockResolvedValueOnce({ id: 10, productId: 1, priceAmount: 5000 });
    // 3. Variant media
    mockDb.get.mockResolvedValueOnce({ assetId: "img1" });
    // 4. Customization
    mockDb.get.mockResolvedValueOnce(null);

    // 5. Insert Order: .values() returns mockDb, .returning() resolves
    mockDb.values.mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([{ id: 123, createdAt: new Date() }]);
    
    // 6. Insert OrderItem: .values() resolves directly
    mockDb.values.mockResolvedValueOnce([]);

    const res = await storefrontOrdersRoute.request("/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    });

    expect(res.status).toBe(201);
    const body = await res.json() as any;
    
    expect(body.order).toBeDefined();
    expect(body.order.id).toBe(123);
    expect(body.order.orderNumber).toMatch(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/);
    expect(body.order.status).toBe("pending");
    expect(body.order.paymentStatus).toBe("pending");
    expect(body.order.totalAmount).toBe(10000); // 5000 * 2
    expect(body.order.itemCount).toBe(2);
  });
});
