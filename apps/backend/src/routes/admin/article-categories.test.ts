import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

// Mock better-auth so getSession always returns null (force bearer path)
vi.mock("../../lib/auth", () => ({
  getAuth: vi.fn(() => ({
    api: {
      getSession: vi.fn(async () => null),
    },
  })),
}));

// Mock the translation library so hydration lookups don't disturb the queued-select ordering.
vi.mock("../../lib/catalog-translation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/catalog-translation")>();
  return {
    ...actual,
    hydrateTranslations: vi
      .fn()
      .mockImplementation(async (_db, _ownerType, rows) => rows),
  };
});

import { getDb } from "../../db/client";
import { adminArticleCategoriesRoute } from "./article-categories";

function createQueryChain({ getQueue, selectQueue }: { getQueue: unknown[]; selectQueue: unknown[] }) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    values: vi.fn(() => chain),
    set: vi.fn(() => chain),
    run: vi.fn(async () => {}),
    all: vi.fn(async () => selectQueue.shift() ?? []),
  };
  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const db: any = {
    getQueue,
    selectQueue,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
    insert: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
    update: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
    delete: vi.fn(() => createQueryChain({ getQueue, selectQueue })),
  };
  return db;
}

const ADMIN_SESSION_ROW = {
  session: { id: "session-1", token: "token-1", userId: "user-1" },
  user: {
    id: "user-1",
    name: "Admin User",
    username: "admin",
    email: "admin@trophy.local",
    role: "admin",
    banned: false,
  },
};

const AUTH_HEADER = { Authorization: "Bearer token-1" };

// Rows come back from the join query; each article link duplicates the category row.
const CAT_ROW = {
  id: "cat-1",
  name: "Cẩm nang",
  slug: "cam-nang",
  description: "Hướng dẫn và chia sẻ kiến thức",
  displayOrder: 0,
  articleCount: null as string | null,
};

describe("admin article categories routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  it("returns 401 without auth session", async () => {
    const res = await adminArticleCategoriesRoute.request("/", {}, {});
    expect(res.status).toBe(401);
  });

  it("lists categories in display order", async () => {
    db.getQueue.push(ADMIN_SESSION_ROW);
    // Join rows: category "cat-1" linked to one article (articleCount non-null)
    db.selectQueue.push([
      { ...CAT_ROW, articleCount: "c-article-1" },
    ]);

    const res = await adminArticleCategoriesRoute.request("/", { headers: AUTH_HEADER }, {});
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Cẩm nang");
    expect(body.items[0].slug).toBe("cam-nang");
    expect(body.items[0].articleCount).toBe(1);
  });

  it("reports zero article count for an unlinked category", async () => {
    db.getQueue.push(ADMIN_SESSION_ROW);
    // Single join row where the article column is null → no links
    db.selectQueue.push([
      { ...CAT_ROW, articleCount: null },
    ]);

    const res = await adminArticleCategoriesRoute.request("/", { headers: AUTH_HEADER }, {});
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].articleCount).toBe(0);
  });
});
