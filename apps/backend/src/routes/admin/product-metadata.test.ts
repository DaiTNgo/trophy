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
    then: (
      resolve: (value: unknown) => unknown,
      reject?: (error: unknown) => unknown,
    ) => Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
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
    insert: vi.fn(() =>
      createQueryChain({ getQueue, selectQueue, mutations, kind: "insert" }),
    ),
    update: vi.fn(() =>
      createQueryChain({ getQueue, selectQueue, mutations, kind: "update" }),
    ),
    delete: vi.fn(() =>
      createQueryChain({ getQueue, selectQueue, mutations, kind: "delete" }),
    ),
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

  it("creates collections as public by default", async () => {
    db.getQueue.push(null, {
      id: 21,
      title: "Public Collection",
      handle: "public-collection",
      imageUrl: null,
      position: 0,
      visibility: "public",
    });

    const res = await productMetadataRoute.request("/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: { vi: "Public Collection" } }),
    });

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({
      item: { visibility: "public" },
    });
    expect(db.mutations).toContainEqual(
      expect.objectContaining({
        kind: "insert",
        values: expect.objectContaining({ visibility: "public" }),
      }),
    );
  });

  it("updates collection visibility and rejects invalid values", async () => {
    db.getQueue.push(
      {
        id: 22,
        title: "Collection",
        handle: "collection",
        visibility: "public",
      },
      {
        id: 22,
        title: "Collection",
        handle: "collection",
        imageUrl: null,
        position: 0,
        visibility: "hidden",
      },
    );

    const update = await productMetadataRoute.request("/collections/22", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "hidden" }),
    });

    expect(update.status).toBe(200);
    await expect(update.json()).resolves.toMatchObject({
      item: { visibility: "hidden" },
    });
    expect(db.mutations).toContainEqual(
      expect.objectContaining({
        kind: "update",
        set: { visibility: "hidden" },
      }),
    );

    const invalid = await productMetadataRoute.request("/collections/22", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "draft" }),
    });

    expect(invalid.status).toBe(400);
  });

  it("returns 404 when updating a missing collection", async () => {
    db.getQueue.push(null);

    const res = await productMetadataRoute.request("/collections/404", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "hidden" }),
    });

    expect(res.status).toBe(404);
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
          (entry.values as { description?: string | null } | undefined)
            ?.description === "Danh muc ve cup",
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

  it("defaults category visibility to public and accepts hidden updates", async () => {
    db.getQueue.push(null, {
      id: 13,
      name: "Hidden Awards",
      description: null,
      handle: "hidden-awards",
      imageUrl: null,
      visibility: "public",
      position: 0,
    });
    const created = await productMetadataRoute.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { vi: "Hidden Awards" } }),
    });

    expect(created.status).toBe(201);
    expect(db.mutations).toContainEqual(expect.objectContaining({
      kind: "insert",
      values: expect.objectContaining({ visibility: "public" }),
    }));

    db.getQueue.push(
      { id: 13, name: "Hidden Awards", handle: "hidden-awards", visibility: "public" },
      { id: 13, name: "Hidden Awards", handle: "hidden-awards", visibility: "hidden" },
    );
    const updated = await productMetadataRoute.request("/categories/13", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "hidden" }),
    });

    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({ item: { visibility: "hidden" } });
  });

  it("rejects invalid category visibility values", async () => {
    const response = await productMetadataRoute.request("/categories/13", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "draft" }),
    });

    expect(response.status).toBe(400);
  });

  it("clears a category description when the admin submits null", async () => {
    db.getQueue.push(
      {
        id: 3,
        name: "Cup C1",
        description: "Existing description",
        handle: "cup-c1",
        imageUrl: null,
        position: 0,
      },
      {
        id: 3,
        name: "Cup C111",
        description: null,
        handle: "cup-c1",
        imageUrl: null,
        position: 0,
      },
    );

    const res = await productMetadataRoute.request("/categories/3", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: { vi: "Cup C111" },
        handle: "cup-c1",
        description: null,
      }),
    });

    expect(res.status).toBe(200);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "update" &&
          (entry.set as { description?: string | null } | undefined)
            ?.description === null,
      ),
    ).toBe(true);
    expect(vi.mocked(upsertTranslations)).toHaveBeenCalledWith(
      db,
      "product_category",
      "3",
      "description",
      { vi: null, en: null },
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

  it("rejects deleting the system customization category", async () => {
    db.getQueue.push({ id: 9, handle: "customization" });

    const res = await productMetadataRoute.request("/categories/9", {
      method: "DELETE",
    });

    expect(res.status).toBe(409);
    expect(db.mutations).toHaveLength(0);
  });

  it("marks Other products as a system category and rejects its deletion", async () => {
    db.selectQueue.push([
      {
        id: 10,
        name: "Other products",
        description: null,
        handle: "other-products",
        imageUrl: null,
        position: 0,
      },
    ]);

    const list = await productMetadataRoute.request("/categories");

    expect(list.status).toBe(200);
    await expect(list.json()).resolves.toMatchObject({
      categories: [{ id: 10, handle: "other-products", isSystem: true }],
    });

    db.getQueue.push({ id: 10, handle: "other-products" });
    const deletion = await productMetadataRoute.request("/categories/10", {
      method: "DELETE",
    });

    expect(deletion.status).toBe(409);
    expect(db.mutations).toHaveLength(0);

    db.getQueue.push({ id: 10, handle: "other-products" });
    const update = await productMetadataRoute.request("/categories/10", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ handle: "miscellaneous" }),
    });

    expect(update.status).toBe(409);
    expect(db.mutations).toHaveLength(0);
  });

  it("allows visibility updates for the system customization category", async () => {
    db.getQueue.push(
      { id: 9, handle: "customization", name: "Customization", visibility: "public" },
      { id: 9, handle: "customization", name: "Customization", visibility: "hidden" },
    );

    const visibility = await productMetadataRoute.request("/categories/9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: "hidden" }),
    });
    expect(visibility.status).toBe(200);

    db.getQueue.push({ id: 9, handle: "customization" });
    const rejected = await productMetadataRoute.request("/categories/9", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { vi: "Other" } }),
    });

    expect(rejected.status).toBe(409);
    expect(db.mutations).toHaveLength(1);
  });
});
