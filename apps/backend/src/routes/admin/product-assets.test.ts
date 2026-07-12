import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";

function createMockDb() {
  const insertQueue: unknown[] = [];
  const db: any = {
    insertQueue,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => []),
      })),
    })),
  };
  return db;
}

const env = {
  CUSTOMIZATION_ASSETS: {
    put: vi.fn(async () => undefined),
    delete: vi.fn(async () => undefined),
  },
};

// Mock admin session
vi.mock("../../lib/admin-session", () => ({
  getAdminSession: vi.fn(async () => ({
    user: { id: "user-1" },
  })),
}));

describe("admin product assets routes", () => {
  let db: any;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    env.CUSTOMIZATION_ASSETS.put.mockReset();
    env.CUSTOMIZATION_ASSETS.put.mockImplementation(async () => undefined);
  });

  it("uploads a product asset and returns an absolute contentUrl", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "asset.svg",
        { type: "image/png" }, // fake PNG so it passes mime check
      ),
    );
    formData.append("widthPx", "128");
    formData.append("heightPx", "128");

    // Add a fake origin to the request to test URL resolution
    const res = await adminRoute.request(
      "http://localhost:8787/products/assets",
      {
        method: "POST",
        body: formData,
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.asset).toBeDefined();
    // It should resolve against the requested origin
    expect(data.asset.contentUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/products\/[^\/]+\/content$/);
  });
});
