import { desc, eq } from "drizzle-orm";
import type { Database } from "../db/client";
import { orders, paymentTransactions } from "../db/schema";
import {
  BankhubRequestError,
  createBankhubTransaction,
  type BankhubBankSnapshot,
  type BankhubConfig,
  type BankhubCustomer,
} from "./bankhub";
import { loadBankhubConfig } from "./bankhub-settings";
import type { AppBindings } from "./env";
import { parseOrderAddress, parseVatDetails } from "./order-utils";

export type OrderRow = typeof orders.$inferSelect;
export type PaymentTransactionRow = typeof paymentTransactions.$inferSelect;
export type BankhubStatus = "pending" | "initialized" | "failed" | "not_configured";

// ─── Pure helpers ──────────────────────────────────────────────────────────────

/** Customer block shared by transaction init (3.2.2) and webhook responses (3.2.3). */
export function buildBankhubCustomer(
  order: Pick<OrderRow, "customerName" | "customerPhone" | "customerEmail" | "vatDetailsJson" | "primaryAddressJson">,
): BankhubCustomer {
  const vat = parseVatDetails(order.vatDetailsJson);
  const address = vat?.address || parseOrderAddress(order.primaryAddressJson)?.line1 || "";
  return {
    name: vat?.name || order.customerName,
    email: vat?.email || order.customerEmail || "",
    phoneNumber: order.customerPhone,
    ...(vat?.taxId ? { taxNo: vat.taxId } : {}),
    ...(address ? { address } : {}),
  };
}

export function parseBankhubBank(value: string | null): BankhubBankSnapshot | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as BankhubBankSnapshot;
  } catch {
    return null;
  }
}

export function isOrderPayable(order: Pick<OrderRow, "status" | "paymentStatus">) {
  return (
    order.status !== "cancelled" &&
    order.paymentStatus !== "refunded" &&
    order.paymentStatus !== "cancelled"
  );
}

/** Accumulates an incoming transfer; only a fully covered pending order becomes `paid`. */
export function applyIncomingPayment(
  order: Pick<OrderRow, "paidAmount" | "totalAmount" | "paymentStatus" | "paidAt">,
  amount: number,
  now: Date,
) {
  const paidAmount = order.paidAmount + amount;
  const becomesPaid = order.paymentStatus === "pending" && paidAmount >= order.totalAmount;
  return {
    paidAmount,
    paymentStatus: becomesPaid ? "paid" : order.paymentStatus,
    paidAt: becomesPaid ? now : order.paidAt,
  };
}

export function serializeShopperPayment(order: OrderRow) {
  return {
    bankhubStatus: order.bankhubStatus as BankhubStatus,
    paymentDescription: order.bankhubStatus === "initialized" ? order.paymentDescription : null,
    vietQrUrl: order.bankhubStatus === "initialized" ? order.vietQrUrl : null,
    bank: order.bankhubStatus === "initialized" ? parseBankhubBank(order.bankhubBankJson) : null,
  };
}

// ─── Transaction initialization ───────────────────────────────────────────────

/**
 * Calls JETPAY 3.2.2 for a bank-transfer order and persists the outcome. Never throws for
 * BankHub problems: failure and "not configured" are stored on the order instead.
 */
export async function initializeBankhubForOrder(
  db: Database,
  bindings: AppBindings,
  order: OrderRow,
  config?: BankhubConfig | null,
): Promise<OrderRow> {
  const resolved = config === undefined ? await loadBankhubConfig(db, bindings) : config;
  let update: Partial<OrderRow>;
  if (!resolved) {
    update = { bankhubStatus: "not_configured", bankhubLastError: null };
  } else {
    try {
      const result = await createBankhubTransaction(resolved, {
        orderId: order.orderNumber,
        amount: order.totalAmount,
        exportInvoice: false,
        customer: buildBankhubCustomer(order),
      });
      update = {
        bankhubStatus: "initialized",
        bankhubLastError: null,
        bankhubInitializedAt: new Date(),
        paymentDescription: result.order.description,
        vietQrUrl: result.order.vietQrUrl,
        bankhubBankJson: JSON.stringify(result.bank),
      };
    } catch (error) {
      update = {
        bankhubStatus: "failed",
        bankhubLastError:
          error instanceof BankhubRequestError || error instanceof Error
            ? error.message
            : "BankHub transaction initialization failed",
      };
    }
  }
  await db.update(orders).set(update).where(eq(orders.id, order.id));
  return { ...order, ...update };
}

