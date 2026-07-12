import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("../../lib/catalog-translation", () => ({
  hydrateTranslations: vi.fn(async (_db, _ownerType, items) => items),
  upsertTranslations: vi.fn(async () => undefined),
}));

import { getDb } from "../../db/client";
import { upsertTranslations } from "../../lib/catalog-translation";
import { productMetadataRoute } from "./product-metadata";

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
    orderBy: vi.fn(() => chain),
    returning: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    values: vi.fn((value: unknown) => {
      if (kind) mutations.push({ kind, values: value });
      return chain;
    }),
    set: vi.fn((value: unknown) => {
      if (kind) mutations.push({ kind, set: value });
      return chain;
    }),
    run: vi.fn(async () => undefined),
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
    batch: vi.fn(async () => undefined),
  };

  return db;
}

describe("product metadata routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(upsertTranslations).mockClear();
  });

  it("creates a category with optional description translations", async () => {
    db.getQueue.push(null);
    db.getQueue.push({
      id: 12,
      name: "Cup Awards",
      description: "Danh muc ve cup",
      handle: "cup-awards",
      imageUrl: null,
      position: 0,
    });

    const res = await productMetadataRoute.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: { vi: "Cup Awards" },
        description: { vi: "Danh muc ve cup", en: "Trophy category" },
      }),
    });

    expect(res.status).toBe(201);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" &&
          (entry.values as { description?: string | null } | undefined)?.description === "Danh muc ve cup",
      ),
    ).toBe(true);
    expect(vi.mocked(upsertTranslations)).toHaveBeenCalledWith(
      db,
      "product_category",
      "12",
      "description",
      { vi: "Danh muc ve cup", en: "Trophy category" },
    );
  });

  it("rejects negative category ranking positions", async () => {
    const res = await productMetadataRoute.request("/categories/ranking", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categories: [{ id: 1, position: -1 }],
      }),
    });

    expect(res.status).toBe(400);
    expect(db.batch).not.toHaveBeenCalled();
  });
});
