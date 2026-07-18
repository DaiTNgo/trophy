import { backendFetch } from "./fetch";
import type {
  CustomizationFormField,
  CustomizationFormValues,
  CustomizationLayer,
} from "@trophy/customization";

export type AdminOrderListItem = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  customerName: string;
  customerEmail: string | null;
  totalAmount: number;
  currencyCode: string;
  itemCount: number;
  createdAt: string;
};

export type AdminOrderDetail = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
  paymentMethod: string;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  primaryAddress: {
    line1: string;
    line2?: string;
    city: string;
    province?: string;
    postalCode?: string;
    country: string;
  } | null;
  shippingAddress: {
    recipientName: string;
    recipientPhone: string;
    address: {
      line1: string;
      line2?: string;
      city: string;
      province?: string;
      postalCode?: string;
      country: string;
    };
  } | null;
  totals: {
    subtotalAmount: number;
    totalAmount: number;
    currencyCode: string;
    itemCount: number;
  };
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: number;
    quantity: number;
    unitPriceAmount: number;
    lineSubtotalAmount: number;
    productionStatus: string;
    product: {
      id: number;
      title: string;
      handle: string;
      status: string;
    } | null;
    variant: {
      id: number;
      title: string;
      sku: string | null;
      priceAmount: number | null;
    } | null;
    background: {
      assetId: string;
      previewUrl: string;
      widthPx: number | null;
      heightPx: number | null;
    } | null;
    customization: {
      values: Array<{
        fieldId: string;
        label: string;
        valueSummary: string;
      }>;
      hasRenderedDesign: boolean;
      preview?: {
        values: CustomizationFormValues;
        templateSnapshot: {
          layers: CustomizationLayer[];
          formFields: CustomizationFormField[];
          canvasWidthPx: number | null;
          canvasHeightPx: number | null;
        };
      };
    } | null;
  }>;
};

export type AdminOrderStatusUpdate = {
  status?: "pending" | "confirmed" | "cancelled";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  fulfillmentStatus?: "unfulfilled" | "partially_fulfilled" | "fulfilled";
};

export type AdminOrderItemProductionUpdate = {
  productionStatus: "not_required" | "pending_review" | "ready";
};

function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

export async function fetchAdminOrders() {
  const response = await backendFetch("/api/admin/orders");
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? "Failed to load orders");
  }

  const body = await readJson<{ orders: AdminOrderListItem[] }>(response);
  return body.orders;
}

export async function fetchAdminOrderDetail(orderNumber: string) {
  const response = await backendFetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}`);
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? "Failed to load order detail");
  }

  const body = await readJson<{ order: AdminOrderDetail }>(response);
  return body.order;
}

export async function updateAdminOrderStatus(
  orderNumber: string,
  payload: AdminOrderStatusUpdate,
) {
  const response = await backendFetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? "Failed to update order");
  }

  const body = await readJson<{ order: AdminOrderDetail }>(response);
  return body.order;
}

export async function updateAdminOrderItemProductionStatus(
  orderNumber: string,
  itemId: number,
  payload: AdminOrderItemProductionUpdate,
) {
  const response = await backendFetch(
    `/api/admin/orders/${encodeURIComponent(orderNumber)}/items/${itemId}/production`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error ?? body?.message ?? "Failed to update production status");
  }

  const body = await readJson<{ order: AdminOrderDetail }>(response);
  return body.order;
}

export function formatAdminCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatAdminDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatStatusLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