/** Loads the order and initializes it; used where only the id is at hand (checkout, admin retry). */
export async function initializeBankhubForOrderId(
  db: Database,
  bindings: AppBindings,
  orderId: number,
): Promise<OrderRow | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  return order ? initializeBankhubForOrder(db, bindings, order) : null;
}

// ─── Webhook records ───────────────────────────────────────────────────────────

export type BankhubWebhookRecord = {
  orderConfirmType?: number | null;
  orderId: string;
  amount: number;
  description?: string | null;
  transId: string;
  bankTransId?: string | null;
  transTime?: string | null;
};

export type BankhubWebhookRecordResponse = {
  transId: string;
  error: number;
  message: string;
  orderAmount: number;
  customer?: BankhubCustomer;
};

export const WEBHOOK_ERROR_SUCCESS = 0;
export const WEBHOOK_ERROR_INVALID_ORDER = 1;
export const WEBHOOK_ERROR_ORDER_NOT_PAYABLE = 2;

function parseTransTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Records one JETPAY transaction idempotently (unique transId) and applies it to the matched order.
 * A duplicate delivery returns the stored record response without touching the order again.
 */
export async function processBankhubWebhookRecord(
  db: Database,
  record: BankhubWebhookRecord,
  msgId: string,
  now = new Date(),
): Promise<BankhubWebhookRecordResponse> {
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({ responseJson: paymentTransactions.responseJson })
      .from(paymentTransactions)
      .where(eq(paymentTransactions.transId, record.transId))
      .limit(1);
    if (existing[0]) return JSON.parse(existing[0].responseJson) as BankhubWebhookRecordResponse;

    const [order] = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, record.orderId))
      .limit(1)
      .for("update");

    let response: BankhubWebhookRecordResponse;
    let matchStatus: "matched" | "unmatched" | "order_not_payable";
    if (!order) {
      matchStatus = "unmatched";
      response = {
        transId: record.transId,
        error: WEBHOOK_ERROR_INVALID_ORDER,
        message: "Order not found",
        orderAmount: 0,
      };
    } else if (!isOrderPayable(order)) {
      matchStatus = "order_not_payable";
      response = {
        transId: record.transId,
        error: WEBHOOK_ERROR_ORDER_NOT_PAYABLE,
        message: `Order is ${order.status === "cancelled" ? "cancelled" : order.paymentStatus}`,
        orderAmount: order.totalAmount,
      };
    } else {
      matchStatus = "matched";
      response = {
        transId: record.transId,
        error: WEBHOOK_ERROR_SUCCESS,
        message: "Success",
        orderAmount: order.totalAmount,
        customer: buildBankhubCustomer(order),
      };
    }

    const inserted = await tx
      .insert(paymentTransactions)
      .values({
        transId: record.transId,
        bankTransId: record.bankTransId ?? null,
        orderId: order?.id ?? null,
        orderRef: record.orderId,
        amount: record.amount,
        description: record.description ?? null,
        transTime: parseTransTime(record.transTime),
        confirmType: record.orderConfirmType ?? null,
        matchStatus,
        webhookMsgId: msgId,
        responseJson: JSON.stringify(response),
        rawRecordJson: JSON.stringify(record),
        createdAt: now,
      })
      .onConflictDoNothing({ target: paymentTransactions.transId })
      .returning({ id: paymentTransactions.id });

    if (inserted.length === 0) {
      // Lost a race with a concurrent delivery of the same transId.
      const [stored] = await tx
        .select({ responseJson: paymentTransactions.responseJson })
        .from(paymentTransactions)
        .where(eq(paymentTransactions.transId, record.transId))
        .limit(1);
      return stored ? (JSON.parse(stored.responseJson) as BankhubWebhookRecordResponse) : response;
    }

    if (order && matchStatus === "matched") {
      await tx
        .update(orders)
        .set(applyIncomingPayment(order, record.amount, now))
        .where(eq(orders.id, order.id));
    }
    return response;
  });
}

export async function listOrderPaymentTransactions(db: Database, orderId: number) {
  return db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orderId, orderId))
    .orderBy(desc(paymentTransactions.createdAt));
}
