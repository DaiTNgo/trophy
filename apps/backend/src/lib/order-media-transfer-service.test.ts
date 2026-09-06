import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({
  getDb: vi.fn(),
}));

import { transferOrderItemMedia, isAssetReferencedByOrders } from "./order-media-transfer-service";

describe("order-media-transfer-service", () => {
  let db: any;
  let env: any;
  let mockContext: any;

  beforeEach(() => {
    db = {
      select: vi.fn(),
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue(undefined),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue(undefined),
        })),
      })),
    };

    env = {
      CUSTOMIZATION_ASSETS: {
        get: vi.fn(),
        put: vi.fn().mockResolvedValue(undefined),
      },
    };

    mockContext = {
      env,
      req: {
        url: "http://localhost:8787/api/storefront/orders",
      },
    };
  });

  it("returns unchanged snapshots if customization is null", async () => {
    const result = await transferOrderItemMedia(mockContext, db, {
      order: { id: 1, orderNumber: "ORD-1" },
      item: { id: 10, productId: 100, variantId: 200 },
      backgroundSnapshot: { assetId: "bg-1", previewUrl: "http://example.com/bg.png" },
      customizationSnapshot: null,
    });

    expect(result.hasFailure).toBe(false);
    expect(result.backgroundSnapshot?.previewUrl).toBe("http://example.com/bg.png");
  });

  it("transfers background and upload media, copies R2 objects, and rewrites URLs", async () => {
    const mockR2Body = new ReadableStream();
    env.CUSTOMIZATION_ASSETS.get.mockImplementation(async (key: string) => {
      return {
        body: mockR2Body,
        httpMetadata: { contentType: "image/webp" },
        customMetadata: {},
      };
    });

    // Mock select queries
    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn().mockImplementation(async () => {
            // Check based on call context
            return {
              id: "bg-asset-1",
              objectKey: "catalog/products/100/variants/200/customization-background/bg.source.webp",
              previewObjectKey: "catalog/products/100/variants/200/customization-background/bg.preview.webp",
              mimeType: "image/webp",
            };
          }),
        })),
      })),
    }));

    const result = await transferOrderItemMedia(mockContext, db, {
      order: { id: 1, orderNumber: "ORD-20260906-001" },
      item: { id: 10, productId: 100, variantId: 200 },
      backgroundSnapshot: {
        assetId: "bg-asset-1",
        contentUrl: "http://localhost:8787/api/assets/products/bg-asset-1/content",
        previewUrl: "http://localhost:8787/api/assets/products/bg-asset-1/preview",
        mimeType: "image/webp",
      },
      customizationSnapshot: {
        values: {},
        templateSnapshot: { layers: [], formFields: [] },
      },
    });

    expect(result.hasFailure).toBe(false);
    expect(result.backgroundSnapshot?.contentUrl).toMatch(/\/api\/assets\/orders\/[0-9a-f-]+\/content/);
    expect(result.backgroundSnapshot?.previewUrl).toMatch(/\/api\/assets\/orders\/[0-9a-f-]+\/preview/);

    expect(env.CUSTOMIZATION_ASSETS.put).toHaveBeenCalledWith(
      expect.stringContaining("orders/ORD-20260906-001-1/items/10/background/"),
      mockR2Body,
      expect.any(Object),
    );
  });

  it("handles copy failure gracefully without throwing", async () => {
    env.CUSTOMIZATION_ASSETS.get.mockRejectedValue(new Error("R2 read error"));

    db.select.mockImplementation(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          get: vi.fn().mockResolvedValue({
            id: "bg-asset-1",
            objectKey: "catalog/products/100/variants/200/customization-background/bg.source.webp",
            mimeType: "image/webp",
          }),
        })),
      })),
    }));

    const result = await transferOrderItemMedia(mockContext, db, {
      order: { id: 1, orderNumber: "ORD-20260906-002" },
      item: { id: 10, productId: 100, variantId: 200 },
      backgroundSnapshot: {
        assetId: "bg-asset-1",
        contentUrl: "http://localhost:8787/api/assets/products/bg-asset-1/content",
        previewUrl: "http://localhost:8787/api/assets/products/bg-asset-1/preview",
        mimeType: "image/webp",
      },
      customizationSnapshot: {
        values: {},
        templateSnapshot: { layers: [], formFields: [] },
      },
    });

    expect(result.hasFailure).toBe(true);
    // Even if copy failed, snapshot rewritten to order asset endpoint so retry / fallback can serve it
    expect(result.backgroundSnapshot?.contentUrl).toMatch(/\/api\/assets\/orders\//);
  });
});
