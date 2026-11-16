import { randomUUID } from "node:crypto";
import { Hono } from "hono";
import * as v from "valibot";
import { getDb } from "../../db/client";
import {
  bankhubLogger,
  readBankhubWebhookKey,
  signWebhookResponse,
  verifyWebhookSignature,
} from "../../lib/bankhub";
import { processBankhubWebhookRecord } from "../../lib/bankhub-payments";
import type { AppEnv } from "../../lib/env";

// JETPAY may send ids as numbers; normalize to trimmed strings.
const idString = v.pipe(
  v.union([v.string(), v.number()]),
  v.transform((value) => String(value).trim()),
  v.minLength(1),
  v.maxLength(255),
);

const webhookRecordSchema = v.object({
  orderConfirmType: v.optional(v.nullable(v.number()), null),
  orderId: idString,
  amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
  description: v.optional(v.nullable(v.string()), null),
  transId: idString,
  bankTransId: v.optional(v.nullable(idString), null),
  transTime: v.optional(v.nullable(v.string()), null),
});

const webhookBodySchema = v.object({
  header: v.object({
    msgId: idString,
    signature: v.string(),
  }),
  data: v.object({
    records: v.pipe(v.array(webhookRecordSchema), v.maxLength(500)),
  }),
});

function readHeader(body: unknown) {
  const header =
    body && typeof body === "object" ? (body as { header?: unknown }).header : undefined;
  if (!header || typeof header !== "object") return null;
  const { msgId, signature } = header as { msgId?: unknown; signature?: unknown };
  const id = typeof msgId === "number" ? String(msgId) : msgId;
  return typeof id === "string" && id && typeof signature === "string" && signature
    ? { msgId: id.trim(), signature }
    : null;
}

/**
 * JETPAY BankHub balance-change webhook (integration doc 3.2.3).
 * Any non-200 answer is treated by JETPAY as "not delivered".
 */
export const jetpayBankhubWebhookRoute = new Hono<AppEnv>().post("/", async (c) => {
  const startedAt = Date.now();
  const sourceIp =
    c.req.header("x-real-ip") ?? c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const key = readBankhubWebhookKey(c.env);
  if (!key) {
    bankhubLogger.error({ event: "bankhub.webhook.not_configured", sourceIp });
    return c.json({ error: "BankHub webhook is not configured" }, 503);
  }

  const rawBody = await c.req.text();
  bankhubLogger.debug({ event: "bankhub.webhook.raw", sourceIp, body: rawBody.slice(0, 8000) });
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    bankhubLogger.warn({ event: "bankhub.webhook.invalid_json", sourceIp, bodyLength: rawBody.length });
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const header = readHeader(body);
  const recordCount = Array.isArray((body as { data?: { records?: unknown } })?.data?.records)
    ? ((body as { data: { records: unknown[] } }).data.records.length)
    : null;
  bankhubLogger.info({ event: "bankhub.webhook.received", sourceIp, msgId: header?.msgId ?? null, recordCount });

  if (!header || !verifyWebhookSignature(key, header.msgId, header.signature)) {
    bankhubLogger.warn({
      event: "bankhub.webhook.invalid_signature",
      sourceIp,
      msgId: header?.msgId ?? null,
      reason: header ? "signature_mismatch" : "missing_header",
    });
    return c.json({ error: "Invalid signature" }, 401);
  }

  const parsed = v.safeParse(webhookBodySchema, body);
  if (!parsed.success) {
    bankhubLogger.warn({
      event: "bankhub.webhook.invalid_payload",
      sourceIp,
      msgId: header.msgId,
      issues: parsed.issues.slice(0, 10).map((issue) => ({
        message: issue.message,
        path: issue.path?.map((item) => item.key).join("."),
      })),
    });
    return c.json({ error: "Invalid webhook payload" }, 400);
  }

  const { msgId } = parsed.output.header;
  const db = getDb(c.env);
  const records = [];
  for (const record of parsed.output.data.records) {
    records.push(await processBankhubWebhookRecord(db, record, msgId));
  }

  const responseMsgId = randomUUID();
  bankhubLogger.info({
    event: "bankhub.webhook.processed",
    msgId,
    responseMsgId,
    durationMs: Date.now() - startedAt,
    records: records.map((record) => ({ transId: record.transId, error: record.error })),
  });

  return c.json(
    {
      header: {
        msgId,
        responseMsgId,
        signature: signWebhookResponse(key, msgId, responseMsgId),
      },
      data: { records },
    },
    200,
  );
});
