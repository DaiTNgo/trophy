import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BankhubRequestError,
  createBankhubTransaction,
  generateBankhubDeeplink,
  getBankhubEnvStatus,
  listBankhubBankApps,
  parseBankhubTransactionResponse,
  resetBankhubCaches,
  resolveBankhubConfig,
  signWebhookResponse,
  verifyWebhookSignature,
  type BankhubConfig,
} from "./bankhub";

const env = {
  authUrl: "https://auth.test",
  bankhubUrl: "https://bankhub.test/bhc/",
  clientId: "jbf-client",
  clientSecret: "secret",
};

const config: BankhubConfig = {
  ...env,
  orgTaxNo: "0101234567",
  bankCode: "VCB",
  bankAccountNumber: "9987996745",
  domainWebsite: "shop.example.vn",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const tokenResponse = () =>
  json({ access_token: "token-1", expires_in: 86400, token_type: "Bearer", scope: "AuthService" });

const transactionResponse = () =>
  json({
    bank: {
      bankCode: "VCB",
      bankName: "Ngân hàng TMCP Ngoại thương Việt Nam",
      bankAccountNumber: "9987996745",
      bankAccountName: "CTCP PHUNG THI",
      branchName: "Hà Nội",
      bankLogoUrl: "",
    },
    order: { orderId: "123", amount: 250000, description: "DH123", vietQrUrl: "https://qr.test/123.png" },
  });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetBankhubCaches();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BankHub configuration", () => {
  it("is configured only when env is complete and settings are enabled and filled", () => {
    const settings = {
      enabled: true,
      orgTaxNo: "0101234567",
      bankCode: "VCB",
      bankAccountNumber: "9987996745",
      domainWebsite: "",
    };
    expect(resolveBankhubConfig(env, settings)).toMatchObject({
      bankCode: "VCB",
      domainWebsite: null,
    });
    expect(resolveBankhubConfig(null, settings)).toBeNull();
    expect(resolveBankhubConfig(env, { ...settings, enabled: false })).toBeNull();
    expect(resolveBankhubConfig(env, { ...settings, bankAccountNumber: " " })).toBeNull();
    expect(resolveBankhubConfig(env, null)).toBeNull();
  });

  it("reports env secrets as set/unset without exposing values", () => {
    const status = getBankhubEnvStatus({
      JETPAY_AUTH_URL: "https://auth.test",
      JETPAY_CLIENT_ID: "id",
      JETPAY_CLIENT_SECRET: "super-secret",
    });
    expect(status).toEqual({
      authUrl: "https://auth.test",
      bankhubUrl: null,
      clientIdSet: true,
      clientSecretSet: true,
      webhookKeySet: false,
    });
    expect(JSON.stringify(status)).not.toContain("super-secret");
  });
});

