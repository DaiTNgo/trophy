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
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    returning: vi.fn(async () => returningQueue.shift() ?? []),
    get: vi.fn(async () => getQueue.shift() ?? null),
    values: vi.fn((value: unknown) => {
      if (kind) mutations.push({ kind, values: value });
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

describe("admin brand assets routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  it("lists brand colors", async () => {
    db.selectQueue.push([{ id: "gold", name: "Gold", hexCode: "#FFD700" }]);

    const res = await adminBrandAssetsRoute.request("/colors", {}, env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      colors: [{ id: "gold", name: "Gold", hexCode: "#FFD700" }],
    });
  });

  it("creates a font family", async () => {
    db.returningQueue.push([
      {
        id: "champion-serif",
        name: "Champion Serif",
        regularAssetId: "font_regular",
        boldAssetId: null,
        italicAssetId: null,
        boldItalicAssetId: null,
      },
    ]);

    const res = await adminBrandAssetsRoute.request("/fonts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "champion-serif",
        name: "Champion Serif",
        regularAssetId: "font_regular",
      }),
    });

    expect(res.status).toBe(200);
    expect(
      db.mutations.some(
        (entry: MutationRecord) =>
          entry.kind === "insert" &&
          (entry.values as { id?: string; name?: string } | undefined)?.id === "champion-serif",
      ),
    ).toBe(true);
  });

  it("does not expose the removed legacy icon route directly", async () => {
    const res = await adminBrandAssetsRoute.request("/icons", {}, env);
    expect(res.status).toBe(404);
  });

  it("does not expose the removed legacy icon route through admin routing", async () => {
    queueAdminSession(db);

    const res = await adminRoute.request(
      "/brand-assets/icons",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      env,
    );

    expect(res.status).toBe(404);
  });
});
