import { eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { bankhubSettings } from "../db/schema";
import {
  readBankhubEnv,
  resolveBankhubConfig,
  type BankhubBusinessSettings,
  type BankhubConfig,
} from "./bankhub";
import type { AppBindings } from "./env";

const SETTINGS_ID = 1;

export type StoredBankhubSettings = BankhubBusinessSettings & {
  updatedAt: Date | null;
  updatedBy: string | null;
};

const EMPTY_SETTINGS: StoredBankhubSettings = {
  enabled: false,
  orgTaxNo: null,
  bankCode: null,
  bankAccountNumber: null,
  domainWebsite: null,
  updatedAt: null,
  updatedBy: null,
};

export async function loadBankhubSettings(db: Database): Promise<StoredBankhubSettings> {
  const row = await db
    .select()
    .from(bankhubSettings)
    .where(eq(bankhubSettings.id, SETTINGS_ID))
    .get();
  if (!row) return EMPTY_SETTINGS;
  return {
    enabled: row.enabled,
    orgTaxNo: row.orgTaxNo,
    bankCode: row.bankCode,
    bankAccountNumber: row.bankAccountNumber,
    domainWebsite: row.domainWebsite,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export async function saveBankhubSettings(
  db: Database,
  input: BankhubBusinessSettings,
  updatedBy: string,
) {
  const values = {
    enabled: input.enabled,
    orgTaxNo: input.orgTaxNo,
    bankCode: input.bankCode,
    bankAccountNumber: input.bankAccountNumber,
    domainWebsite: input.domainWebsite,
    updatedBy,
    updatedAt: new Date(),
  };
  await db
    .insert(bankhubSettings)
    .values({ id: SETTINGS_ID, ...values })
    .onConflictDoUpdate({ target: bankhubSettings.id, set: values });
  return loadBankhubSettings(db);
}

/** Env (domains/secrets) + DB settings; `null` unless BankHub can be called for new orders. */
export async function loadBankhubConfig(
  db: Database,
  bindings: AppBindings,
): Promise<BankhubConfig | null> {
  const env = readBankhubEnv(bindings);
  if (!env) return null;
  return resolveBankhubConfig(env, await loadBankhubSettings(db));
}