describe("BankHub transaction initialization", () => {
  it("requests a form-urlencoded client-credentials token and sends the order payload", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(transactionResponse());

    const result = await createBankhubTransaction(config, {
      orderId: "123",
      amount: 250000,
      customer: { name: "Nguyen Van A", email: "", phoneNumber: "0912345678" },
    });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://auth.test/connect/token");
    expect(tokenInit.headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(tokenInit.body).toBe("client_id=jbf-client&client_secret=secret&grant_type=client_credentials");

    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("https://bankhub.test/bhc/orgs/transactions");
    expect(init.headers.Authorization).toBe("Bearer token-1");
    expect(JSON.parse(init.body)).toEqual({
      org: { taxNo: "0101234567" },
      bank: { bankCode: "VCB", bankAccountNumber: "9987996745" },
      order: { orderId: "123", amount: 250000, domainWebsite: "shop.example.vn", exportInvoice: false },
      customer: { name: "Nguyen Van A", email: "", phoneNumber: "0912345678" },
    });
    expect(result.order).toEqual({
      orderId: "123",
      amount: 250000,
      description: "DH123",
      vietQrUrl: "https://qr.test/123.png",
    });
    expect(result.bank.bankLogoUrl).toBeNull();
  });

  it("reuses the cached token across requests", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(transactionResponse())
      .mockResolvedValueOnce(transactionResponse());

    await createBankhubTransaction(config, { orderId: "1", amount: 1 });
    await createBankhubTransaction(config, { orderId: "2", amount: 1 });

    const tokenCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/connect/token"));
    expect(tokenCalls).toHaveLength(1);
  });

  it("refreshes the token and retries exactly once on 401", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(json({ access_token: "token-2", expires_in: 86400 }))
      .mockResolvedValueOnce(transactionResponse());

    await createBankhubTransaction(config, { orderId: "1", amount: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe("Bearer token-2");
  });

  it("does not retry twice when the refreshed token is also rejected", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({}, 401))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({}, 401));

    await expect(createBankhubTransaction(config, { orderId: "1", amount: 1 })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("maps E1xxx business errors to BankhubRequestError with the code", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        json({ error: { code: "E1002", message: "Số tài khoản của đơn vị chưa kết nối ngân hàng" } }, 400),
      );

    const error = await createBankhubTransaction(config, { orderId: "1", amount: 1 }).catch((e) => e);
    expect(error).toBeInstanceOf(BankhubRequestError);
    expect(error.code).toBe("E1002");
    expect(error.status).toBe(400);
    expect(error.message).toContain("E1002");
  });

  it("reads the transfer syntax from `purpose` when `description` is absent", () => {
    const result = parseBankhubTransactionResponse({
      bank: { bankCode: "VTB", bankName: "VietinBank", bankAccountNumber: "1", bankAccountName: "A" },
      order: { orderId: "123", amount: 10000, purpose: "DH123", vietQrUrl: "" },
    });
    expect(result.order.description).toBe("DH123");
    expect(result.order.vietQrUrl).toBeNull();
  });
});

describe("BankHub deeplink", () => {
  it("caches the bank-app list", async () => {
    fetchMock.mockResolvedValueOnce(tokenResponse()).mockResolvedValueOnce(
      json({
        data: [
          { bankCode: "ACB", bankAppCode: "ACB", appName: "ACB One", bankName: "Á Châu", bankShortName: "ACB", isDeepLinkSupport: true },
        ],
        isSuccess: true,
        errorCode: "200",
        errorMessage: null,
      }),
    );

    const first = await listBankhubBankApps(env);
    const second = await listBankhubBankApps(env);

    expect(first).toEqual(second);
    expect(first[0]).toMatchObject({ bankAppCode: "ACB", appName: "ACB One", isDeepLinkSupport: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("returns a null deeplink when the bank has no real deeplink", async () => {
    fetchMock
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(json({ data: { deepLinkUrl: null, qrCodeData: "0002010102" }, isSuccess: true }));

    const result = await generateBankhubDeeplink(env, {
      bankAppCode: "VCB",
      redirectUrl: "https://shop.test/checkout",
      benAccNo: "1",
      benAccName: "A",
      benBankCode: "VCB",
      taxCode: "1",
      amount: 1,
      description: "DH1",
    });
    expect(result).toEqual({ deepLinkUrl: null, qrCodeData: "0002010102" });
  });
});

describe("BankHub webhook signature", () => {
  // md5("abc") = 900150983cd24fb0d6963f7d28e17f72
  it("accepts md5(key + msgId) in either hex case", () => {
    expect(verifyWebhookSignature("ab", "c", "900150983cd24fb0d6963f7d28e17f72")).toBe(true);
    expect(verifyWebhookSignature("ab", "c", "900150983CD24FB0D6963F7D28E17F72")).toBe(true);
  });

  it("rejects a signature computed with another key or of wrong length", () => {
    expect(verifyWebhookSignature("xx", "c", "900150983cd24fb0d6963f7d28e17f72")).toBe(false);
    expect(verifyWebhookSignature("ab", "c", "")).toBe(false);
  });

  it("signs the response as md5(key + msgId + responseMsgId)", () => {
    expect(signWebhookResponse("a", "b", "c")).toBe("900150983cd24fb0d6963f7d28e17f72");
  });
});
