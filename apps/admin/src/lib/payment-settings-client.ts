import { backendClient } from "./backend-client";

export type BankhubSettings = {
  enabled: boolean;
  orgTaxNo: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  domainWebsite: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type BankhubSettingsResponse = {
  settings: BankhubSettings;
  env: {
    authUrl: string | null;
    bankhubUrl: string | null;
    clientIdSet: boolean;
    clientSecretSet: boolean;
    webhookKeySet: boolean;
  };
  bankCodes: string[];
  configured: boolean;
  webhookReady: boolean;
};

export type BankhubSettingsInput = Pick<
  BankhubSettings,
  "enabled" | "orgTaxNo" | "bankCode" | "bankAccountNumber" | "domainWebsite"
>;

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as
    | { error?: string; message?: string; issues?: Array<{ message: string }> }
    | null;
  return new Error(body?.issues?.[0]?.message ?? body?.error ?? body?.message ?? fallback);
}

export async function fetchBankhubSettings(): Promise<BankhubSettingsResponse> {
  const response = await backendClient.api.admin.settings.bankhub.$get();
  if (!response.ok) throw await readError(response, "Failed to load payment settings");
  return (await response.json()) as BankhubSettingsResponse;
}

export async function saveBankhubSettings(input: BankhubSettingsInput): Promise<BankhubSettingsResponse> {
  const response = await backendClient.api.admin.settings.bankhub.$put({ json: input });
  if (!response.ok) throw await readError(response, "Failed to save payment settings");
  return (await response.json()) as BankhubSettingsResponse;
}
