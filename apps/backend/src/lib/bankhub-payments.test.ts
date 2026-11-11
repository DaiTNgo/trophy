import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./bankhub-settings", () => ({ loadBankhubConfig: vi.fn() }));
vi.mock("./bankhub", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bankhub")>()),
  createBankhubTransaction: vi.fn(),
}));

import { BankhubRequestError, createBankhubTransaction, type BankhubConfig } from "./bankhub";
import {
  applyIncomingPayment,
  buildBankhubCustomer,
  initializeBankhubForOrder,
  processBankhubWebhookRecord,
  serializeShopperPayment,
  type OrderRow,
} from "./bankhub-payments";
import { loadBankhubConfig } from "./bankhub-settings";

const config: BankhubConfig = {
  authUrl: "https://auth.test",
  bankhubUrl: "https://bankhub.test",
  clientId: "id",
  clientSecret: "secret",
  orgTaxNo: "0101234567",
  bankCode: "VCB",
  bankAccountNumber: "9987996745",
  domainWebsite: null,
};

function makeOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    id: 123,
    orderNumber: "123",
    status: "pending",
    paymentStatus: "pending",
    fulfillmentStatus: "unfulfilled",
    paymentMethod: "bank_transfer",
    customerName: "Nguyen Van A",
    customerPhone: "0912345678",
    customerEmail: null,
    notes: null,
    vatDetailsJson: null,
    primaryAddressJson: JSON.stringify({ line1: "1 Tràng Tiền, Hoàn Kiếm, Hà Nội" }),
    shippingAddressJson: null,
    shipToDifferentAddress: false,
    subtotalAmount: 250000,
    totalAmount: 250000,
    currencyCode: "VND",
    itemCount: 1,
    misaSyncStatus: "pending",
    misaSaleOrderId: null,
    misaSaleOrderNo: null,
    misaLastError: null,
    misaAttemptCount: 0,
    misaSyncedAt: null,
    bankhubStatus: "pending",
    bankhubLastError: null,
    bankhubInitializedAt: null,
    paymentDescription: null,
    vietQrUrl: null,
    bankhubBankJson: null,
    paidAmount: 0,
    paidAt: null,
    createdAt: new Date("2026-11-11T08:00:00.000Z"),
    updatedAt: new Date("2026-11-11T08:00:00.000Z"),
    ...overrides,
  };
}

/**
 * Minimal in-memory stand-in for the drizzle calls used by the payment service:
 * one orders row and a payment_transactions table with a unique transId.
 */
function createFakeDb(initialOrder: OrderRow | null) {
  const state = {
    order: initialOrder ? { ...initialOrder } : null,
    transactions: [] as Array<Record<string, any>>,
    orderUpdates: [] as Array<Record<string, unknown>>,
  };

  const db: any = {
    state,
    transaction: async (fn: (tx: any) => Promise<unknown>) => fn(db),
    select: vi.fn(() => {
      let table: "transactions" | "orders" = "transactions";
      const chain: any = {
        from: (t: any) => {
          table = t === undefined ? "transactions" : String(t[Symbol.for("drizzle:Name")]) === "orders" ? "orders" : "transactions";
          return chain;
        },
        where: (condition: any) => {
          chain.condition = condition;
          return chain;
        },
        limit: () => chain,
        for: () => chain,
        then: (resolve: any, reject: any) => {
          const rows =
            table === "orders"
              ? state.order
                ? [state.order]
                : []
              : state.transactions.filter((row) => row.transId === db.lastTransId);
          return Promise.resolve(rows).then(resolve, reject);
        },
      };
      return chain;
    }),
    insert: vi.fn(() => {
      const chain: any = {
        values: (values: Record<string, any>) => {
          chain.values_ = values;
          return chain;
        },
        onConflictDoNothing: () => chain,
        returning: async () => {
          if (state.transactions.some((row) => row.transId === chain.values_.transId)) return [];
          state.transactions.push(chain.values_);
          return [{ id: state.transactions.length }];
        },
      };
      return chain;
    }),
    update: vi.fn(() => {
      const chain: any = {
        set: (values: Record<string, unknown>) => {
          state.orderUpdates.push(values);
          if (state.order) state.order = { ...state.order, ...values };
          return chain;
        },
        where: async () => undefined,
      };
      return chain;
    }),
  };
  return db;
}

