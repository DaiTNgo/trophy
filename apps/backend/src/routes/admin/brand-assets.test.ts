import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";
import { adminBrandAssetsRoute } from "./brand-assets";

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
  },
};

describe("admin brand asset icon routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    env.CUSTOMIZATION_ASSETS.put.mockClear();
  });

  it("lists icon assets", async () => {
    db.selectQueue.push([
      {
        id: "icon_star",
        sourceAssetId: "asset_star",
        name: "Star",
        categoryId: "sports",
        categoryLabel: "Sports",
        tagsJson: JSON.stringify(["badge"]),
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 200,
        sourceHeightPx: 200,
        active: true,
        createdAt: 1,
        updatedAt: 2,
      },
    ]);

    const res = await adminBrandAssetsRoute.request("/icons", {}, env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      icons: [
        {
          id: "icon_star",
          sourceAssetId: "asset_star",
          name: "Star",
          categoryId: "sports",
          categoryLabel: "Sports",
          tags: ["badge"],
          previewUrl: "/api/assets/customizations/asset_star/content",
          mimeType: "image/svg+xml",
          sourceWidthPx: 200,
          sourceHeightPx: 200,
          active: true,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
    });
  });

  it("uploads and creates an icon asset", async () => {
    db.returningQueue.push([
      {
        id: "icon_created",
        sourceAssetId: "asset_created",
        name: "Shield",
        categoryId: "sports",
        categoryLabel: "Sports",
        tagsJson: JSON.stringify(["shield", "award"]),
        previewUrl: "/api/assets/customizations/asset_created/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 128,
        sourceHeightPx: 128,
        active: true,
        createdAt: 10,
        updatedAt: 10,
      },
    ]);

    const formData = new FormData();
    formData.set("name", "Shield");
    formData.set("categoryId", "sports");
    formData.set("categoryLabel", "Sports");
    formData.set("tags", "shield,award");
    formData.set(
      "file",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "shield.svg",
        { type: "image/svg+xml" },
      ),
    );

    const res = await adminBrandAssetsRoute.request(
      "/icons",
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
          (entry.values as { sourceAssetId?: string; name?: string } | undefined)?.name === "Shield",
      ),
    ).toBe(true);
  });

  it("updates icon metadata", async () => {
    db.returningQueue.push([
      {
        id: "icon_star",
        sourceAssetId: "asset_star",
        name: "Updated Star",
        categoryId: "sports",
        categoryLabel: "Sports",
        tagsJson: JSON.stringify(["updated"]),
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 200,
        sourceHeightPx: 200,
        active: true,
        createdAt: 1,
        updatedAt: 3,
      },
    ]);

    const res = await adminBrandAssetsRoute.request("/icons/icon_star", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Updated Star",
        tags: ["updated"],
      }),
    });

    expect(res.status).toBe(200);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "update" &&
          (entry.set as { name?: string; tagsJson?: string } | undefined)?.name === "Updated Star",
      ),
    ).toBe(true);
  });

  it("deactivates an icon asset", async () => {
    db.returningQueue.push([
      {
        id: "icon_star",
        sourceAssetId: "asset_star",
        name: "Star",
        categoryId: "sports",
        categoryLabel: "Sports",
        tagsJson: JSON.stringify(["badge"]),
        previewUrl: "/api/assets/customizations/asset_star/content",
        mimeType: "image/svg+xml",
        sourceWidthPx: 200,
        sourceHeightPx: 200,
        active: false,
        createdAt: 1,
        updatedAt: 4,
      },
    ]);

    const res = await adminBrandAssetsRoute.request("/icons/icon_star", {
      method: "DELETE",
    });

    expect(res.status).toBe(200);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "update" &&
          (entry.set as { active?: boolean } | undefined)?.active === false,
      ),
    ).toBe(true);
  });

  it("rejects unauthorized admin icon access", async () => {
    const res = await adminRoute.request("/brand-assets/icons", {}, env);
    expect(res.status).toBe(401);
  });

  it("rejects unsupported icon file types", async () => {
    const formData = new FormData();
    formData.set("name", "Animated");
    formData.set("file", new File(["gif89a"], "animated.gif", { type: "image/gif" }));

    const res = await adminBrandAssetsRoute.request(
      "/icons",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(415);
    await expect(res.json()).resolves.toEqual({
      error: "Only SVG, PNG, and WebP icon assets are supported.",
    });
  });

  it("allows authenticated admins to list icons through the protected route", async () => {
    queueAdminSession(db);
    db.selectQueue.push([]);

    const res = await adminRoute.request(
      "/brand-assets/icons",
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
