import { getPaidAmount, getOutstandingAmount, getFulfillmentNotice, getFulfillmentTitle } from "./order-detail-utils";
import { OrderSummarySection, OrderPaymentsSection, OrderFulfillmentSection } from "./order-detail-sections";
import {
  type AdminOrderDetail,
  type AdminOrderStatusUpdate,
} from "../../lib/orders-client";
import type { OrderDetailItem } from "./order-detail-utils";

export function OrderDetailMainContent({
  order,
  updatingAction,
  onUpdateStatus,
  onPreviewItemChange,
  onMarkItemReady,
  onMarkItemPendingReview,
}: {
  order: AdminOrderDetail;
  updatingAction: string | null;
  onUpdateStatus: (
    payload: AdminOrderStatusUpdate,
    successMessage: string,
    actionId: string,
  ) => Promise<void>;
  onPreviewItemChange: (item: OrderDetailItem) => void;
  onMarkItemReady: (itemId: number, actionId: string) => Promise<void>;
  onMarkItemPendingReview: (itemId: number, actionId: string) => Promise<void>;
}) {
  const paidAmount = getPaidAmount(order);
  const outstandingAmount = getOutstandingAmount(order);
  const fulfillmentTitle = getFulfillmentTitle(order.fulfillmentStatus);
  const fulfillmentNotice = getFulfillmentNotice(order.fulfillmentStatus);

  return (
    <div className="flex flex-col gap-y-4">
      <OrderSummarySection
        order={order}
        paidAmount={paidAmount}
        outstandingAmount={outstandingAmount}
        updatingAction={updatingAction}
        onPreviewItemChange={onPreviewItemChange}
        onMarkItemReady={onMarkItemReady}
        onMarkItemPendingReview={onMarkItemPendingReview}
      />
      <OrderPaymentsSection
        order={order}
        paidAmount={paidAmount}
        outstandingAmount={outstandingAmount}
        updatingAction={updatingAction}
        onUpdateStatus={onUpdateStatus}
      />
      <OrderFulfillmentSection
        order={order}
        updatingAction={updatingAction}
        onUpdateStatus={onUpdateStatus}
        fulfillmentTitle={fulfillmentTitle}
        fulfillmentNotice={fulfillmentNotice}
      />
    </div>
  );
}