async function deliver(db: any, record: { transId: string; amount: number; orderId?: string }) {
  db.lastTransId = record.transId;
  return processBankhubWebhookRecord(
    db,
    {
      orderConfirmType: 1,
      orderId: record.orderId ?? "123",
      amount: record.amount,
      description: "DH123",
      transId: record.transId,
      bankTransId: `B-${record.transId}`,
      transTime: "2026-11-11T08:05:00+07:00",
    },
    "20261111080500",
    new Date("2026-11-11T01:05:01.000Z"),
  );
}

describe("payment helpers", () => {
  it("builds the BankHub customer from VAT details when the shopper requested an invoice", () => {
    const order = makeOrder({
      customerEmail: "a@example.com",
      vatDetailsJson: JSON.stringify({
        name: "CTCP ABC",
        taxId: "0109999999",
        email: "invoice@abc.vn",
        address: "2 Lý Thường Kiệt, Hà Nội",
      }),
    });
    expect(buildBankhubCustomer(order)).toEqual({
      name: "CTCP ABC",
      email: "invoice@abc.vn",
      phoneNumber: "0912345678",
      taxNo: "0109999999",
      address: "2 Lý Thường Kiệt, Hà Nội",
    });
  });

  it("falls back to the shopper name, empty email and shipping line for retail orders", () => {
    expect(buildBankhubCustomer(makeOrder())).toEqual({
      name: "Nguyen Van A",
      email: "",
      phoneNumber: "0912345678",
      address: "1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
    });
  });

  it("marks an order paid only once the accumulated amount covers the total", () => {
    const now = new Date("2026-11-11T01:00:00.000Z");
    const order = makeOrder();
    const partial = applyIncomingPayment(order, 100000, now);
    expect(partial).toEqual({ paidAmount: 100000, paymentStatus: "pending", paidAt: null });
    const full = applyIncomingPayment({ ...order, ...partial }, 150000, now);
    expect(full).toEqual({ paidAmount: 250000, paymentStatus: "paid", paidAt: now });
  });

  it("hides bank data from shoppers until BankHub is initialized", () => {
    expect(serializeShopperPayment(makeOrder({ bankhubStatus: "failed", paymentDescription: "x" }))).toEqual({
      bankhubStatus: "failed",
      paymentDescription: null,
      vietQrUrl: null,
      bank: null,
    });
  });
});

describe("initializeBankhubForOrder", () => {
  beforeEach(() => {
    vi.mocked(createBankhubTransaction).mockReset();
    vi.mocked(loadBankhubConfig).mockReset();
  });

  it("stores the transfer description, VietQR and bank snapshot on success", async () => {
    const db = createFakeDb(makeOrder());
    vi.mocked(createBankhubTransaction).mockResolvedValue({
      bank: {
        bankCode: "VCB",
        bankName: "Vietcombank",
        bankAccountNumber: "9987996745",
        bankAccountName: "CTCP PHUNG THI",
        branchName: null,
        bankLogoUrl: null,
      },
      order: { orderId: "123", amount: 250000, description: "DH123", vietQrUrl: "https://qr.test/123.png" },
    });

    const updated = await initializeBankhubForOrder(db, {}, makeOrder(), config);

    expect(vi.mocked(createBankhubTransaction).mock.calls[0][1]).toMatchObject({
      orderId: "123",
      amount: 250000,
      exportInvoice: false,
    });
    expect(updated).toMatchObject({
      bankhubStatus: "initialized",
      paymentDescription: "DH123",
      vietQrUrl: "https://qr.test/123.png",
    });
    expect(JSON.parse(updated.bankhubBankJson!)).toMatchObject({ bankAccountName: "CTCP PHUNG THI" });
  });

  it("records the JETPAY error instead of throwing", async () => {
    const db = createFakeDb(makeOrder());
    vi.mocked(createBankhubTransaction).mockRejectedValue(
      new BankhubRequestError("BankHub transaction failed (HTTP 400) E1002: chưa kết nối", 400, "E1002"),
    );

    const updated = await initializeBankhubForOrder(db, {}, makeOrder(), config);

    expect(updated.bankhubStatus).toBe("failed");
    expect(updated.bankhubLastError).toContain("E1002");
  });

  it("marks the order not_configured without calling JETPAY when config is missing", async () => {
    const db = createFakeDb(makeOrder());
    vi.mocked(loadBankhubConfig).mockResolvedValue(null);

    const updated = await initializeBankhubForOrder(db, {}, makeOrder());

    expect(updated.bankhubStatus).toBe("not_configured");
    expect(createBankhubTransaction).not.toHaveBeenCalled();
  });
});

