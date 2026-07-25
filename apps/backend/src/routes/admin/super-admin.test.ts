import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({ getDb: vi.fn() }));
vi.mock("../../lib/admin-session", () => ({ getAdminSession: vi.fn() }));
vi.mock("../../lib/auth", () => ({ getAuth: vi.fn() }));
vi.mock("better-auth/crypto", () => ({ verifyPassword: vi.fn() }));

import { getDb } from "../../db/client";
import { getAdminSession } from "../../lib/admin-session";
import { getAuth } from "../../lib/auth";
import { verifyPassword } from "better-auth/crypto";
import { superAdminRoute } from "./super-admin";

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const deletedUserIds: string[] = [];
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    get: vi.fn(async () => getQueue.shift() ?? null),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return {
    db: {
      select: vi.fn(() => chain),
      delete: vi.fn(() => ({ where: vi.fn((condition: unknown) => {
        deletedUserIds.push(String(condition));
        return Promise.resolve();
      }) })),
    },
    getQueue,
    selectQueue,
    deletedUserIds,
  };
}

function superAdminSession(userId = "sp-1") {
  return {
    user: { id: userId, role: "super-admin" },
    session: { id: "session-1", token: "token-1" },
  };
}

describe("super-admin recovery route", () => {
  let mock: ReturnType<typeof createMockDb>;
  const setUserPassword = vi.fn();

  beforeEach(() => {
    mock = createMockDb();
    vi.mocked(getDb).mockReturnValue(mock.db as never);
    vi.mocked(getAuth).mockReturnValue({ api: { setUserPassword } } as never);
    vi.mocked(verifyPassword).mockResolvedValue(true);
    setUserPassword.mockReset();
  });

  it("rejects recovery without a super-admin session", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const response = await superAdminRoute.request(
      "/recovery",
      { method: "POST", body: JSON.stringify({ currentPassword: "password-1", newPassword: "password-2" }) },
      {} as never,
    );

    expect(response.status).toBe(403);
  });

  it("replaces only the other super-admin password and revokes their sessions", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(superAdminSession() as never);
    mock.getQueue.push({ password: "hash" });
    mock.selectQueue.push([{ id: "sp-2" }]);

    const response = await superAdminRoute.request(
      "/recovery",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: "password-1", newPassword: "password-2" }),
      },
      {} as never,
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ recovered: true });
    expect(setUserPassword).toHaveBeenCalledWith(
      expect.objectContaining({ body: { userId: "sp-2", newPassword: "password-2" }, headers: expect.any(Headers) }),
    );
    expect(vi.mocked(setUserPassword).mock.calls[0]?.[0]?.headers?.get("content-type")).toBe("application/json");
    expect(mock.db.delete).toHaveBeenCalledTimes(1);
  });

  it("rejects recovery when there is not exactly one other super-admin", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(superAdminSession() as never);
    mock.getQueue.push({ password: "hash" });
    mock.selectQueue.push([]);

    const response = await superAdminRoute.request(
      "/recovery",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: "password-1", newPassword: "password-2" }),
      },
      {} as never,
    );

    expect(response.status).toBe(409);
    expect(setUserPassword).not.toHaveBeenCalled();
  });
});
