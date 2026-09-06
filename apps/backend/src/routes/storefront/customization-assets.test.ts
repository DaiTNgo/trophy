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
  const db: any = {
    asset: null,
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(async () => []),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn(async () => db.asset),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(async () => undefined),
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
    env.CUSTOMIZATION_ASSETS.delete.mockReset();
    env.CUSTOMIZATION_ASSETS.delete.mockImplementation(async () => undefined);
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
        headers: {
          "x-upload-token": "token-123",
          "x-shopper-draft-id": "draft-123",
          "x-shopper-field-id": "team-logo",
        }
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.asset).toBeDefined();
    expect(data.asset.contentUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/content$/);
    expect(env.CUSTOMIZATION_ASSETS.put).toHaveBeenCalledWith(
      expect.stringMatching(/^shopper-drafts\/draft-123\/uploads\/team-logo\/.+\.source\.png$/),
      expect.any(ArrayBuffer),
      expect.any(Object),
    );
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
        headers: {
          "x-upload-token": "token-123",
          "x-shopper-draft-id": "draft-123",
          "x-shopper-field-id": "team-logo",
        }
      },
      env,
    );

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.asset).toBeDefined();
    expect(data.asset.contentUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/content$/);
    expect(data.asset.previewUrl).toMatch(/^http:\/\/localhost:8787\/api\/assets\/customizations\/[^\/]+\/preview$/);
  });

  it("rejects uploads without a shopper draft and field owner", async () => {
    const res = await storefrontRoute.request(
      "http://localhost:8787/customizations/assets",
      {
        method: "POST",
        body: new Uint8Array([1, 2, 3]),
        headers: { "content-type": "image/png", "x-upload-token": "token-123" },
      },
      env,
    );

    expect(res.status).toBe(400);
  });

  it("deletes only the current shopper draft asset and its preview", async () => {
    const assetId = "4a30a1ce-95cb-4b85-bded-6a2208e48445";
    db.asset = {
      id: assetId,
      objectKey: "shopper-drafts/draft-123/uploads/team-logo/asset.source.png",
      previewObjectKey: "shopper-drafts/draft-123/uploads/team-logo/asset.preview.webp",
    };

    const res = await storefrontRoute.request(
      `http://localhost:8787/customizations/assets/${assetId}`,
      {
        method: "DELETE",
        headers: {
          "x-upload-token": "token-123",
          "x-shopper-draft-id": "draft-123",
          "x-shopper-field-id": "team-logo",
        },
      },
      env,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(env.CUSTOMIZATION_ASSETS.delete).toHaveBeenCalledWith(
      "shopper-drafts/draft-123/uploads/team-logo/asset.source.png",
    );
    expect(env.CUSTOMIZATION_ASSETS.delete).toHaveBeenCalledWith(
      "shopper-drafts/draft-123/uploads/team-logo/asset.preview.webp",
    );
    expect(db.delete).toHaveBeenCalledOnce();
  });

  it("does not delete an asset outside the shopper draft and field", async () => {
    const assetId = "4a30a1ce-95cb-4b85-bded-6a2208e48445";

    const res = await storefrontRoute.request(
      `http://localhost:8787/customizations/assets/${assetId}`,
      {
        method: "DELETE",
        headers: {
          "x-upload-token": "token-123",
          "x-shopper-draft-id": "another-draft",
          "x-shopper-field-id": "team-logo",
        },
      },
      env,
    );

    expect(res.status).toBe(404);
    expect(env.CUSTOMIZATION_ASSETS.delete).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  it("requires the shopper upload token to delete an asset", async () => {
    const res = await storefrontRoute.request(
      "http://localhost:8787/customizations/assets/4a30a1ce-95cb-4b85-bded-6a2208e48445",
      {
        method: "DELETE",
        headers: {
          "x-shopper-draft-id": "draft-123",
          "x-shopper-field-id": "team-logo",
        },
      },
      env,
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "X-Upload-Token is required" });
    expect(env.CUSTOMIZATION_ASSETS.delete).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });
});
