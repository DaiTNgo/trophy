import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../db/client", () => ({ getDb: vi.fn(() => ({ fake: "db" })) }));
vi.mock("../../lib/bankhub-payments", () => ({ processBankhubWebhookRecord: vi.fn() }));

import { processBankhubWebhookRecord } from "../../lib/bankhub-payments";
import { webhooksRoute } from "./index";

const KEY = "ma-bao-mat";
const env = { JETPAY_WEBHOOK_KEY: KEY };
const md5 = (value: string) => createHash("md5").update(value).digest("hex");

const record = {
  orderConfirmType: 1,
  orderId: "123",
  amount: 250000,
  description: "DH123",
  transId: "JP1688971897877",
  bankTransId: "1688971922410",
  transTime: "2026-11-11T08:05:00+07:00",
};

function post(body: unknown, bindings: Record<string, string> = env) {
  return webhooksRoute.request(
    "/jetpay-bankhub",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    },
    bindings,
  );
}

function signed(records: unknown[], msgId = "20230710135000", signature = md5(KEY + msgId)) {
  return { header: { msgId, signature }, data: { records } };
}

describe("JETPAY BankHub webhook", () => {
  beforeEach(() => {
    vi.mocked(processBankhubWebhookRecord)
      .mockReset()
      .mockImplementation(async (_db, input) => ({
        transId: input.transId,
        error: 0,
        message: "Success",
        orderAmount: 250000,
        customer: { name: "Nguyen Van A", email: "", phoneNumber: "0912345678" },
      }));
  });

  it("processes a correctly signed delivery and answers with a signed per-record response", async () => {
    const res = await post(signed([record]));
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(body.header.msgId).toBe("20230710135000");
    expect(body.header.responseMsgId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.header.signature).toBe(md5(KEY + "20230710135000" + body.header.responseMsgId));
    expect(body.data.records).toEqual([
      {
        transId: "JP1688971897877",
        error: 0,
        message: "Success",
        orderAmount: 250000,
        customer: { name: "Nguyen Van A", email: "", phoneNumber: "0912345678" },
      },
    ]);
    expect(vi.mocked(processBankhubWebhookRecord).mock.calls[0][1]).toEqual(record);
    expect(vi.mocked(processBankhubWebhookRecord).mock.calls[0][2]).toBe("20230710135000");
  });

  it("accepts an uppercase hex signature", async () => {
    const res = await post(signed([record], "M1", md5(KEY + "M1").toUpperCase()));

    expect(res.status).toBe(200);
  });

  it("rejects a signature made with another key without recording anything", async () => {
    const res = await post(signed([record], "M1", md5("other-key" + "M1")));

    expect(res.status).toBe(401);
    expect(processBankhubWebhookRecord).not.toHaveBeenCalled();
  });

  it("rejects a delivery without header signature", async () => {
    const res = await post({ data: { records: [record] } });

    expect(res.status).toBe(401);
  });

  it("rejects a signed delivery whose records are malformed", async () => {
    const res = await post(signed([{ ...record, amount: "250000" }]));

    expect(res.status).toBe(400);
    expect(processBankhubWebhookRecord).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON", async () => {
    const res = await post("not-json");

    expect(res.status).toBe(400);
  });

  it("answers 503 when the webhook key env is missing", async () => {
    const res = await post(signed([record]), {});

    expect(res.status).toBe(503);
  });

  it("normalizes numeric ids and returns one response per record in order", async () => {
    vi.mocked(processBankhubWebhookRecord).mockImplementation(async (_db, input) =>
      input.orderId === "999"
        ? { transId: input.transId, error: 1, message: "Order not found", orderAmount: 0 }
        : { transId: input.transId, error: 0, message: "Success", orderAmount: 250000 },
    );

    const res = await post(
      signed([
        { ...record, transId: "JP1", orderId: 123, bankTransId: 555 },
        { ...record, transId: "JP2", orderId: "999", transTime: undefined },
      ]),
    );
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(body.data.records.map((r: any) => [r.transId, r.error])).toEqual([
      ["JP1", 0],
      ["JP2", 1],
    ]);
    expect(vi.mocked(processBankhubWebhookRecord).mock.calls[0][1]).toMatchObject({
      orderId: "123",
      bankTransId: "555",
    });
    expect(vi.mocked(processBankhubWebhookRecord).mock.calls[1][1].transTime).toBeNull();
  });

  it("is reachable through the public /api/webhooks mount", async () => {
    const { routes } = await import("../../app");
    const res = await routes.request(
      "/api/webhooks/jetpay-bankhub",
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(signed([record])) },
      env,
    );

    expect(res.status).toBe(200);
  });
});
