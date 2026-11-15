import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

vi.mock("../../db/client", () => ({ getDb: vi.fn() }));
vi.mock("../../lib/admin-session", () => ({ getAdminSession: vi.fn() }));
vi.mock("../../lib/bankhub-payments", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/bankhub-payments")>()),
  initializeBankhubForOrder: vi.fn(),
}));

import { getDb } from "../../db/client";
import { getAdminSession } from "../../lib/admin-session";
import { initializeBankhubForOrder } from "../../lib/bankhub-payments";
import { adminRoute } from "./index";

function createMockDb() {
  const getQueue: unknown[] = [];
  const selectQueue: unknown[] = [];
  const chain = (): any => {
    const c: any = {
      from: () => c,
      where: () => c,
      orderBy: () => c,
      limit: () => c,
      get: async () => getQueue.shift() ?? null,
      then: (resolve: any, reject: any) => Promise.resolve(selectQueue.shift() ?? []).then(resolve, reject),
    };
    return c;
  };
  return { getQueue, selectQueue, select: vi.fn(chain) };
}

const orderRow = {
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
  primaryAddressJson: JSON.stringify({ line1: "1 Tràng Tiền" }),
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
  bankhubStatus: "initialized",
  bankhubLastError: null,
  bankhubInitializedAt: new Date("2026-11-11T01:00:00.000Z"),
  paymentDescription: "DH123",
  vietQrUrl: "https://qr.test/123.png",
  bankhubBankJson: JSON.stringify({ bankCode: "VCB", bankName: "Vietcombank", bankAccountNumber: "9987996745", bankAccountName: "CTCP PHUNG THI", branchName: null, bankLogoUrl: null }),
  paidAmount: 250000,
  paidAt: new Date("2026-11-11T01:10:00.000Z"),
  createdAt: new Date("2026-11-11T01:00:00.000Z"),
  updatedAt: new Date("2026-11-11T01:10:00.000Z"),
};

const transactionRow = (transId: string, amount: number) => ({
  id: transId === "JP1" ? 1 : 2,
  provider: "jetpay_bankhub",
  transId,
  bankTransId: `B-${transId}`,
  orderId: 123,
  orderRef: "123",
  amount,
  description: "DH123",
  transTime: new Date("2026-11-11T01:05:00.000Z"),
  confirmType: 1,
  matchStatus: "matched",
  webhookMsgId: "M1",
  responseJson: "{}",
  rawRecordJson: "{}",
  createdAt: new Date("2026-11-11T01:05:01.000Z"),
});

describe("admin order BankHub payment", () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    vi.mocked(getDb).mockReturnValue(db as never);
    vi.mocked(getAdminSession).mockResolvedValue({ user: { id: "user-1", role: "admin" } } as never);
    vi.mocked(initializeBankhubForOrder).mockReset().mockImplementation(async (_db, _env, order) => order);
  });

  it("shows received transfers with the paid amount on the order detail", async () => {
    db.getQueue.push(orderRow);
    db.selectQueue.push([], [transactionRow("JP2", 150000), transactionRow("JP1", 100000)]);

    const res = await adminRoute.request("/orders/123");
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(body.order.payment).toMatchObject({
      bankhubStatus: "initialized",
      paymentDescription: "DH123",
      paidAmount: 250000,
      paidAt: "2026-11-11T01:10:00.000Z",
      bank: { bankAccountNumber: "9987996745" },
    });
    expect(body.order.payment.transactions).toEqual([
      expect.objectContaining({ transId: "JP2", amount: 150000, confirmType: 1, matchStatus: "matched" }),
      expect.objectContaining({ transId: "JP1", amount: 100000, bankTransId: "B-JP1" }),
    ]);
    expect(body.order.payment.transactions[0]).not.toHaveProperty("rawRecordJson");
  });

  it("re-initializes BankHub for a pending bank-transfer order", async () => {
    const failed = { ...orderRow, bankhubStatus: "failed", paidAmount: 0, paidAt: null };
    db.getQueue.push(failed, { ...failed, bankhubStatus: "initialized" });

    const res = await adminRoute.request("/orders/123/bankhub/initialize", { method: "POST" });
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(vi.mocked(initializeBankhubForOrder).mock.calls[0][2]).toMatchObject({ id: 123 });
    expect(body.order.payment.bankhubStatus).toBe("initialized");
  });

  it("refuses to re-initialize a paid order", async () => {
    db.getQueue.push({ ...orderRow, paymentStatus: "paid" });

    const res = await adminRoute.request("/orders/123/bankhub/initialize", { method: "POST" });

    expect(res.status).toBe(409);
    expect(initializeBankhubForOrder).not.toHaveBeenCalled();
  });

  it("refuses to re-initialize a cash-on-delivery order", async () => {
    db.getQueue.push({ ...orderRow, paymentStatus: "pending", paymentMethod: "cash_on_delivery" });

    const res = await adminRoute.request("/orders/123/bankhub/initialize", { method: "POST" });

    expect(res.status).toBe(409);
  });

  it("returns 404 for an unknown order", async () => {
    const res = await adminRoute.request("/orders/999/bankhub/initialize", { method: "POST" });

    expect(res.status).toBe(404);
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(getAdminSession).mockResolvedValue(null);

    const res = await adminRoute.request("/orders/123/bankhub/initialize", { method: "POST" });

    expect(res.status).toBe(401);
    expect(initializeBankhubForOrder).not.toHaveBeenCalled();
  });
});
