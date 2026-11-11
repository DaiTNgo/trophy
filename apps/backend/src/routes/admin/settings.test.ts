import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({ getDb: vi.fn(() => ({})) }));
vi.mock("../../lib/admin-session", () => ({ getAdminSession: vi.fn() }));
vi.mock("../../lib/bankhub-settings", () => ({
  loadBankhubSettings: vi.fn(),
  saveBankhubSettings: vi.fn(),
}));

import { getAdminSession } from "../../lib/admin-session";
import { loadBankhubSettings, saveBankhubSettings } from "../../lib/bankhub-settings";
import { adminRoute } from "./index";

const fullEnv = {
  JETPAY_AUTH_URL: "https://testdcauthapi.jetpay.vn",
  JETPAY_BANKHUB_URL: "https://testdcbankhubapp.jetpay.vn/bhc",
  JETPAY_CLIENT_ID: "jbf-client",
  JETPAY_CLIENT_SECRET: "client-secret-value",
  JETPAY_WEBHOOK_KEY: "webhook-key-value",
};

const storedSettings = {
  enabled: true,
  orgTaxNo: "0101234567",
  bankCode: "VCB",
  bankAccountNumber: "9987996745",
  domainWebsite: "phungthi.vn",
  updatedAt: new Date("2026-11-11T08:00:00.000Z"),
  updatedBy: "user-1",
};

function signInAs(role: string | null) {
  vi.mocked(getAdminSession).mockResolvedValue(
    role ? ({ user: { id: "user-1", role, banned: false } } as never) : null,
  );
}

function put(body: unknown, env: Record<string, string> = fullEnv) {
  return adminRoute.request(
    "/settings/bankhub",
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    env,
  );
}

describe("admin BankHub settings", () => {
  beforeEach(() => {
    vi.mocked(loadBankhubSettings).mockReset().mockResolvedValue(storedSettings);
    vi.mocked(saveBankhubSettings).mockReset().mockImplementation(async (_db, input) => ({
      ...input,
      updatedAt: new Date("2026-11-11T09:00:00.000Z"),
      updatedBy: "user-1",
    }));
  });

  it("returns stored settings and env status to a super-admin without exposing secret values", async () => {
    signInAs("super-admin");

    const res = await adminRoute.request("/settings/bankhub", {}, fullEnv);
    const text = await res.text();
    const body = JSON.parse(text);

    expect(res.status).toBe(200);
    expect(body.settings).toMatchObject({ enabled: true, bankCode: "VCB", bankAccountNumber: "9987996745" });
    expect(body.env).toEqual({
      authUrl: "https://testdcauthapi.jetpay.vn",
      bankhubUrl: "https://testdcbankhubapp.jetpay.vn/bhc",
      clientIdSet: true,
      clientSecretSet: true,
      webhookKeySet: true,
    });
    expect(body.configured).toBe(true);
    expect(body.bankCodes).toContain("VTB");
    expect(text).not.toContain("client-secret-value");
    expect(text).not.toContain("webhook-key-value");
  });

  it("reports BankHub as not configured when the webhook key env is missing", async () => {
    signInAs("super-admin");
    const { JETPAY_WEBHOOK_KEY: _omit, ...env } = fullEnv;

    const res = await adminRoute.request("/settings/bankhub", {}, env);
    const body = (await res.json()) as any;

    expect(body.env.webhookKeySet).toBe(false);
    expect(body.webhookReady).toBe(false);
  });

  it("saves settings for a super-admin", async () => {
    signInAs("super-admin");

    const res = await put({
      enabled: true,
      orgTaxNo: " 0101234567 ",
      bankCode: "VCB",
      bankAccountNumber: "9987996745",
      domainWebsite: "",
    });

    expect(res.status).toBe(200);
    expect(vi.mocked(saveBankhubSettings).mock.calls[0][1]).toEqual({
      enabled: true,
      orgTaxNo: "0101234567",
      bankCode: "VCB",
      bankAccountNumber: "9987996745",
      domainWebsite: null,
    });
    expect(vi.mocked(saveBankhubSettings).mock.calls[0][2]).toBe("user-1");
  });

  it("rejects an unsupported bank code without saving", async () => {
    signInAs("super-admin");

    const res = await put({ enabled: false, bankCode: "XYZ" });

    expect(res.status).toBe(400);
    expect(saveBankhubSettings).not.toHaveBeenCalled();
  });

  it("requires the bank account number when enabling BankHub", async () => {
    signInAs("super-admin");

    const res = await put({ enabled: true, orgTaxNo: "0101234567", bankCode: "VCB", bankAccountNumber: "" });
    const body = (await res.json()) as any;

    expect(res.status).toBe(400);
    expect(body.issues).toEqual([
      { message: "Bank account number is required when BankHub is enabled", path: "bankAccountNumber" },
    ]);
    expect(saveBankhubSettings).not.toHaveBeenCalled();
  });

  it("allows saving a disabled draft with empty fields", async () => {
    signInAs("super-admin");

    const res = await put({ enabled: false });

    expect(res.status).toBe(200);
  });

  it("forbids regular admins", async () => {
    signInAs("admin");

    expect((await adminRoute.request("/settings/bankhub", {}, fullEnv)).status).toBe(403);
    expect((await put({ enabled: false })).status).toBe(403);
  });

  it("rejects unauthenticated requests", async () => {
    signInAs(null);

    const res = await adminRoute.request("/settings/bankhub", {}, fullEnv);

    expect(res.status).toBe(401);
  });
});
