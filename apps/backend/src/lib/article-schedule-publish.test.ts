import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/client", () => ({ getDb: vi.fn() }));

import { getDb } from "../db/client";
import { processScheduledArticlePublishing } from "./article-schedule-publish";

function createDb(dueArticleIds: string[]) {
  const updates: Array<{ id: string; set: Record<string, unknown> }> = [];
  const selectChain: any = {
    from: vi.fn(() => selectChain),
    where: vi.fn(() => selectChain),
    limit: vi.fn(async () =>
      dueArticleIds.map((id) => ({ id })),
    ),
  };
  const updateChain: any = {
    set: vi.fn((value: unknown) => {
      updates.push({ id: "", set: value as Record<string, unknown> });
      return updateChain;
    }),
    where: vi.fn(async (condition: unknown) => {
      updates[updates.length - 1].id = String(condition);
      return undefined;
    }),
  };
  return {
    updates,
    select: vi.fn(() => selectChain),
    update: vi.fn(() => updateChain),
  };
}

describe("scheduled article publishing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flips every due scheduled article to published in the cron run", async () => {
    const db = createDb(["a-1", "a-2"]);
    vi.mocked(getDb).mockReturnValue(db as never);

    await processScheduledArticlePublishing({} as never);

    expect(db.updates).toHaveLength(2);
    expect(db.updates[0].set.status).toBe("published");
    expect(db.updates[1].set.status).toBe("published");
  });

  it("does nothing when no scheduled article is due yet", async () => {
    const db = createDb([]);
    vi.mocked(getDb).mockReturnValue(db as never);

    await processScheduledArticlePublishing({} as never);

    expect(db.updates).toHaveLength(0);
  });
});