import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";
import { adminClipartRoute } from "./clipart";

type MutationRecord = {
  kind: "insert" | "update" | "delete";
  values?: unknown;
  set?: unknown;
};

function createQueryChain({
  getQueue,
  selectQueue,
  returningQueue,
  mutations,
  kind,
}: {
  getQueue: unknown[];
  selectQueue: unknown[];
  returningQueue: unknown[];
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
    returning: vi.fn(async () => returningQueue.shift() ?? []),
    onConflictDoUpdate: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    values: vi.fn((value: unknown) => {
      if (kind) mutations.push({ kind, values: value });
      return chain;
    }),
    set: vi.fn((value: unknown) => {
      if (kind) mutations.push({ kind, set: value });
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
  const returningQueue: unknown[] = [];
  const mutations: MutationRecord[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    returningQueue,
    mutations,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue, returningQueue, mutations })),
    insert: vi.fn(() => createQueryChain({ getQueue, selectQueue, returningQueue, mutations, kind: "insert" })),
    update: vi.fn(() => createQueryChain({ getQueue, selectQueue, returningQueue, mutations, kind: "update" })),
    delete: vi.fn(() => createQueryChain({ getQueue, selectQueue, returningQueue, mutations, kind: "delete" })),
  };

  return db;
}

function queueAdminSession(db: ReturnType<typeof createMockDb>) {
  db.getQueue.push({
    session: {
      id: "session-1",
      token: "token-1",
      userId: "user-1",
      expiresAt: new Date(Date.now() + 60_000),
    },
    user: {
      id: "user-1",
      name: "admin",
      username: "admin",
      email: "admin@admin.trophy.local",
      role: "super-admin",
      banned: false,
    },
  });
}

const env = {
  CUSTOMIZATION_ASSETS: {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  },
};

describe("admin clipart routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    env.CUSTOMIZATION_ASSETS.put.mockReset();
    env.CUSTOMIZATION_ASSETS.put.mockImplementation(async () => undefined);
    env.CUSTOMIZATION_ASSETS.delete.mockReset();
    env.CUSTOMIZATION_ASSETS.delete.mockImplementation(async () => undefined);
  });

  it("lists clipart categories", async () => {
    db.selectQueue.push([
      {
        id: "sports",
        name: "Sports",
        active: true,
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 2,
      },
    ]);
    db.selectQueue.push([
      {
        categoryId: "sports",
        active: true,
      },
      {
        categoryId: "sports",
        active: false,
      },
    ]);

    const res = await adminClipartRoute.request("/categories", {}, env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      categories: [
        {
          id: "sports",
          name: "Sports",
          active: true,
          sortOrder: 0,
          createdAt: 1,
          updatedAt: 2,
          activeAssetCount: 1,
        },
      ],
    });
  });

  it("creates a clipart category", async () => {
    db.returningQueue.push([
      {
        id: "sports",
        name: "Sports",
        active: true,
        sortOrder: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ]);

    const res = await adminClipartRoute.request("/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Sports" }),
    });

    expect(res.status).toBe(201);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" && (entry.values as { name?: string } | undefined)?.name === "Sports",
      ),
    ).toBe(true);
  });

  it("uploads a validated clipart batch for a category", async () => {
    db.getQueue.push({
      id: "sports",
      name: "Sports",
      active: true,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    db.returningQueue.push([
      {
        id: "clipart_star",
        categoryId: "sports",
        sourceAssetId: "asset_star",
        name: "Star",
        fileName: "star.svg",
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 128,
        sourceHeightPx: 128,
        active: true,
        createdAt: 10,
        updatedAt: 10,
      },
    ]);

    const formData = new FormData();
    formData.set("namesJson", JSON.stringify(["Star"]));
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "star.svg",
        { type: "image/svg+xml" },
      ),
    );

    const res = await adminClipartRoute.request(
      "/categories/sports/assets/batch",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(201);
    expect(env.CUSTOMIZATION_ASSETS.put).toHaveBeenCalledTimes(1);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" &&
          (entry.values as { name?: string; categoryId?: string } | undefined)?.name === "Star",
      ),
    ).toBe(true);
  });

  it("rejects duplicate files inside a clipart batch", async () => {
    db.getQueue.push({
      id: "sports",
      name: "Sports",
      active: true,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    const formData = new FormData();
    formData.set("namesJson", JSON.stringify(["Star", "Star 2"]));
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "duplicate.svg",
        { type: "image/svg+xml" },
      ),
    );
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "duplicate.svg",
        { type: "image/svg+xml" },
      ),
    );

    const res = await adminClipartRoute.request(
      "/categories/sports/assets/batch",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Duplicate files in the same clipart batch are not allowed",
      rowErrors: [{ row: 2, message: "Duplicate files in the same clipart batch are not allowed" }],
    });
    expect(env.CUSTOMIZATION_ASSETS.put).not.toHaveBeenCalled();
  });

  it("rejects clipart asset listing for a missing category", async () => {
    db.getQueue.push(null);

    const res = await adminClipartRoute.request("/categories/missing/assets", {}, env);

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({
      error: "Clipart category not found",
    });
  });

  it("rejects clipart batch uploads for an inactive category", async () => {
    db.getQueue.push({
      id: "sports",
      name: "Sports",
      active: false,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    });

    const formData = new FormData();
    formData.set("namesJson", JSON.stringify(["Star"]));
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "star.svg",
        { type: "image/svg+xml" },
      ),
    );

    const res = await adminClipartRoute.request(
      "/categories/sports/assets/batch",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Clipart category is inactive",
    });
  });

  it("cleans up persisted clipart batch work when a later file fails", async () => {
    db.getQueue.push({
      id: "sports",
      name: "Sports",
      active: true,
      sortOrder: 0,
      createdAt: 1,
      updatedAt: 1,
    });
    db.returningQueue.push([
      {
        id: "clipart_star",
        categoryId: "sports",
        sourceAssetId: "asset_star",
        name: "Star",
        fileName: "star.svg",
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 128,
        sourceHeightPx: 128,
        active: true,
        createdAt: 10,
        updatedAt: 10,
      },
    ]);
    env.CUSTOMIZATION_ASSETS.put
      .mockImplementationOnce(async () => undefined)
      .mockImplementationOnce(async () => {
        throw new Error("storage failure");
      });

    const formData = new FormData();
    formData.set("namesJson", JSON.stringify(["Star", "Shield"]));
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "star.svg",
        { type: "image/svg+xml" },
      ),
    );
    formData.append(
      "files",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><circle cx="64" cy="64" r="48" fill="#000"/></svg>'],
        "shield.svg",
        { type: "image/svg+xml" },
      ),
    );

    const res = await adminClipartRoute.request(
      "/categories/sports/assets/batch",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to upload clipart batch",
    });
    expect(env.CUSTOMIZATION_ASSETS.delete).toHaveBeenCalledTimes(1);
    expect(db.delete).toHaveBeenCalledTimes(2);
  });

  it("rejects unauthenticated access to the protected clipart route", async () => {
    const res = await adminRoute.request("/customization/clipart/categories", {}, env);

    expect(res.status).toBe(401);
  });

  it("allows authenticated admins to access clipart categories through the protected route", async () => {
    queueAdminSession(db);
    db.selectQueue.push([]);
    db.selectQueue.push([]);

    const res = await adminRoute.request(
      "/customization/clipart/categories",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      env,
    );

    expect(res.status).toBe(200);
  });
});
