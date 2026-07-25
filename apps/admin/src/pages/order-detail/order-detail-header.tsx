import {
  Button,
  Container,
  DropdownMenu,
  Heading,
  StatusBadge,
  Text,
} from "@medusajs/ui";
import { EllipsisHorizontal, SquareTwoStack, XMark } from "@medusajs/icons";

import {
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderDetail,
  type AdminOrderStatusUpdate,
} from "../../lib/orders-client";
import { getBadgeColor, getCancelOrderUpdate } from "./order-detail-utils";

export function OrderDetailHeader({
  order,
  isUpdating,
  onUpdateStatus,
}: {
  order: AdminOrderDetail;
  isUpdating: boolean;
  onUpdateStatus: (
    payload: AdminOrderStatusUpdate,
    successMessage: string,
    actionId: string,
  ) => Promise<void>;
}) {
  return (
    <Container className="p-0">
      <div className="flex items-center justify-between p-6">
        <div className="flex flex-col gap-y-2">
          <div className="flex items-center gap-x-2">
            <Heading level="h1">#{order.orderNumber}</Heading>
            <Button variant="transparent" size="small" className="p-1 h-auto">
              <SquareTwoStack className="h-4 w-4 text-ui-fg-muted" />
            </Button>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {formatAdminDate(order.createdAt)}
          </Text>
        </div>
        <div className="flex items-center gap-x-3">
          <StatusBadge color={getBadgeColor(order.paymentStatus)}>
            {formatStatusLabel(order.paymentStatus)}
          </StatusBadge>
          <StatusBadge color={getBadgeColor(order.fulfillmentStatus)}>
            {formatStatusLabel(order.fulfillmentStatus)}
          </StatusBadge>
          <StatusBadge color={getBadgeColor(order.status)}>
            {formatStatusLabel(order.status)}
          </StatusBadge>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="transparent" size="small" className="p-1">
                <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={order.status === "cancelled" || isUpdating}
                onClick={() =>
                  void onUpdateStatus(
                    getCancelOrderUpdate(order),
                    "Order cancelled",
                    "cancel-order",
                  )
                }
              >
                <XMark className="mr-2 h-4 w-4" />
                Cancel order
              </DropdownMenu.Item>
              <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">
                Pending manual payment is cancelled with the order; settled
                payments stay separate.
              </Text>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
    </Container>
  );
}
