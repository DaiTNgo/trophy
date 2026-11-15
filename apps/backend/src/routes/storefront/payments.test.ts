import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../db/client", () => ({ getDb: vi.fn() }));
vi.mock("../../lib/bankhub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/bankhub")>()),
  listBankhubBankApps: vi.fn(),
  generateBankhubDeeplink: vi.fn(),
}));
vi.mock("../../lib/bankhub-settings", () => ({ loadBankhubConfig: vi.fn() }));

import { getDb } from "../../db/client";
import { generateBankhubDeeplink, listBankhubBankApps } from "../../lib/bankhub";
import { loadBankhubConfig } from "../../lib/bankhub-settings";
import { createCheckoutAccessToken } from "./orders";
import { storefrontPaymentsRoute } from "./payments";

const env = {
  BETTER_AUTH_SECRET: "test-secret",
  STOREFRONT_APP_ORIGIN: "https://ptplatinum.vn",
  JETPAY_AUTH_URL: "https://auth.test",
  JETPAY_BANKHUB_URL: "https://bankhub.test",
  JETPAY_CLIENT_ID: "id",
  JETPAY_CLIENT_SECRET: "secret",
};

const config = {
  authUrl: "https://auth.test",
  bankhubUrl: "https://bankhub.test",
  clientId: "id",
  clientSecret: "secret",
  orgTaxNo: "0101234567",
  bankCode: "VCB",
  bankAccountNumber: "9987996745",
  domainWebsite: null,
};

const orderRow = {
  id: 123,
  orderNumber: "123",
  status: "pending",
  paymentStatus: "pending",
  totalAmount: 250000,
  paidAmount: 100000,
  bankhubStatus: "initialized",
  paymentDescription: "DH123",
  bankhubBankJson: JSON.stringify({
    bankCode: "VCB",
    bankName: "Vietcombank",
    bankAccountNumber: "9987996745",
    bankAccountName: "CTCP PHUNG THI",
    branchName: null,
    bankLogoUrl: null,
  }),
};

function mockOrder(row: unknown) {
  const chain: any = { from: () => chain, where: () => chain, get: async () => row };
  vi.mocked(getDb).mockReturnValue({ select: () => chain } as never);
}

async function requestDeeplink(overrides: Record<string, unknown> = {}) {
  const { token } = await createCheckoutAccessToken(env, "123");
  return storefrontPaymentsRoute.request(
    "/deeplink",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: "123",
        accessToken: token,
        bankAppCode: "ACB",
        redirectUrl: "https://ptplatinum.vn/checkout?order=123",
        ...overrides,
      }),
    },
    env,
  );
}

describe("storefront BankHub deeplink", () => {
  beforeEach(() => {
    vi.mocked(listBankhubBankApps).mockReset();
    vi.mocked(generateBankhubDeeplink).mockReset().mockResolvedValue({
      deepLinkUrl: "acbone://MISA/external/transactions?x=1",
      qrCodeData: "000201",
    });
    vi.mocked(loadBankhubConfig).mockReset().mockResolvedValue(config);
    mockOrder(orderRow);
  });

  it("lists bank apps without exposing extra JETPAY fields", async () => {
    vi.mocked(listBankhubBankApps).mockResolvedValue([
      {
        bankCode: "ACB",
        bankAppCode: "ACB",
        appName: "ACB One",
        bankName: "Á Châu",
        bankShortName: "ACB",
        isDeepLinkSupport: true,
        logoBank: "https://x/acb.svg",
        logoSmall: "https://x/acb-s.svg",
      },
    ]);

    const res = await storefrontPaymentsRoute.request("/bank-apps", {}, env);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      apps: [
        {
          bankAppCode: "ACB",
          appName: "ACB One",
          bankShortName: "ACB",
          logoSmall: "https://x/acb-s.svg",
          isDeepLinkSupport: true,
        },
      ],
    });
  });

  it("returns 503 for bank apps when BankHub env is missing", async () => {
    const res = await storefrontPaymentsRoute.request("/bank-apps", {}, {});

    expect(res.status).toBe(503);
  });

  it("generates a deeplink using the stored description and outstanding amount", async () => {
    const res = await requestDeeplink({ amount: 1, description: "HACK" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      deepLinkUrl: "acbone://MISA/external/transactions?x=1",
      qrCodeData: "000201",
    });
    expect(vi.mocked(generateBankhubDeeplink).mock.calls[0][1]).toEqual({
      bankAppCode: "ACB",
      redirectUrl: "https://ptplatinum.vn/checkout?order=123",
      benAccNo: "9987996745",
      benAccName: "CTCP PHUNG THI",
      benBankCode: "VCB",
      taxCode: "0101234567",
      amount: 150000,
      description: "DH123",
    });
  });

  it("refuses a paid order without calling JETPAY", async () => {
    mockOrder({ ...orderRow, paymentStatus: "paid" });

    const res = await requestDeeplink();

    expect(res.status).toBe(409);
    expect(generateBankhubDeeplink).not.toHaveBeenCalled();
  });

  it("refuses an order whose BankHub transaction is not initialized", async () => {
    mockOrder({ ...orderRow, bankhubStatus: "failed" });

    const res = await requestDeeplink();

    expect(res.status).toBe(409);
  });

  it("rejects a redirect URL outside the storefront origins", async () => {
    const res = await requestDeeplink({ redirectUrl: "https://evil.example/steal" });

    expect(res.status).toBe(400);
    expect(generateBankhubDeeplink).not.toHaveBeenCalled();
  });

  it("rejects an invalid checkout access token", async () => {
    const res = await requestDeeplink({ accessToken: "invalid.token" });

    expect(res.status).toBe(404);
  });

  it("passes through a null deeplink so the storefront can fall back to QR", async () => {
    vi.mocked(generateBankhubDeeplink).mockResolvedValue({ deepLinkUrl: null, qrCodeData: "000201" });

    const res = await requestDeeplink();

    await expect(res.json()).resolves.toEqual({ deepLinkUrl: null, qrCodeData: "000201" });
  });
});
