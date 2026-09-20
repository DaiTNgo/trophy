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

// Mock the translation library: pass rows through unchanged so translation lookups
// don't disturb the queued-select ordering, and record calls for contract assertions.
vi.mock("../../lib/catalog-translation", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../../lib/catalog-translation")>();
  return {
    ...actual,
    upsertTranslations: vi.fn().mockResolvedValue(undefined),
    hydrateTranslations: vi
      .fn()
      .mockImplementation(async (_db, _ownerType, rows) => rows),
    hydrateAndResolveTranslations: vi
      .fn()
      .mockImplementation(async (_db, _ownerType, rows) => rows),
  };
});

import { getDb } from "../../db/client";
import {
  hydrateAndResolveTranslations,
  hydrateTranslations,
  upsertTranslations,
} from "../../lib/catalog-translation";
import { adminArticlesRoute } from "./articles";
import { storefrontArticlesRoute } from "../storefront/articles";

// ─── Mock DB helpers ───────────────────────────────────────────────────────────

type MutationRecord = {
  kind: "insert" | "update" | "delete";
  values?: unknown;
  set?: unknown;
};

function createQueryChain({
  getQueue,
  selectQueue,
  mutations,
  wheres,
  kind,
}: {
  getQueue: unknown[];
  selectQueue: unknown[];
  mutations: MutationRecord[];
  wheres: unknown[];
  kind?: MutationRecord["kind"];
}) {
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn((condition: unknown) => {
      wheres.push(condition);
      if (kind === "delete") mutations.push({ kind });
      return chain;
    }),
    innerJoin: vi.fn(() => chain),
    leftJoin: vi.fn(() => chain),
    groupBy: vi.fn(() => chain),
    having: vi.fn(() => chain),
    orderBy: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    offset: vi.fn(() => chain),
    returning: vi.fn(async () => []),
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
    run: vi.fn(async () => {}),
    // all() is used in non-get select chains
    all: vi.fn(async () => selectQueue.shift() ?? []),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return chain;
}

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const mutations: MutationRecord[] = [];
  const wheres: unknown[] = [];

  const db: any = {
    getQueue,
    selectQueue,
    mutations,
    wheres,
    select: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, wheres })),
    insert: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, wheres, kind: "insert" })),
    update: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, wheres, kind: "update" })),
    delete: vi.fn(() => createQueryChain({ getQueue, selectQueue, mutations, wheres, kind: "delete" })),
  };

  return db;
}

/** Collects primitive values (drizzle SQL params) from an object graph, cycle-safe. */
function sqlParamValues(root: any): string[] {
  const out: string[] = [];
  const seen = new WeakSet<object>();
  const walk = (val: unknown) => {
    if (val === undefined || val === null) return;
    if (typeof val === "string" || typeof val === "number") {
      out.push(String(val));
      return;
    }
    if (typeof val !== "object") return;
    if (seen.has(val)) return;
    seen.add(val);
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    for (const v of Object.values(val)) walk(v);
  };
  walk(root);
  return out;
}

const ADMIN_SESSION_ROW = {
  session: {
    id: "session-1",
    token: "token-1",
    userId: "user-1",
    expiresAt: new Date(Date.now() + 60_000),
  },
  user: {
    id: "user-1",
    name: "Admin User",
    username: "admin",
    email: "admin@trophy.local",
    role: "admin",
    banned: false,
  },
};

/**
 * Queue the bearer-token session row — route calls `.select().from().innerJoin().where().get()`
 * to resolve the bearer token to a user session.
 */
function queueAdminSession(db: ReturnType<typeof createMockDb>) {
  db.getQueue.push(ADMIN_SESSION_ROW);
}

const AUTH_HEADER = { Authorization: "Bearer token-1" };

