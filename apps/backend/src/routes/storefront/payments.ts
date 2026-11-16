import { eq } from "drizzle-orm";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import { orders } from "../../db/schema";
import {
  BankhubRequestError,
  generateBankhubDeeplink,
  listBankhubBankApps,
  readBankhubEnv,
} from "../../lib/bankhub";
import { parseBankhubBank } from "../../lib/bankhub-payments";
import { loadBankhubConfig } from "../../lib/bankhub-settings";
import { getAppCorsOrigins } from "../../lib/cors";
import type { AppEnv } from "../../lib/env";
import { logger } from "../../lib/logger";
import { jsonError, parseJson } from "../../lib/validation";
import { verifyCheckoutAccessToken } from "./orders";

const deeplinkSchema = v.object({
  orderNumber: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(255)),
  accessToken: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(2048)),
  bankAppCode: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(50)),
  redirectUrl: v.pipe(v.string(), v.url(), v.maxLength(2048)),
});

/**
 * Logs the real JETPAY failure and answers 503: a 502 from the origin is replaced by
 * Cloudflare's own "error code: 502" page, which hides the message from shoppers and operators.
 */
function bankhubFailure(event: string, error: unknown) {
  const message = error instanceof Error ? error.message : "BankHub request failed";
  logger.error({
    module: "bankhub",
    event,
    message,
    status: error instanceof BankhubRequestError ? error.status : null,
    code: error instanceof BankhubRequestError ? error.code : null,
  });
  return { error: message };
}

function isAllowedRedirect(redirectUrl: string, allowedOrigins: string[]) {
  try {
    return allowedOrigins.includes(new URL(redirectUrl).origin);
  } catch {
    return false;
  }
}

/** Shopper-safe proxies for JETPAY deeplink APIs (integration doc 3.2.4 / 3.2.5). */
export const storefrontPaymentsRoute = new Hono<AppEnv>()
  .get("/bank-apps", async (c) => {
    const env = readBankhubEnv(c.env);
    if (!env) return c.json({ error: "BankHub is not configured" }, 503);
    try {
      const apps = await listBankhubBankApps(env);
      return c.json(
        {
          apps: apps.map((app) => ({
            bankAppCode: app.bankAppCode,
            appName: app.appName,
            bankShortName: app.bankShortName,
            logoSmall: app.logoSmall,
            isDeepLinkSupport: app.isDeepLinkSupport,
          })),
        },
        200,
      );
    } catch (error) {
      return c.json(bankhubFailure("bankhub.bank_apps.failed", error), 503);
    }
  })
  .post("/deeplink", async (c) => {
    const parsed = await parseJson(c, deeplinkSchema);
    if (!parsed.success) return parsed.response;
    const input = parsed.output;

    if (!isAllowedRedirect(input.redirectUrl, getAppCorsOrigins(c.env))) {
      return jsonError(c, 400, "Redirect URL is not allowed");
    }
    if (!(await verifyCheckoutAccessToken(c.env, input.orderNumber, input.accessToken))) {
      return jsonError(c, 404, "Order not found");
    }

    const db = getDb(c.env);
    const order = await db.select().from(orders).where(eq(orders.orderNumber, input.orderNumber)).get();
    if (!order) return jsonError(c, 404, "Order not found");
    if (order.paymentStatus !== "pending" || order.status === "cancelled") {
      return jsonError(c, 409, "Order is not awaiting payment");
    }
    const bank = parseBankhubBank(order.bankhubBankJson);
    if (order.bankhubStatus !== "initialized" || !bank || !order.paymentDescription) {
      return jsonError(c, 409, "Payment information is not ready");
    }

    const config = await loadBankhubConfig(db, c.env);
    if (!config) return c.json({ error: "BankHub is not configured" }, 503);

    try {
      // Money and beneficiary fields always come from the stored order, never from the request.
      const result = await generateBankhubDeeplink(config, {
        bankAppCode: input.bankAppCode,
        redirectUrl: input.redirectUrl,
        benAccNo: bank.bankAccountNumber,
        benAccName: bank.bankAccountName,
        benBankCode: bank.bankCode,
        taxCode: config.orgTaxNo,
        amount: Math.max(order.totalAmount - order.paidAmount, 0),
        description: order.paymentDescription,
      });
      logger.info({
        module: "bankhub",
        event: "bankhub.deeplink.generated",
        orderNumber: order.orderNumber,
        bankAppCode: input.bankAppCode,
        hasDeepLink: Boolean(result.deepLinkUrl),
      });
      return c.json(result, 200);
    } catch (error) {
      const status = error instanceof BankhubRequestError && error.status === 400 ? 400 : 503;
      return c.json(bankhubFailure("bankhub.deeplink.failed", error), status);
    }
  });
