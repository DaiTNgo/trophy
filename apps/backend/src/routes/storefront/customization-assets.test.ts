import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));
vi.mock("../../lib/image-dimensions", () => ({
  readImageDimensions: vi.fn(() => ({ width: 128, height: 128 })),
}));

import { getDb } from "../../db/client";
import { storefrontRoute } from "./index";

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

describe("storefront customization assets routes", () => {
  let db: any;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    env.CUSTOMIZATION_ASSETS.put.mockReset();
    env.CUSTOMIZATION_ASSETS.put.mockImplementation(async () => undefined);
  });

  it("uploads a customization asset and returns an absolute contentUrl", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "asset.svg",
        { type: "image/png" },
      ),
    );
    formData.append("width", "128");
    formData.append("height", "128");

    const res = await storefrontRoute.request(
      "http://localhost:8787/customizations/assets",
      {
        method: "POST",
        body: formData,
        headers: { "x-upload-token": "token-123" }
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.asset).toBeDefined();
    expect(data.asset.contentUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/content$/);
  });

  it("returns absolute previewUrl when thumbnail is provided", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(
        ["%PDF-1.4"],
        "asset.pdf",
        { type: "application/pdf" },
      ),
    );
    formData.append(
      "thumbnail",
      new File(
        ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" fill="#000"/></svg>'],
        "thumb.png",
        { type: "image/png" },
      ),
    );
    formData.append("width", "128");
    formData.append("height", "128");
    formData.append("pageCount", "1");

    const res = await storefrontRoute.request(
      "http://localhost:8787/customizations/assets",
      {
        method: "POST",
        body: formData,
        headers: { "x-upload-token": "token-123" }
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.asset).toBeDefined();
    expect(data.asset.contentUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/content$/);
    expect(data.asset.previewUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/preview$/);
  });
});
