import { Hono, type Context } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { getAdminSession } from "../../lib/admin-session";
import { BANKHUB_BANK_CODES, getBankhubEnvStatus, readBankhubEnv, resolveBankhubConfig } from "../../lib/bankhub";
import {
  loadBankhubSettings,
  saveBankhubSettings,
  type StoredBankhubSettings,
} from "../../lib/bankhub-settings";
import type { AppEnv } from "../../lib/env";
import { parseJson } from "../../lib/validation";

const optionalText = (max: number) =>
  v.pipe(
    v.optional(v.nullable(v.string()), null),
    v.transform((value) => value?.trim() || null),
    v.nullable(v.pipe(v.string(), v.maxLength(max))),
  );

const bankhubSettingsSchema = v.pipe(
  v.object({
    enabled: v.boolean(),
    orgTaxNo: optionalText(50),
    bankCode: v.pipe(
      v.optional(v.nullable(v.string()), null),
      v.transform((value) => value?.trim() || null),
      v.nullable(v.picklist(BANKHUB_BANK_CODES, "Unsupported bank code")),
    ),
    bankAccountNumber: optionalText(50),
    domainWebsite: optionalText(255),
  }),
  v.forward(
    v.check(
      (input) => !input.enabled || Boolean(input.orgTaxNo),
      "Tax number is required when BankHub is enabled",
    ),
    ["orgTaxNo"],
  ),
  v.forward(
    v.check(
      (input) => !input.enabled || Boolean(input.bankCode),
      "Bank code is required when BankHub is enabled",
    ),
    ["bankCode"],
  ),
  v.forward(
    v.check(
      (input) => !input.enabled || Boolean(input.bankAccountNumber),
      "Bank account number is required when BankHub is enabled",
    ),
    ["bankAccountNumber"],
  ),
);

async function getSuperAdminId(c: Context<AppEnv>) {
  const session = await getAdminSession(c.env, c.req.raw.headers);
  const user = session?.user as { id?: string; role?: string } | undefined;
  return user?.role === "super-admin" && user.id ? user.id : null;
}

function serializeSettings(c: Context<AppEnv>, settings: StoredBankhubSettings) {
  const env = getBankhubEnvStatus(c.env);
  return {
    settings: {
      enabled: settings.enabled,
      orgTaxNo: settings.orgTaxNo,
      bankCode: settings.bankCode,
      bankAccountNumber: settings.bankAccountNumber,
      domainWebsite: settings.domainWebsite,
      updatedAt: settings.updatedAt?.toISOString() ?? null,
      updatedBy: settings.updatedBy,
    },
    env,
    bankCodes: [...BANKHUB_BANK_CODES],
    configured: resolveBankhubConfig(readBankhubEnv(c.env), settings) !== null,
    webhookReady: env.webhookKeySet,
  };
}

export const adminSettingsRoute = new Hono<AppEnv>()
  .get("/bankhub", async (c) => {
    if (!(await getSuperAdminId(c))) return c.json({ error: "Forbidden" }, 403);
    const settings = await loadBankhubSettings(getDb(c.env));
    return c.json(serializeSettings(c, settings), 200);
  })
  .put("/bankhub", async (c) => {
    const userId = await getSuperAdminId(c);
    if (!userId) return c.json({ error: "Forbidden" }, 403);
    const parsed = await parseJson(c, bankhubSettingsSchema);
    if (!parsed.success) return parsed.response;
    const settings = await saveBankhubSettings(getDb(c.env), parsed.output, userId);
    return c.json(serializeSettings(c, settings), 200);
  });
