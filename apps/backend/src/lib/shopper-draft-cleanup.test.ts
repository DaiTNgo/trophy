import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({ getDb: vi.fn() }));

import { getDb } from "../db/client";
import { processExpiredShopperDraftAssets } from "./shopper-draft-cleanup";

function createDb(assets: Array<{ id: string; objectKey: string; previewObjectKey: string | null }>) {
  const deletes: string[] = [];
  const updates: unknown[] = [];
  const selectChain: any = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    limit: vi.fn(async () => assets),
  };
  const deleteChain: any = { where: vi.fn(async () => undefined) };
  const updateChain: any = {
    set: vi.fn((value: unknown) => {
      updates.push(value);
      return updateChain;
    }),
    where: vi.fn(async () => undefined),
  };
  return {
    deletes,
    updates,
    select: vi.fn(() => selectChain),
    delete: vi.fn(() => {
      deletes.push("metadata");
      return deleteChain;
    }),
    update: vi.fn(() => updateChain),
  };
}

describe("shopper draft cleanup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes source, preview, and metadata for an expired unprotected draft", async () => {
    const db = createDb([{ id: "asset-1", objectKey: "source.png", previewObjectKey: "preview.png" }]);
    vi.mocked(getDb).mockReturnValue(db as never);
    const remove = vi.fn(async () => undefined);

    await processExpiredShopperDraftAssets({ CUSTOMIZATION_ASSETS: { delete: remove } } as never);

    expect(remove).toHaveBeenCalledWith("source.png");
    expect(remove).toHaveBeenCalledWith("preview.png");
    expect(db.deletes).toEqual(["metadata"]);
  });

  it("retains metadata and records the failure for a later retry", async () => {
    const db = createDb([{ id: "asset-1", objectKey: "source.png", previewObjectKey: null }]);
    vi.mocked(getDb).mockReturnValue(db as never);

    await processExpiredShopperDraftAssets({
      CUSTOMIZATION_ASSETS: { delete: vi.fn(async () => { throw new Error("R2 unavailable"); }) },
    } as never);

    expect(db.deletes).toEqual([]);
    expect(db.updates).toContainEqual({ cleanupLastError: "R2 unavailable" });
  });
});
