import { createHash, timingSafeEqual } from "node:crypto";
import type { AppBindings } from "./env";
import { logger } from "./logger";

/**
 * JETPAY BankHub client.
 *
 * Domains and secrets come only from env (`JETPAY_*`). Business settings (org tax number,
 * bank account, website domain) are stored in the database — see `bankhub-settings.ts` —
 * and merged with the env part through `resolveBankhubConfig`.
 */

// Bank codes listed in the JETPAY integration appendix.
export const BANKHUB_BANK_CODES = [
  "ACB",
  "AGRIBANK",
  "BIDV",
  "BIDVDIRECT",
  "VCB",
  "VCBIBANKING",
  "VTB",
  "TCB",
  "MSB",
  "MSBV2",
  "SHB",
  "MB",
  "VPB",
  "LPB",
  "TPB",
] as const;
export type BankhubBankCode = (typeof BANKHUB_BANK_CODES)[number];

export type BankhubEnvConfig = {
  authUrl: string;
  bankhubUrl: string;
  clientId: string;
  clientSecret: string;
};

export type BankhubBusinessSettings = {
  enabled: boolean;
  orgTaxNo: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  domainWebsite: string | null;
};

export type BankhubConfig = BankhubEnvConfig & {
  orgTaxNo: string;
  bankCode: string;
  bankAccountNumber: string;
  domainWebsite: string | null;
};

export type BankhubEnvStatus = {
  authUrl: string | null;
  bankhubUrl: string | null;
  clientIdSet: boolean;
  clientSecretSet: boolean;
  webhookKeySet: boolean;
};

function present(value: string | undefined | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function getBankhubEnvStatus(bindings: AppBindings): BankhubEnvStatus {
  return {
    authUrl: present(bindings.JETPAY_AUTH_URL),
    bankhubUrl: present(bindings.JETPAY_BANKHUB_URL),
    clientIdSet: present(bindings.JETPAY_CLIENT_ID) !== null,
    clientSecretSet: present(bindings.JETPAY_CLIENT_SECRET) !== null,
    webhookKeySet: present(bindings.JETPAY_WEBHOOK_KEY) !== null,
  };
}

export function readBankhubEnv(bindings: AppBindings): BankhubEnvConfig | null {
  const authUrl = present(bindings.JETPAY_AUTH_URL);
  const bankhubUrl = present(bindings.JETPAY_BANKHUB_URL);
  const clientId = present(bindings.JETPAY_CLIENT_ID);
  const clientSecret = present(bindings.JETPAY_CLIENT_SECRET);
  if (!authUrl || !bankhubUrl || !clientId || !clientSecret) return null;
  return { authUrl, bankhubUrl, clientId, clientSecret };
}

export function readBankhubWebhookKey(bindings: AppBindings) {
  return present(bindings.JETPAY_WEBHOOK_KEY);
}

/** Configured only when env is complete AND settings are enabled with all required fields. */
export function resolveBankhubConfig(
  env: BankhubEnvConfig | null,
  settings: BankhubBusinessSettings | null,
): BankhubConfig | null {
  if (!env || !settings?.enabled) return null;
  const orgTaxNo = present(settings.orgTaxNo);
  const bankCode = present(settings.bankCode);
  const bankAccountNumber = present(settings.bankAccountNumber);
  if (!orgTaxNo || !bankCode || !bankAccountNumber) return null;
  return {
    ...env,
    orgTaxNo,
    bankCode,
    bankAccountNumber,
    domainWebsite: present(settings.domainWebsite),
  };
}

// ─── Errors ────────────────────────────────────────────────────────────────────

export class BankhubRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "BankhubRequestError";
    this.status = status;
    this.code = code;
  }
}

