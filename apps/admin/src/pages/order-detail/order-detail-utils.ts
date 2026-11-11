import type {
  AdminOrderDetail,
} from "../../lib/orders-client";

export type OrderDetailItem = AdminOrderDetail["items"][number];

export function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "fulfilled":
    case "paid":
    case "ready":
      return "green";
    case "pending":
    case "unfulfilled":
    case "partially_fulfilled":
      return "orange";
    case "confirmed":
      return "blue";
    case "cancelled":
    case "failed":
    case "refunded":
      return "red";
    default:
      return "grey";
  }
}

export function renderAddress(address: AdminOrderDetail["primaryAddress"]) {
  if (!address) {
    return "No address on record.";
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/** Sum of matched BankHub transfers; a manually marked paid order counts as fully paid. */
export function getPaidAmount(order: AdminOrderDetail) {
  return order.paymentStatus === "paid"
    ? Math.max(order.payment.paidAmount, order.totals.totalAmount)
    : order.payment.paidAmount;
}

export function getOutstandingAmount(order: AdminOrderDetail) {
  if (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "cancelled"
  ) {
    return 0;
  }

  return Math.max(order.totals.totalAmount - order.payment.paidAmount, 0);
}

export function getPaymentNotice(order: AdminOrderDetail) {
  if (order.paymentStatus === "paid") {
    return "Manual payment has been marked as paid.";
  }

  if (order.paymentStatus === "failed") {
    return "Manual payment follow-up failed and needs operator review.";
  }

  if (order.paymentStatus === "refunded") {
    return "Payment has been refunded.";
  }

  if (order.paymentStatus === "cancelled") {
    return "Payment collection was cancelled with the order.";
  }

  if (order.paymentMethod === "bank_transfer" && order.payment.bankhubStatus === "initialized") {
    return order.payment.paidAmount > 0
      ? "Partial bank transfer received; waiting for the remaining amount via BankHub."
      : "Waiting for the bank transfer to be confirmed by JETPAY BankHub.";
  }

  return "Manual payment is pending operator follow-up.";
}

export function getFulfillmentTitle(status: string) {
  if (status === "fulfilled") return "Fulfilled Items";
  if (status === "partially_fulfilled") return "Partially Fulfilled Items";
  return "Unfulfilled Items";
}

export function getFulfillmentNotice(status: string) {
  if (status === "fulfilled") {
    return "All order items are marked fulfilled.";
  }

  if (status === "partially_fulfilled") {
    return "Some order items still need fulfillment follow-up.";
  }

  return "Order items are awaiting fulfillment.";
}

export function getProductionSummary(items: OrderDetailItem[]) {
  const customItems = items.filter((item) => item.customization?.values.length);
  const pendingItems = items.filter(
    (item) => item.productionStatus === "pending_review",
  );

  if (customItems.length === 0) {
    return "No production review is required for plain order items.";
  }

  if (pendingItems.length > 0) {
    return `${pendingItems.length} customized item${pendingItems.length === 1 ? "" : "s"} pending production review.`;
  }

  return "Customized items are ready for production.";
}