const SAMPLE_ARTICLE = {
  id: "c-article-1",
  title: "Quà Tặng Khánh Thành Ý Nghĩa",
  slug: "qua-tang-khanh-thanh-y-nghia",
  excerpt: "Tìm hiểu về các mẫu quà tặng ý nghĩa cho lễ khánh thành nhà máy.",
  contentHtml: "<h2>Giới thiệu</h2><p>Nội dung bài viết.</p>",
  contentJson: null,
  featuredImageUrl: null,
  featuredImageAlt: null,
  status: "published",
  featured: false,
  authorId: "user-1",
  publishedAt: new Date("2026-09-08T12:00:00Z"),
  metaTitle: null,
  metaDescription: null,
  ogImageUrl: null,
  canonicalUrl: null,
  viewCount: 0,
  createdAt: new Date("2026-09-08T10:00:00Z"),
  updatedAt: new Date("2026-09-08T10:00:00Z"),
};

const env = {};

// ─── Admin Articles Routes ─────────────────────────────────────────────────────

describe("admin articles routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  describe("GET / (list articles)", () => {
    it("returns 401 without auth session", async () => {
      // No session queued, bearer token lookup returns null
      const res = await adminArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(401);
    });

    it("lists articles with pagination defaults", async () => {
      queueAdminSession(db);
      // List query — uses .all()
      db.selectQueue.push([
        {
          article: SAMPLE_ARTICLE,
          authorName: "Admin User",
          authorUsername: "admin",
        },
      ]);
      // Count query — uses .get()
      db.getQueue.push({ count: 1 });
      // Category links — uses .all()
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request(
        "/",
        { headers: AUTH_HEADER },
        env,
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
      expect(body.total).toBe(1);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].slug).toBe("qua-tang-khanh-thanh-y-nghia");
    });

    it("flips due scheduled articles to published in the admin list so the status badge stays accurate", async () => {
      queueAdminSession(db);
      // List query
      db.selectQueue.push([
        {
          article: {
            ...SAMPLE_ARTICLE,
            status: "scheduled",
            publishedAt: new Date(Date.now() - 60_000),
          },
          authorName: "Admin User",
          authorUsername: "admin",
        },
      ]);
      // Count query
      db.getQueue.push({ count: 1 });
      // Category links
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request(
        "/",
        { headers: AUTH_HEADER },
        env,
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items[0].status).toBe("published");

      const flip = db.mutations.find((m: MutationRecord) => m.kind === "update");
      expect((flip?.set as { status: string }).status).toBe("published");
    });
  });

  describe("POST / (create article)", () => {
    it("returns 401 without auth session", async () => {
      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Test" }),
      }, env);
      expect(res.status).toBe(401);
    });

    it("creates article and returns 201 with generated slug", async () => {
      queueAdminSession(db);
      // slug collision check returns null (slug is available)
      db.getQueue.push(null);
      // insert confirmation get
      db.getQueue.push(SAMPLE_ARTICLE);

      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ title: "Quà Tặng Khánh Thành Ý Nghĩa" }),
      }, env);

      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.slug).toBe("qua-tang-khanh-thanh-y-nghia");
      expect(body.status).toBe("published");
      expect(db.mutations.some((m: MutationRecord) => m.kind === "insert")).toBe(true);
    });

    it("returns 400 for empty title", async () => {
      queueAdminSession(db);
      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ title: "" }),
      }, env);
      expect(res.status).toBe(400);
    });

    it("stamps publishedAt as now when created as published without an explicit date", async () => {
      queueAdminSession(db);
      // slug collision check returns null (slug is available)
      db.getQueue.push(null);
      // insert confirmation get
      db.getQueue.push(SAMPLE_ARTICLE);

      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ title: "Bài viết mới", status: "published" }),
      }, env);

      expect(res.status).toBe(201);
      const insert = db.mutations.find((m: MutationRecord) => m.kind === "insert");
      const values = insert?.values as { status: string; publishedAt: Date | null };
      expect(values.status).toBe("published");
      expect(values.publishedAt).toBeInstanceOf(Date);
      expect((values.publishedAt as Date).getTime()).toBeGreaterThan(Date.now() - 5_000);
    });

    it("leaves publishedAt null when created as a draft", async () => {
      queueAdminSession(db);
      db.getQueue.push(null);
      db.getQueue.push({ ...SAMPLE_ARTICLE, status: "draft" });

      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ title: "Bản nháp" }),
      }, env);

      expect(res.status).toBe(201);
      const insert = db.mutations.find((m: MutationRecord) => m.kind === "insert");
      const values = insert?.values as { status: string; publishedAt: Date | null };
      expect(values.status).toBe("draft");
      expect(values.publishedAt).toBeNull();
    });

    it("persists the featured flag when created as featured", async () => {
      queueAdminSession(db);
      db.getQueue.push(null);
      db.getQueue.push({ ...SAMPLE_ARTICLE, featured: true });

      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ title: "Bài viết nổi bật", featured: true }),
      }, env);

      expect(res.status).toBe(201);
      const insert = db.mutations.find((m: MutationRecord) => m.kind === "insert");
      const values = insert?.values as { featured: boolean };
      expect(values.featured).toBe(true);
    });

    it("stores the VI translation as canonical and persists per-locale translations", async () => {
      queueAdminSession(db);
      db.getQueue.push(null);
      db.getQueue.push({ ...SAMPLE_ARTICLE, title: "Vi Tiêu Đề", slug: "vi-tieu-de" });

      const res = await adminArticlesRoute.request("/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({
          title: "Vi Tiêu Đề",
          titleTranslations: { vi: "Vi Tiêu Đề", en: "English Title" },
          contentHtml: "<p>Nội dung</p>",
          contentHtmlTranslations: { vi: "<p>Nội dung</p>", en: "<p>Content</p>" },
        }),
      }, env);

      expect(res.status).toBe(201);
      const insert = db.mutations.find((m: MutationRecord) => m.kind === "insert");
      const values = insert?.values as { title: string; contentHtml: string; slug: string };
      expect(values.title).toBe("Vi Tiêu Đề");
      expect(values.contentHtml).toBe("<p>Nội dung</p>");

      const upsertCalls = vi.mocked(upsertTranslations).mock.calls;
      const titleCalls = upsertCalls.filter((call) => call[3] === "title");
      expect(titleCalls).toHaveLength(1);
      expect(titleCalls[0][0]).toBe(db);
      expect(titleCalls[0][1]).toBe("article");
      expect(titleCalls[0][4]).toEqual({ vi: "Vi Tiêu Đề", en: "English Title" });
      const contentCalls = upsertCalls.filter((call) => call[3] === "contentHtml");
      expect(contentCalls).toHaveLength(1);
      expect(contentCalls[0][4]).toEqual({ vi: "<p>Nội dung</p>", en: "<p>Content</p>" });
    });
  });

  describe("GET /:id (get article)", () => {
    it("returns 404 for unknown id", async () => {
      queueAdminSession(db);
      db.getQueue.push(null); // article .select().get() returns null

      const res = await adminArticlesRoute.request(
        "/nonexistent-id",
        { headers: AUTH_HEADER },
        env,
      );
      expect(res.status).toBe(404);
    });

    it("returns 200 with full article details including categories and productIds", async () => {
      queueAdminSession(db);
      // Article row — route uses .select().from().leftJoin().where().get()
      db.getQueue.push({
        article: SAMPLE_ARTICLE,
        authorName: "Admin User",
        authorUsername: "admin",
      });
      // Category links — .all()
      db.selectQueue.push([
        { catId: "cat-1", catName: "Cẩm nang", catSlug: "cam-nang" },
      ]);
      // Product links — .all()
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request(
        "/c-article-1",
        { headers: AUTH_HEADER },
        env,
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.id).toBe("c-article-1");
      expect(body.contentHtml).toContain("<h2>Giới thiệu</h2>");
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0].slug).toBe("cam-nang");
      expect(body.productIds).toEqual([]);
      expect(body.featured).toBe(false);
    });

    it("hydrates all editable localized fields for the editor", async () => {
      queueAdminSession(db);
      db.getQueue.push({
        article: SAMPLE_ARTICLE,
        authorName: "Admin User",
        authorUsername: "admin",
      });
      db.selectQueue.push([]);
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request(
        "/c-article-1",
        { headers: AUTH_HEADER },
        env,
      );
      expect(res.status).toBe(200);

      const hydrateCalls = vi.mocked(hydrateTranslations).mock.calls;
      const articleCall = hydrateCalls.find(
        (call) => call[1] === "article" && call[2].length === 1,
      );
      expect(articleCall).toBeDefined();
      const fields = articleCall![4] as Array<{ fieldName: string }>;
      expect(fields.map((f) => f.fieldName)).toEqual([
        "title",
        "excerpt",
        "contentHtml",
        "contentJson",
        "featuredImageAlt",
        "metaTitle",
        "metaDescription",
      ]);
    });
  });


  describe("PATCH /:id (update article)", () => {
    it("returns 401 without auth", async () => {
      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Updated" }),
      }, env);
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown article", async () => {
      queueAdminSession(db);
      db.selectQueue.push(null); // article not found

      const res = await adminArticlesRoute.request("/nonexistent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ status: "published" }),
      }, env);
      expect(res.status).toBe(404);
    });

    it("publishes a draft article and stamps publishedAt so it is visible on the storefront", async () => {
      queueAdminSession(db);
      // existing check — route uses .select().from().where().get()
      db.getQueue.push({ id: "c-article-1", slug: "qua-tang-khanh-thanh-y-nghia", publishedAt: null });
      // After update — select for response via .get()
      db.getQueue.push({
        article: { ...SAMPLE_ARTICLE, status: "published" },
        authorName: "Admin User",
        authorUsername: "admin",
      });
      // Category links
      db.selectQueue.push([]);
      // Product links
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ status: "published" }),
      }, env);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.status).toBe("published");
      const update = db.mutations.find((m: MutationRecord) => m.kind === "update");
      const set = update?.set as { status: string; publishedAt: Date };
      expect(set.publishedAt).toBeInstanceOf(Date);
      expect(set.publishedAt.getTime()).toBeGreaterThan(Date.now() - 5_000);
    });

    it("rejects scheduling without a publish time so the article can auto-publish later", async () => {
      queueAdminSession(db);
      const existing = {
        id: "c-article-1",
        slug: "qua-tang-khanh-thanh-y-nghia",
        publishedAt: null,
        status: "draft",
        title: "Quà Tặng Khánh Thành Ý Nghĩa",
      };
      db.getQueue.push(existing);

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ status: "scheduled" }),
      }, env);

      expect(res.status).toBe(400);
      const body = await res.json() as any;
      expect(body.error).toContain("publish date is required");
    });

    it("keeps the existing publishedAt when an already published article is re-saved as published", async () => {
      queueAdminSession(db);
      // existing check
      db.getQueue.push({
        id: "c-article-1",
        slug: "qua-tang-khanh-thanh-y-nghia",
        publishedAt: SAMPLE_ARTICLE.publishedAt,
      });
      // slug conflict check returns null (new slug is available)
      db.getQueue.push(null);
      // After update — select for response
      db.getQueue.push({
        article: SAMPLE_ARTICLE,
        authorName: "Admin User",
        authorUsername: "admin",
      });
      // Category links
      db.selectQueue.push([]);
      // Product links
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ status: "published", title: "Giữ nguyên ngày xuất bản" }),
      }, env);

      expect(res.status).toBe(200);
      const update = db.mutations.find((m: MutationRecord) => m.kind === "update");
      const set = update?.set as { publishedAt?: Date };
      expect(set.publishedAt).toBeUndefined();
    });

    it("sets the featured flag when the operator pins the article", async () => {
      queueAdminSession(db);
      db.getQueue.push({
        id: "c-article-1",
        slug: "qua-tang-khanh-thanh-y-nghia",
        publishedAt: SAMPLE_ARTICLE.publishedAt,
      });
      // After update — select for response
      db.getQueue.push({
        article: { ...SAMPLE_ARTICLE, featured: true },
        authorName: "Admin User",
        authorUsername: "admin",
      });
      db.selectQueue.push([]);
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({ featured: true }),
      }, env);

      expect(res.status).toBe(200);
      const update = db.mutations.find((m: MutationRecord) => m.kind === "update");
      const set = update?.set as { featured: boolean };
      expect(set.featured).toBe(true);
    });

    it("syncs the canonical title and slug from the VI translation when only translations are sent", async () => {
      queueAdminSession(db);
      // existing check
      db.getQueue.push({
        id: "c-article-1",
        slug: "qua-tang-khanh-thanh-y-nghia",
        publishedAt: SAMPLE_ARTICLE.publishedAt,
      });
      // slug conflict check returns null (new slug is available)
      db.getQueue.push(null);
      // After update — select for response
      db.getQueue.push({
        article: { ...SAMPLE_ARTICLE, title: "Tiêu Đề Mới", slug: "tieu-de-moi" },
        authorName: "Admin User",
        authorUsername: "admin",
      });
      db.selectQueue.push([]);
      db.selectQueue.push([]);

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...AUTH_HEADER },
        body: JSON.stringify({
          titleTranslations: { vi: "Tiêu Đề Mới", en: "New Title" },
        }),
      }, env);

      expect(res.status).toBe(200);
      const update = db.mutations.find((m: MutationRecord) => m.kind === "update");
      const set = update?.set as { title?: string; slug?: string };
      expect(set.title).toBe("Tiêu Đề Mới");
      expect(set.slug).toBe("tieu-de-moi");

      const titleCalls = vi.mocked(upsertTranslations).mock.calls.filter(
        (call) => call[3] === "title",
      );
      expect(titleCalls).toHaveLength(1);
      expect(titleCalls[0][1]).toBe("article");
      expect(titleCalls[0][2]).toBe("c-article-1");
      expect(titleCalls[0][4]).toEqual({ vi: "Tiêu Đề Mới", en: "New Title" });
    });
  });

  describe("DELETE /:id", () => {
    it("returns 401 without auth", async () => {
      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "DELETE",
      }, env);
      expect(res.status).toBe(401);
    });

    it("returns 404 for unknown article", async () => {
      queueAdminSession(db);
      db.getQueue.push(null); // article select .get() returns null

      const res = await adminArticlesRoute.request("/nonexistent", {
        method: "DELETE",
        headers: AUTH_HEADER,
      }, env);
      expect(res.status).toBe(404);
    });

    it("deletes article and returns 200", async () => {
      queueAdminSession(db);
      db.getQueue.push({ id: "c-article-1" }); // existing check via .get()

      const res = await adminArticlesRoute.request("/c-article-1", {
        method: "DELETE",
        headers: AUTH_HEADER,
      }, env);

      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.success).toBe(true);
      expect(db.mutations.some((m: MutationRecord) => m.kind === "delete")).toBe(true);
    });

  });
});

