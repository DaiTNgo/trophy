import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { productsRoute } from "./products";

type MutationRecord = {
  kind: "insert" | "update" | "delete";
  values?: unknown;
  set?: unknown;
};

function createQueryChain({
  getQueue,
  selectQueue,
  mutations,
  kind,
}: {
  getQueue: unknown[];
  selectQueue: unknown[];
  mutations: MutationRecord[];
  kind?: MutationRecord["kind"];
}) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    values: vi.fn((value: unknown) => {
      if (kind) {
        mutations.push({ kind, values: value });
      }
      return chain;
    }),
    set: vi.fn((value: unknown) => {
      if (kind) {
        mutations.push({ kind, set: value });
      }
      return chain;
    }),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const mutations: MutationRecord[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    mutations,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations })),
    insert: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, kind: "insert" })),
    update: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, kind: "update" })),
    delete: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, kind: "delete" })),
  };

  return db;
}

function queueReadProduct(
  db: ReturnType<typeof createMockDb>,
  product: {
    id: number;
    title?: string;
    subtitle?: string | null;
    handle?: string;
    description?: string | null;
    status?: string;
    hasVariants?: boolean;
    collectionId?: number | null;
    createdAt?: string;
    updatedAt?: string;
  },
  input?: {
    optionRows?: Array<{ id: number; productId: number; title: string; position: number }>;
    optionValueRows?: Array<{ id: number; optionId: number; value: string; position: number }>;
    variantRows?: Array<{
      id: number;
      productId: number;
      title: string;
      sku: string | null;
      priceAmount: number | null;
      inventoryQuantity: number;
      allowBackorder: boolean;
      isDefault: boolean;
      position: number;
      createdAt: string;
      updatedAt: string;
    }>;
    variantOptionRows?: Array<{ variantId: number; optionValueId: number }>;
    variantMediaRows?: Array<{
      variantId: number;
      assetId: string;
      position: number;
      fileName: string;
      mimeType: string;
      widthPx: number | null;
      heightPx: number | null;
      byteSize: number;
    }>;
    customizationRow?: {
      enabled: boolean;
      canvasWidthPx: number | null;
      canvasHeightPx: number | null;
      layersJson: string;
      formFieldsJson: string;
    } | null;
  },
) {
  const baseProduct = {
    id: product.id,
    title: product.title ?? "Champion Cup",
    subtitle: product.subtitle ?? null,
    handle: product.handle ?? "champion-cup",
    description: product.description ?? null,
    status: product.status ?? "draft",
    hasVariants: product.hasVariants ?? true,
    collectionId: product.collectionId ?? null,
    createdAt: product.createdAt ?? "2026-07-04T00:00:00.000Z",
    updatedAt: product.updatedAt ?? "2026-07-04T00:00:00.000Z",
  };

  db.getQueue.push(baseProduct);
  db.selectQueue.push([]); // category rows
  db.selectQueue.push([]); // attribute rows
  db.selectQueue.push([]); // product media
  db.selectQueue.push(input?.optionRows ?? []);
  db.selectQueue.push(input?.variantRows ?? []);
  db.selectQueue.push(input?.variantMediaRows ?? []);
  db.getQueue.push(input?.customizationRow ?? null);

  if ((input?.optionRows ?? []).length > 0) {
    db.selectQueue.push(input?.optionValueRows ?? []);
  }

  if ((input?.variantRows ?? []).length > 0) {
    db.selectQueue.push(input?.variantOptionRows ?? []);
  }
}

