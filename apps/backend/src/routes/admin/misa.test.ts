import { describe, expect, it, vi } from "vitest";

vi.mock("../../lib/misa", () => ({
  createMisaProducts: vi.fn(async (_bindings, products) => ({ created: products, existing: [] })),
  deleteMisaProducts: vi.fn(async () => ({ deleted: true })),
  fetchMisaProducts: vi.fn(async () => ({ items: [{ id: "1", product_code: "SKU-1", product_name: "Cup", inactive: false }], page: 0, pageSize: 100, totalRecords: 1 })),
  isMisaConfigured: vi.fn(() => true),
  updateMisaProducts: vi.fn(async () => ({ updated: true })),
}));

import { adminMisaRoute } from "./misa";

describe("admin MISA product proxy", () => {
  it("returns normalized products without exposing a bearer token", async () => {
    const response = await adminMisaRoute.request("/products?q=SKU-1", undefined, { MISA_CLIENT_ID: "client", MISA_CLIENT_SECRET: "secret" } as never);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ items: [{ product_code: "SKU-1" }] });
    expect(JSON.stringify(body)).not.toContain("Bearer");
  });

  it("validates product mutation payloads", async () => {
    const response = await adminMisaRoute.request("/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ product_code: "", product_name: "Cup", inactive: false }]),
    }, { MISA_CLIENT_ID: "client", MISA_CLIENT_SECRET: "secret" } as never);
    expect(response.status).toBe(400);
  });

  it("proxies delete IDs", async () => {
    const response = await adminMisaRoute.request("/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([101]),
    }, { MISA_CLIENT_ID: "client", MISA_CLIENT_SECRET: "secret" } as never);
    expect(response.status).toBe(200);
  });
});