const BANKHUB_ERROR_MESSAGES: Record<string, string> = {
  E1000: "Mã ngân hàng không hợp lệ",
  E1001: "Số tài khoản ngân hàng của đơn vị không hợp lệ",
  E1002: "Số tài khoản của đơn vị chưa kết nối ngân hàng",
  E1003: "Số tài khoản ngân hàng của đơn vị đang ngưng liên kết",
  E1004: "Mã số thuế không hợp lệ",
  E1005: "Đơn vị đang ngưng hoạt động",
  E1006: "Đơn vị chưa thiết lập website",
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

async function toRequestError(response: Response, resource: string) {
  const body = asRecord(await response.json().catch(() => null));
  const error = asRecord(body?.error);
  const code = asString(error?.code) ?? asString(body?.errorCode);
  const remoteMessage = asString(error?.message) ?? asString(body?.errorMessage);
  const known = code ? BANKHUB_ERROR_MESSAGES[code] : undefined;
  const detail = [code, remoteMessage ?? known].filter(Boolean).join(": ");
  return new BankhubRequestError(
    `BankHub ${resource} failed (HTTP ${response.status})${detail ? ` ${detail}` : ""}`,
    response.status,
    code,
  );
}

// ─── Logging ───────────────────────────────────────────────────────────────────

/** Shared child logger for the whole BankHub flow; filter with `module=bankhub`. */
export const bankhubLogger = logger.child({ module: "bankhub" });

const LOG_BODY_LIMIT = 4000;

function truncate(text: string) {
  return text.length > LOG_BODY_LIMIT ? `${text.slice(0, LOG_BODY_LIMIT)}…[truncated]` : text;
}

/**
 * fetch + one structured log line per JETPAY call (`event: bankhub.http`).
 * Response bodies are logged on failure (warn) or at LOG_LEVEL=debug. Callers pass a
 * `logRequestBody` that never contains secrets; tokens/Authorization are never logged.
 */
async function loggedFetch(
  resource: string,
  url: string,
  init: RequestInit,
  logRequestBody?: unknown,
  logResponseBody = true,
) {
  const startedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    bankhubLogger.error({
      event: "bankhub.http",
      resource,
      method: init.method,
      url,
      durationMs: Date.now() - startedAt,
      message: error instanceof Error ? error.message : String(error),
      requestBody: logRequestBody,
    });
    throw error;
  }
  const durationMs = Date.now() - startedAt;
  const debug = bankhubLogger.isLevelEnabled("debug");
  const responseBody =
    (!response.ok || debug) && logResponseBody
      ? truncate(await response.clone().text().catch(() => ""))
      : undefined;
  const entry = {
    event: "bankhub.http",
    resource,
    method: init.method,
    url,
    status: response.status,
    durationMs,
    ...(debug || !response.ok ? { requestBody: logRequestBody, responseBody } : {}),
  };
  if (response.ok) bankhubLogger.info(entry);
  else bankhubLogger.warn(entry);
  return response;
}

// ─── Token (3.2.1) ─────────────────────────────────────────────────────────────

const TOKEN_REFRESH_MARGIN_MS = 60_000;
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