describe("admin products operation-specific routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  it("creates a product option without replacing the full option set", async () => {
    db.getQueue.push({
      id: 1,
      title: "Champion Cup",
      status: "draft",
      hasVariants: true,
    });
    db.selectQueue.push([]);
    db.selectQueue.push([{ id: 5 }]);
    db.getQueue.push({ id: 10, productId: 1, title: "Material", position: 1 });
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [{ id: 10, productId: 1, title: "Material", position: 1 }],
        optionValueRows: [
          { id: 100, optionId: 10, value: "Crystal", position: 0 },
          { id: 101, optionId: 10, value: "Metal", position: 1 },
        ],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        variantOptionRows: [],
      },
    );

    const res = await productsRoute.request("/1/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Material", values: ["Crystal", "Metal"] }),
    });

    expect(res.status).toBe(201);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" &&
          !Array.isArray(entry.values) &&
          (entry.values as { productId?: number; title?: string })?.title === "Material",
      ),
    ).toBe(true);
  });

  it("rejects deleting an option value that is still used by variants", async () => {
    db.getQueue.push({
      id: 100,
      optionId: 10,
      value: "Crystal",
      position: 0,
      productId: 1,
      optionTitle: "Material",
    });
    db.getQueue.push({ variantId: 20 });

    const res = await productsRoute.request("/1/option-values/100", {
      method: "DELETE",
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.error).toContain("still used by variants");
  });

  it("creates a variant with explicit option selections", async () => {
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [{ id: 10, productId: 1, title: "Material", position: 0 }],
        optionValueRows: [{ id: 100, optionId: 10, value: "Crystal", position: 0 }],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        variantOptionRows: [],
      },
    );
    db.selectQueue.push([{ id: 10, productId: 1, title: "Material", position: 0 }]); // validate option rows
    db.selectQueue.push([{ id: 100, optionId: 10 }]); // validate option values
    db.selectQueue.push([{ id: 20 }]); // existing variant ids
    db.selectQueue.push([]); // existing selections
    db.getQueue.push({
      id: 21,
      productId: 1,
      title: "Crystal",
      sku: "CRY-1",
      priceAmount: null,
      inventoryQuantity: 0,
      allowBackorder: true,
      isDefault: false,
      position: 1,
      createdAt: "2026-07-04T00:00:00.000Z",
      updatedAt: "2026-07-04T00:00:00.000Z",
    });
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [{ id: 10, productId: 1, title: "Material", position: 0 }],
        optionValueRows: [{ id: 100, optionId: 10, value: "Crystal", position: 0 }],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
          {
            id: 21,
            productId: 1,
            title: "Crystal",
            sku: "CRY-1",
            priceAmount: null,
            inventoryQuantity: 0,
            allowBackorder: true,
            isDefault: false,
            position: 1,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        variantOptionRows: [{ variantId: 21, optionValueId: 100 }],
      },
    );

    const res = await productsRoute.request("/1/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Crystal",
        sku: "CRY-1",
        priceAmount: null,
        inventoryQuantity: 0,
        allowBackorder: true,
        optionValueIds: [100],
        media: [],
      }),
    });

    expect(res.status).toBe(201);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" &&
          !Array.isArray(entry.values) &&
          (entry.values as { title?: string; allowBackorder?: boolean; inventoryQuantity?: number })?.title ===
            "Crystal" &&
          (entry.values as { allowBackorder?: boolean })?.allowBackorder === true,
      ),
    ).toBe(true);
  });

  it("rejects duplicate variant option combinations", async () => {
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [{ id: 10, productId: 1, title: "Material", position: 0 }],
        optionValueRows: [{ id: 100, optionId: 10, value: "Crystal", position: 0 }],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Crystal",
            sku: "CRY-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        variantOptionRows: [{ variantId: 20, optionValueId: 100 }],
      },
    );
    db.selectQueue.push([{ id: 10, productId: 1, title: "Material", position: 0 }]);
    db.selectQueue.push([{ id: 100, optionId: 10 }]);
    db.selectQueue.push([{ id: 20 }]);
    db.selectQueue.push([{ variantId: 20, optionValueId: 100 }]);

    const res = await productsRoute.request("/1/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Crystal copy",
        sku: "CRY-2",
        priceAmount: 5000,
        inventoryQuantity: 3,
        allowBackorder: false,
        optionValueIds: [100],
        media: [],
      }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.error).toContain("Duplicate variant option combination");
  });

  it("updates prices without overwriting unrelated variant fields", async () => {
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
      },
    );
    db.selectQueue.push([{ id: 20 }, { id: 21 }]);
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 7000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
      },
    );

    const res = await productsRoute.request("/1/variants/prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: 20, priceAmount: 7000 }],
      }),
    });

    expect(res.status).toBe(200);
    const updateRecord = db.mutations.find(
      (entry: MutationRecord) =>
        entry.kind === "update" && entry.set && "priceAmount" in (entry.set as any),
    );
    expect(updateRecord?.set).toMatchObject({ priceAmount: 7000 });
    expect((updateRecord?.set as any).inventoryQuantity).toBeUndefined();
    expect((updateRecord?.set as any).allowBackorder).toBeUndefined();
  });

  it("updates stock without overwriting non-stock fields", async () => {
    db.getQueue.push({
      id: 1,
      title: "Champion Cup",
      status: "draft",
      hasVariants: true,
    });
    db.selectQueue.push([{ id: 20 }]);
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "draft" },
      {
        optionRows: [],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 12,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
      },
    );

    const res = await productsRoute.request("/1/variants/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: 20, inventoryQuantity: 12 }],
      }),
    });

    expect(res.status).toBe(200);
    const updateRecord = db.mutations.find(
      (entry: MutationRecord) =>
        entry.kind === "update" && entry.set && "inventoryQuantity" in (entry.set as any),
    );
    expect(updateRecord?.set).toMatchObject({ inventoryQuantity: 12 });
    expect((updateRecord?.set as any).priceAmount).toBeUndefined();
  });

  it("rejects media changes that would break customization publish readiness", async () => {
    queueReadProduct(
      db,
      { id: 1, hasVariants: true, status: "published" },
      {
        optionRows: [],
        variantRows: [
          {
            id: 20,
            productId: 1,
            title: "Default",
            sku: "SKU-1",
            priceAmount: 5000,
            inventoryQuantity: 8,
            allowBackorder: false,
            isDefault: true,
            position: 0,
            createdAt: "2026-07-04T00:00:00.000Z",
            updatedAt: "2026-07-04T00:00:00.000Z",
          },
        ],
        variantMediaRows: [
          {
            variantId: 20,
            assetId: "asset-1",
            position: 0,
            fileName: "asset-1.png",
            mimeType: "image/png",
            widthPx: 1200,
            heightPx: 900,
            byteSize: 1024,
          },
        ],
        customizationRow: {
          enabled: true,
          canvasWidthPx: 1200,
          canvasHeightPx: 900,
          layersJson: "[]",
          formFieldsJson: "[]",
        },
      },
    );

    const res = await productsRoute.request("/1/variants/20/media", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as any;
    expect(body.error).toContain("Customization requires at least one valid variant image before publish");
  });
});
