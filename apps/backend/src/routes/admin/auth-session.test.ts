import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../../db/client";
import { adminRoute } from "./index";

function createMockDb() {
  const getQueue: unknown[] = [];
  const chain: any = {
    select: vi.fn(() => chain),
    from: vi.fn(() => chain),
    innerJoin: vi.fn(() => chain),
    where: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
  };

  return { db: chain, getQueue };
}

function queueAdminSession(getQueue: unknown[]) {
  getQueue.push({
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

describe("admin bearer token session", () => {
  let mock: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mock = createMockDb();
    vi.mocked(getDb).mockReturnValue(mock.db as never);
  });

  it("loads the current admin user from an Authorization bearer token without cookies", async () => {
    queueAdminSession(mock.getQueue);

    const res = await adminRoute.request(
      "/me",
      {
        headers: {
          Authorization: "Bearer token-1",
        },
      },
      {} as never,
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      user: {
        id: "user-1",
        username: "admin",
        email: "admin@admin.trophy.local",
        name: "admin",
        role: "super-admin",
        banned: false,
      },
    });
  });

  it("rejects an invalid bearer token", async () => {
    const res = await adminRoute.request(
      "/me",
      {
        headers: {
          Authorization: "Bearer missing",
        },
      },
      {} as never,
    );

    expect(res.status).toBe(401);
  });
});