async function getAccessToken(env: BankhubEnvConfig, now = Date.now()) {
  const cacheKey = `${env.authUrl}|${env.clientId}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.token;

  const response = await loggedFetch(
    "token",
    joinUrl(env.authUrl, "/connect/token"),
    {
      method: "POST",
      // The integration doc says "application/xxx-form-urlencoded"; the real type is x-www-form-urlencoded.
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        grant_type: "client_credentials",
      }).toString(),
    },
    { client_id: env.clientId, grant_type: "client_credentials" },
    false, // response carries access_token
  );
  if (!response.ok) throw await toRequestError(response, "token");

  // Never log the token body (access_token); only its lifetime.
  const body = asRecord(await response.json().catch(() => null));
  const token = asString(body?.access_token);
  if (!token) throw new BankhubRequestError("BankHub token response did not contain access_token", 502);
  const expiresIn = typeof body?.expires_in === "number" ? body.expires_in : 3600;
  bankhubLogger.info({ event: "bankhub.token.issued", clientId: env.clientId, expiresIn });
  tokenCache.set(cacheKey, {
    token,
    expiresAt: now + expiresIn * 1000 - TOKEN_REFRESH_MARGIN_MS,
  });
  return token;
}

async function bankhubFetch(
  env: BankhubEnvConfig,
  resource: string,
  path: string,
  init: { method: "GET" | "POST"; body?: unknown },
  retryOnUnauthorized = true,
): Promise<unknown> {
  const token = await getAccessToken(env);
  const response = await loggedFetch(
    resource,
    joinUrl(env.bankhubUrl, path),
    {
      method: init.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    },
    init.body,
  );

  if (response.status === 401 && retryOnUnauthorized) {
    bankhubLogger.warn({ event: "bankhub.token.rejected", resource, retry: true });
    tokenCache.delete(`${env.authUrl}|${env.clientId}`);
    return bankhubFetch(env, resource, path, init, false);
  }
  if (!response.ok) throw await toRequestError(response, resource);
  return response.json().catch(() => null);
}

// ─── Transaction init (3.2.2) ─────────────────────────────────────────────────

export type BankhubCustomer = {
  code?: string;
  name: string;
  taxNo?: string;
  email: string;
  phoneNumber: string;
  address?: string;
};

export type BankhubTransactionInput = {
  orderId: string;
  amount: number;
  exportInvoice?: boolean;
  customer?: BankhubCustomer;
};

export type BankhubBankSnapshot = {
  bankCode: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  branchName: string | null;
  bankLogoUrl: string | null;
};

export type BankhubTransactionResult = {
  bank: BankhubBankSnapshot;
  order: {
    orderId: string;
    amount: number;
    description: string;
    vietQrUrl: string | null;
  };
};

export function parseBankhubTransactionResponse(payload: unknown): BankhubTransactionResult {
  const body = asRecord(payload);
  const bank = asRecord(body?.bank);
  const order = asRecord(body?.order);
  // The doc example returns the transfer syntax as `purpose`, the field list calls it `description`.
  const description = asString(order?.description) ?? asString(order?.purpose);
  if (!bank || !order || !description) {
    throw new BankhubRequestError("BankHub transaction response is missing bank or order description", 502);
  }
  return {
    bank: {
      bankCode: asString(bank.bankCode) ?? "",
      bankName: asString(bank.bankName) ?? "",
      bankAccountNumber: asString(bank.bankAccountNumber) ?? "",
      bankAccountName: asString(bank.bankAccountName) ?? "",
      branchName: asString(bank.branchName) || null,
      bankLogoUrl: asString(bank.bankLogoUrl) || null,
    },
    order: {
      orderId: asString(order.orderId) ?? "",
      amount: typeof order.amount === "number" ? order.amount : Number(order.amount ?? 0),
      description,
      vietQrUrl: asString(order.vietQrUrl) || null,
    },
  };
}

export async function createBankhubTransaction(
  config: BankhubConfig,
  input: BankhubTransactionInput,
): Promise<BankhubTransactionResult> {
  const payload = await bankhubFetch(config, "transaction", "/orgs/transactions", {
    method: "POST",
    body: {
      org: { taxNo: config.orgTaxNo },
      bank: { bankCode: config.bankCode, bankAccountNumber: config.bankAccountNumber },
      order: {
        orderId: input.orderId,
        amount: input.amount,
        domainWebsite: config.domainWebsite ?? "",
        exportInvoice: input.exportInvoice ?? false,
      },
      ...(input.customer ? { customer: input.customer } : {}),
    },
  });
  return parseBankhubTransactionResponse(payload);
}

// ─── Deeplink (3.2.4 / 3.2.5) ──────────────────────────────────────────────────

export type BankhubBankApp = {
  bankCode: string;
  bankAppCode: string;
  appName: string;
  bankName: string;
  bankShortName: string;
  isDeepLinkSupport: boolean;
  logoBank: string | null;
  logoSmall: string | null;
};

const BANK_APPS_TTL_MS = 60 * 60 * 1000;
let bankAppsCache: { expiresAt: number; apps: BankhubBankApp[] } | null = null;

function unwrapEnvelope(payload: unknown, resource: string) {
  const body = asRecord(payload);
  if (body?.isSuccess === false) {
    throw new BankhubRequestError(
      `BankHub ${resource} failed ${[asString(body.errorCode), asString(body.errorMessage)].filter(Boolean).join(": ")}`,
      502,
      asString(body.errorCode),
    );
  }
  return body?.data;
}

export async function listBankhubBankApps(env: BankhubEnvConfig, now = Date.now()) {
  if (bankAppsCache && bankAppsCache.expiresAt > now) return bankAppsCache.apps;
  const data = unwrapEnvelope(
    await bankhubFetch(env, "bank-apps", "/deeplink/bank-apps/list", { method: "GET" }),
    "bank-apps",
  );
  const apps = (Array.isArray(data) ? data : [])
    .map(asRecord)
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      bankCode: asString(item.bankCode) ?? "",
      bankAppCode: asString(item.bankAppCode) ?? "",
      appName: asString(item.appName) ?? "",
      bankName: asString(item.bankName) ?? "",
      bankShortName: asString(item.bankShortName) ?? "",
      isDeepLinkSupport: item.isDeepLinkSupport === true,
      logoBank: asString(item.logoBank) || null,
      logoSmall: asString(item.logoSmall) || null,
    }))
    .filter((app) => app.bankAppCode);
  bankAppsCache = { expiresAt: now + BANK_APPS_TTL_MS, apps };
  return apps;
}

export type BankhubDeeplinkInput = {
  bankAppCode: string;
  redirectUrl: string;
  benAccNo: string;
  benAccName: string;
  benBankCode: string;
  taxCode: string;
  amount: number;
  description: string;
};

export async function generateBankhubDeeplink(env: BankhubEnvConfig, input: BankhubDeeplinkInput) {
  const data = asRecord(
    unwrapEnvelope(
      await bankhubFetch(env, "deeplink", "/deeplink/generate", { method: "POST", body: input }),
      "deeplink",
    ),
  );
  return {
    deepLinkUrl: asString(data?.deepLinkUrl) || null,
    qrCodeData: asString(data?.qrCodeData) || null,
  };
}

// ─── Webhook signature (3.2.3) ─────────────────────────────────────────────────

export function md5Hex(value: string) {
  return createHash("md5").update(value, "utf8").digest("hex");
}

/** `signature = md5(key + msgId)`; hex case is not specified by JETPAY so compare case-insensitively. */
export function verifyWebhookSignature(key: string, msgId: string, signature: string) {
  const expected = Buffer.from(md5Hex(key + msgId), "utf8");
  const actual = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Response `signature = md5(key + msgId + responseMsgId)`. */
export function signWebhookResponse(key: string, msgId: string, responseMsgId: string) {
  return md5Hex(key + msgId + responseMsgId);
}

/** Test helper: drop in-memory token and bank-app caches. */
export function resetBankhubCaches() {
  tokenCache.clear();
  bankAppsCache = null;
}
