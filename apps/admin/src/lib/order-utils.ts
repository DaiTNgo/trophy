import type { Order } from "../types";

export function applyOrderAction(order: Order, action: "capture" | "fulfill" | "cancel"): Order {
  if (action === "capture") {
    return {
      ...order,
      status: order.status === "Pending" ? "Processing" : order.status,
      paymentStatus: "Captured",
      timeline: [
        { at: "2026-06-22 09:10", title: "Payment captured", detail: "Operator captured payment from the order detail page." },
        ...order.timeline,
      ],
    };
  }

  if (action === "fulfill") {
    return {
      ...order,
      status: "Fulfilled",
      fulfillmentStatus: "Fulfilled",
      timeline: [
        { at: "2026-06-22 09:25", title: "Order fulfilled", detail: "Operator marked the order as fully fulfilled." },
        ...order.timeline,
      ],
    };
  }

  return {
    ...order,
    status: "Canceled",
    paymentStatus: "Canceled",
    fulfillmentStatus: "Canceled",
    timeline: [
      { at: "2026-06-22 09:40", title: "Order canceled", detail: "Operator canceled the order from the detail page." },
      ...order.timeline,
    ],
  };
}