// ─── Storefront Articles Routes ────────────────────────────────────────────────

describe("storefront articles routes", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
  });

  describe("GET / (public article listing)", () => {
    it("returns published articles in listing", async () => {
      // List query
      db.selectQueue.push([
        {
          article: SAMPLE_ARTICLE,
          authorName: "Admin User",
        },
      ]);
      // Count
      db.getQueue.push({ count: 1 });
      // Category links
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.items[0].slug).toBe("qua-tang-khanh-thanh-y-nghia");
      expect(body.items[0].featured).toBe(false);
    });

    it("returns the featured flag on listed articles", async () => {
      db.selectQueue.push([
        {
          article: { ...SAMPLE_ARTICLE, featured: true },
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items[0].featured).toBe(true);
    });

    it("includes scheduled (not yet flipped) articles whose publish time has arrived in the live query", async () => {
      db.selectQueue.push([
        {
          article: {
            ...SAMPLE_ARTICLE,
            status: "scheduled",
            publishedAt: new Date(Date.now() - 60_000),
          },
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);

      const listPredicateValues = sqlParamValues(db.wheres[0]);
      expect(listPredicateValues).toContain("published");
      expect(listPredicateValues).toContain("scheduled");
    });

    it("flips a due scheduled article to published during the listing read", async () => {
      db.selectQueue.push([
        {
          article: {
            ...SAMPLE_ARTICLE,
            status: "scheduled",
            publishedAt: new Date(Date.now() - 60_000),
          },
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items[0].status).toBe("published");

      const flip = db.mutations.find((m: MutationRecord) => m.kind === "update");
      const set = flip?.set as { status: string; updatedAt: Date };
      expect(set.status).toBe("published");
      expect(set.updatedAt).toBeInstanceOf(Date);
    });

    it("leaves a scheduled article as scheduled while its publish time is still in the future", async () => {
      db.selectQueue.push([
        {
          article: {
            ...SAMPLE_ARTICLE,
            status: "scheduled",
            publishedAt: new Date(Date.now() + 60_000),
          },
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items[0].status).toBe("scheduled");
      expect(db.mutations.some((m: MutationRecord) => m.kind === "update")).toBe(false);
    });

    it("returns empty list when category slug does not exist", async () => {
      // Category lookup returns null → no articles
      db.getQueue.push(null);

      const res = await storefrontArticlesRoute.request("/?category=nonexistent-cat", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items).toEqual([]);
      expect(body.total).toBe(0);
    });

    it("includes readingTimeMinutes estimate", async () => {
      const longContent = "<p>" + "word ".repeat(400) + "</p>";
      db.selectQueue.push([
        {
          article: { ...SAMPLE_ARTICLE, contentHtml: longContent },
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/", {}, env);
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.items[0].readingTimeMinutes).toBeGreaterThan(1);
    });
  });

  describe("GET /categories (public article categories)", () => {
    it("returns categories that have published articles with their counts", async () => {
      // Aggregated rows from the category+published-article count query
      db.selectQueue.push([
        {
          id: "cat-1",
          name: "Cẩm nang",
          slug: "cam-nang",
          description: "Hướng dẫn và chia sẻ kiến thức",
          displayOrder: 0,
          articleCount: 2,
        },
      ]);

      const res = await storefrontArticlesRoute.request("/categories", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items).toHaveLength(1);
      expect(body.items[0].slug).toBe("cam-nang");
      expect(body.items[0].articleCount).toBe(2);
    });

    it("returns an empty list when no categories have published articles", async () => {
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request("/categories", {}, env);
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.items).toEqual([]);
    });
  });

  describe("GET /:slug (article detail)", () => {
    it("returns 404 for a draft / unpublished article slug", async () => {
      db.getQueue.push(null); // no matching published article

      const res = await storefrontArticlesRoute.request("/draft-article-slug", {}, env);
      expect(res.status).toBe(404);
    });

    it("returns 404 for unknown slug", async () => {
      db.getQueue.push(null);

      const res = await storefrontArticlesRoute.request("/unknown-slug", {}, env);
      expect(res.status).toBe(404);
    });

    it("resolves a scheduled article whose publish time has arrived via the detail query", async () => {
      db.getQueue.push({
        article: {
          ...SAMPLE_ARTICLE,
          status: "scheduled",
          publishedAt: new Date(Date.now() - 30_000),
        },
        authorName: "Admin User",
      });
      db.selectQueue.push([]);
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request(
        "/qua-tang-khanh-thanh-y-nghia",
        {},
        env,
      );
      expect(res.status).toBe(200);

      const detailPredicateValues = sqlParamValues(db.wheres[0]);
      expect(detailPredicateValues).toContain("scheduled");

      const body = await res.json() as any;
      expect(body.status).toBe("published");

      const flip = db.mutations.find((m: MutationRecord) => m.kind === "update");
      expect((flip?.set as { status: string }).status).toBe("published");
    });

    it("returns full article detail with SEO fields and categories", async () => {
      // Article row — route uses .select().from().leftJoin().where().get()
      db.getQueue.push({
        article: SAMPLE_ARTICLE,
        authorName: "Admin User",
      });
      // Category links — parallel .all()
      db.selectQueue.push([
        { catId: "cat-1", catName: "Cẩm nang", catSlug: "cam-nang" },
      ]);
      // Product links — parallel .all()
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request(
        "/qua-tang-khanh-thanh-y-nghia",
        {},
        env,
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect(body.slug).toBe("qua-tang-khanh-thanh-y-nghia");
      expect(body.contentHtml).toContain("<h2>Giới thiệu</h2>");
      expect(body.categories).toHaveLength(1);
      expect(body.categories[0].name).toBe("Cẩm nang");
      expect(body.linkedProducts).toEqual([]);
      // SEO fields present
      expect("metaTitle" in body).toBe(true);
      expect("metaDescription" in body).toBe(true);
      expect("ogImageUrl" in body).toBe(true);
      expect(body.featured).toBe(false);
    });

    it("does not expose contentJson to public storefront consumers", async () => {
      // Article row via .get()
      db.getQueue.push({
        article: { ...SAMPLE_ARTICLE, contentJson: '{"type":"doc"}' },
        authorName: "Admin User",
      });
      // Category links
      db.selectQueue.push([]);
      // Product links
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request(
        "/qua-tang-khanh-thanh-y-nghia",
        {},
        env,
      );
      expect(res.status).toBe(200);

      const body = await res.json() as any;
      expect("contentJson" in body).toBe(false);
    });

    it("resolves localized article fields per requested locale", async () => {
      db.getQueue.push({
        article: SAMPLE_ARTICLE,
        authorName: "Admin User",
      });
      db.selectQueue.push([
        { catId: "cat-1", catName: "Cẩm nang", catSlug: "cam-nang" },
      ]);
      db.selectQueue.push([]);

      const res = await storefrontArticlesRoute.request(
        "/qua-tang-khanh-thanh-y-nghia?locale=en",
        {},
        env,
      );
      expect(res.status).toBe(200);

      const resolveCalls = vi.mocked(hydrateAndResolveTranslations).mock.calls;
      const articleCall = resolveCalls.find((call) => call[1] === "article");
      expect(articleCall).toBeDefined();
      expect(articleCall![6]).toBe("en");
      const fields = articleCall![4] as Array<{ fieldName: string }>;
      expect(fields.map((f) => f.fieldName)).toEqual([
        "title",
        "excerpt",
        "contentHtml",
        "featuredImageAlt",
        "metaTitle",
        "metaDescription",
      ]);
    });

    it("resolves the title and excerpt of listed articles per requested locale", async () => {
      db.selectQueue.push([
        {
          article: SAMPLE_ARTICLE,
          authorName: "Admin User",
        },
      ]);
      db.getQueue.push({ count: 1 });
      // Category links for the listed article
      db.selectQueue.push([
        { articleId: "c-article-1", catId: "cat-1", catName: "Cẩm nang", catSlug: "cam-nang" },
      ]);

      const res = await storefrontArticlesRoute.request("/?locale=en", {}, env);
      expect(res.status).toBe(200);

      const resolveCalls = vi.mocked(hydrateAndResolveTranslations).mock.calls;
      const articleCall = resolveCalls.find((call) => call[1] === "article");
      expect(articleCall).toBeDefined();
      expect(articleCall![6]).toBe("en");
      const fields = articleCall![4] as Array<{ fieldName: string }>;
      expect(fields.map((f) => f.fieldName)).toEqual(["title", "excerpt"]);
    });
  });

  describe("GET /categories locale resolution", () => {
    it("resolves category names and descriptions per requested locale", async () => {
      db.selectQueue.push([
        {
          id: "cat-1",
          name: "Cẩm nang",
          slug: "cam-nang",
          description: "Hướng dẫn và chia sẻ kiến thức",
          displayOrder: 0,
          articleCount: 2,
        },
      ]);

      const res = await storefrontArticlesRoute.request("/categories?locale=en", {}, env);
      expect(res.status).toBe(200);

      const resolveCalls = vi.mocked(hydrateAndResolveTranslations).mock.calls;
      const categoryCall = resolveCalls.find(
        (call) => call[1] === "article_category",
      );
      expect(categoryCall).toBeDefined();
      expect(categoryCall![6]).toBe("en");
      const fields = categoryCall![4] as Array<{ fieldName: string }>;
      expect(fields.map((f) => f.fieldName)).toEqual(["name", "description"]);
    });
  });
});

