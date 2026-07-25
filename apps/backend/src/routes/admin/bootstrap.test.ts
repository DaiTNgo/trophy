import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({ getDb: vi.fn() }));
vi.mock("../../lib/auth", () => ({ getAuth: vi.fn() }));

import { getDb } from "../../db/client";
import { getAuth } from "../../lib/auth";
import { adminBootstrapRoute } from "./bootstrap";

function createMockDb() {
  const selectQueue: unknown[] = [];
  const chain: any = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    then: (resolve: (value: unknown) => unknown, reject?: (error: unknown) => unknown) =>
      Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
  };

  return { db: { select: vi.fn(() => chain) }, selectQueue };
}

describe("super-admin onboarding", () => {
  let mock: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mock = createMockDb();
    vi.mocked(getDb).mockReturnValue(mock.db as never);
    vi.mocked(getAuth).mockReturnValue({ api: { createUser: vi.fn() } } as never);
  });

  it("rejects onboarding after two super-admin accounts exist", async () => {
    mock.selectQueue.push([{ id: "sp-1" }, { id: "sp-2" }]);

    const response = await adminBootstrapRoute.request(
      "/",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "sp-3", password: "password-3" }),
      },
      {} as never,
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      message: "Super-admin onboarding is closed.",
      code: "SUPER_ADMIN_LIMIT_REACHED",
    });
  });
});
