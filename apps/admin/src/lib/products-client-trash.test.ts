import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => ({
  listTrash: vi.fn(),
  softDelete: vi.fn(),
  restore: vi.fn(),
  permanentDelete: vi.fn(),
}));

vi.mock("./backend-client", () => ({
  backendClient: {
    api: {
      admin: {
        products: {
          trash: { $get: rpc.listTrash },
          ":id": {
            $delete: rpc.softDelete,
            restore: { $post: rpc.restore },
            permanent: { $delete: rpc.permanentDelete },
          },
        },
      },
    },
  },
}));

vi.mock("./fetch", () => ({
  BACKEND_URL: "http://localhost:8787",
  backendFetch: vi.fn(),
}));

import {
  deleteProduct,
  fetchTrashedProducts,
  permanentlyDeleteProduct,
  restoreProduct,
} from "./products-client";

const jsonResponse = (body: unknown, ok = true) => ({
  ok,
  json: async () => body,
});

describe("product trash client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps the Hono Product Trash response for the admin table", async () => {
    rpc.listTrash.mockResolvedValue(jsonResponse({
      items: [{
        id: 7,
        title: { vi: "Cúp vô địch", en: "Champion cup" },
        handle: "champion-cup",
        status: "published",
        deletedAt: "2026-08-07T00:00:00.000Z",
      }],
    }));

    await expect(fetchTrashedProducts()).resolves.toEqual([{
      id: "7",
      title: { vi: "Cúp vô địch", en: "Champion cup" },
      handle: "champion-cup",
      status: "published",
      deletedAt: "2026-08-07T00:00:00.000Z",
    }]);
    expect(rpc.listTrash).toHaveBeenCalledOnce();
  });

  it("uses lifecycle-specific Hono RPC endpoints", async () => {
    rpc.softDelete.mockResolvedValue(jsonResponse({ item: { id: 7 } }));
    rpc.restore.mockResolvedValue(jsonResponse({ item: { id: 7, status: "draft" } }));
    rpc.permanentDelete.mockResolvedValue(jsonResponse({ deleted: true, id: 7 }));

    await deleteProduct("7");
    await restoreProduct("7");
    await permanentlyDeleteProduct("7");

    expect(rpc.softDelete).toHaveBeenCalledWith({ param: { id: "7" } });
    expect(rpc.restore).toHaveBeenCalledWith({ param: { id: "7" } });
    expect(rpc.permanentDelete).toHaveBeenCalledWith({ param: { id: "7" } });
  });
});
