import type {
  AdminOrderDetail,
  AdminOrderStatusUpdate,
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

export function getPaidAmount(order: AdminOrderDetail) {
  return order.paymentStatus === "paid" ? order.totals.totalAmount : 0;
}

export function getOutstandingAmount(order: AdminOrderDetail) {
  if (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "cancelled"
  ) {
    return 0;
  }

  return order.totals.totalAmount;
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

export function getCancelOrderUpdate(
  order: AdminOrderDetail,
): AdminOrderStatusUpdate {
  return {
    status: "cancelled",
    ...(order.paymentStatus === "pending"
      ? { paymentStatus: "cancelled" }
      : {}),
  };
}