describe("processBankhubWebhookRecord", () => {
  it("marks a fully paid order paid and answers with the order customer", async () => {
    const db = createFakeDb(makeOrder());

    const response = await deliver(db, { transId: "JP1", amount: 250000 });

    expect(response).toEqual({
      transId: "JP1",
      error: 0,
      message: "Success",
      orderAmount: 250000,
      customer: {
        name: "Nguyen Van A",
        email: "",
        phoneNumber: "0912345678",
        address: "1 Tràng Tiền, Hoàn Kiếm, Hà Nội",
      },
    });
    expect(db.state.order).toMatchObject({ paidAmount: 250000, paymentStatus: "paid" });
    expect(db.state.transactions[0]).toMatchObject({
      transId: "JP1",
      bankTransId: "B-JP1",
      orderId: 123,
      orderRef: "123",
      matchStatus: "matched",
      confirmType: 1,
      webhookMsgId: "20261111080500",
    });
    expect(db.state.transactions[0].transTime.toISOString()).toBe("2026-11-11T01:05:00.000Z");
  });

  it("keeps a partially paid order pending until the remaining transfer arrives", async () => {
    const db = createFakeDb(makeOrder());

    await deliver(db, { transId: "JP1", amount: 100000 });
    expect(db.state.order).toMatchObject({ paidAmount: 100000, paymentStatus: "pending" });

    await deliver(db, { transId: "JP2", amount: 150000 });
    expect(db.state.order).toMatchObject({ paidAmount: 250000, paymentStatus: "paid" });
  });

  it("does not count a duplicate transId twice and replays the same record response", async () => {
    const db = createFakeDb(makeOrder());

    const first = await deliver(db, { transId: "JP1", amount: 100000 });
    const second = await deliver(db, { transId: "JP1", amount: 100000 });

    expect(second).toEqual(first);
    expect(db.state.order.paidAmount).toBe(100000);
    expect(db.state.transactions).toHaveLength(1);
  });

  it("answers error 1 and stores an unmatched transaction for an unknown order", async () => {
    const db = createFakeDb(null);

    const response = await deliver(db, { transId: "JP9", amount: 50000, orderId: "999" });

    expect(response).toEqual({ transId: "JP9", error: 1, message: "Order not found", orderAmount: 0 });
    expect(db.state.transactions[0]).toMatchObject({ orderId: null, orderRef: "999", matchStatus: "unmatched" });
  });

  it("answers error 2 and leaves a cancelled order untouched", async () => {
    const db = createFakeDb(makeOrder({ status: "cancelled" }));

    const response = await deliver(db, { transId: "JP3", amount: 250000 });

    expect(response).toMatchObject({ error: 2, message: "Order is cancelled", orderAmount: 250000 });
    expect(response.customer).toBeUndefined();
    expect(db.state.order).toMatchObject({ paidAmount: 0, paymentStatus: "pending" });
    expect(db.state.transactions[0].matchStatus).toBe("order_not_payable");
  });
});
