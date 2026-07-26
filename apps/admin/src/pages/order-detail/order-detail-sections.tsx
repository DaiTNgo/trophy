import { Button, Container, DropdownMenu, Heading, StatusBadge, Text } from "@medusajs/ui";
import { ArrowPath, EllipsisHorizontal, PencilSquare, ShoppingCart, SquareTwoStack } from "@medusajs/icons";
import { formatAdminCurrency, formatAdminDate, formatStatusLabel } from "../../lib/orders-client";
import { getBadgeColor, getPaymentNotice, type OrderDetailItem } from "./order-detail-utils";
import type { AdminOrderDetail, AdminOrderStatusUpdate } from "../../lib/orders-client";

function DisabledActionHint() {
  return <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">Backend workflow not implemented yet</Text>;
}

function ActionHint({ children }: { children: string }) {
  return <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">{children}</Text>;
}

export function OrderSummarySection({
  order, paidAmount, outstandingAmount, updatingAction, onPreviewItemChange, onMarkItemReady, onMarkItemPendingReview,
}: {
  order: AdminOrderDetail;
  paidAmount: number;
  outstandingAmount: number;
  updatingAction: string | null;
  onPreviewItemChange: (item: OrderDetailItem) => void;
  onMarkItemReady: (itemId: number, actionId: string) => Promise<void>;
  onMarkItemPendingReview: (itemId: number, actionId: string) => Promise<void>;
}) {
  return (

    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <Heading level="h2">Summary</Heading>
        <div className="flex items-center gap-x-3">
          <Text size="small" className="text-ui-fg-subtle">
            Immutable order item snapshots
          </Text>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="transparent" size="small" className="p-1">
                <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item disabled>
                <PencilSquare className="mr-2 h-4 w-4" />
                Edit order
              </DropdownMenu.Item>
              <DisabledActionHint />
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col gap-y-0 p-6">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col gap-y-3 py-4 border-b border-ui-border-base last:border-0 last:pb-0 first:pt-0"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-x-4">
                <div className="h-10 w-8 bg-ui-bg-subtle rounded flex items-center justify-center border border-ui-border-base shrink-0 overflow-hidden">
                  <ShoppingCart className="h-4 w-4 text-ui-fg-muted" />
                </div>
                <div className="flex flex-col gap-y-0.5">
                  <Text size="small" className="font-medium text-ui-fg-base">
                    {item.product?.title ?? "Unknown product"}
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {item.variant?.title ?? "Unknown variant"}
                  </Text>
                  {item.variant?.sku && (
                    <Text
                      size="xsmall"
                      className="text-ui-fg-muted mt-1 font-mono"
                    >
                      {item.variant.sku}
                    </Text>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-x-6 text-ui-fg-muted">
                <Text size="small">
                  {formatAdminCurrency(
                    item.lineSubtotalAmount,
                    order.totals.currencyCode,
                  )}
                </Text>
                <Text size="small">{item.quantity}x</Text>
                <StatusBadge color="green">Allocated</StatusBadge>
                <Text
                  size="small"
                  className="font-medium text-ui-fg-base w-16 text-right"
                >
                  {formatAdminCurrency(
                    item.lineSubtotalAmount,
                    order.totals.currencyCode,
                  )}
                </Text>
              </div>
            </div>

            {/* Production Ticket (Customization) */}
            {item.customization?.values.length ? (
              <div className="ml-12 mt-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-ui-border-base">
                  <Text
                    size="xsmall"
                    className="font-medium text-ui-fg-base uppercase tracking-wider"
                  >
                    Production Ticket
                  </Text>
                  <StatusBadge color={getBadgeColor(item.productionStatus)}>
                    {formatStatusLabel(item.productionStatus)}
                  </StatusBadge>
                </div>
                <div className="flex flex-col gap-y-1.5">
                  {item.customization.values.map((entry) => (
                    <div key={entry.fieldId} className="flex gap-x-2">
                      <Text
                        size="xsmall"
                        className="font-medium text-ui-fg-subtle w-24 shrink-0"
                      >
                        {entry.label}
                      </Text>
                      <Text
                        size="xsmall"
                        className="text-ui-fg-base break-words font-medium"
                      >
                        {entry.valueSummary}
                      </Text>
                    </div>
                  ))}
                </div>
                {item.customization.preview ? (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-ui-border-base pt-3">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={() => onPreviewItemChange(item)}
                    >
                      Preview
                    </Button>
                    {item.productionStatus === "pending_review" ? (
                      <Button
                        variant="primary"
                        size="small"
                        disabled={Boolean(updatingAction)}
                        onClick={() =>
                          void onMarkItemReady(
                            item.id,
                            `production-ready-${item.id}`,
                          )
                        }
                      >
                        Mark ready
                      </Button>
                    ) : item.productionStatus === "ready" ? (
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={Boolean(updatingAction)}
                        onClick={() =>
                          void onMarkItemPendingReview(
                            item.id,
                            `production-pending-${item.id}`,
                          )
                        }
                      >
                        Mark pending
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            {!item.customization?.values.length ? (
              <div className="ml-12 mt-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-y-0.5">
                    <Text
                      size="xsmall"
                      className="font-medium uppercase tracking-wider text-ui-fg-base"
                    >
                      Production Ticket
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      Plain item snapshot; no customization review is
                      required.
                    </Text>
                  </div>
                  <StatusBadge color={getBadgeColor(item.productionStatus)}>
                    {formatStatusLabel(item.productionStatus)}
                  </StatusBadge>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="p-6 border-t border-ui-border-base flex flex-col gap-y-3">
        <div className="flex items-center justify-between">
          <Text size="small" className="text-ui-fg-subtle">
            Item Subtotal
          </Text>
          <Text size="small" className="text-ui-fg-base">
            {formatAdminCurrency(
              order.totals.subtotalAmount,
              order.totals.currencyCode,
            )}
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <Text
            size="small"
            className="text-ui-fg-subtle flex items-center gap-x-1"
          >
            Shipping Subtotal <span className="text-ui-fg-muted">›</span>
          </Text>
          <Text size="small" className="text-ui-fg-base">
            Included in manual follow-up
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <Text size="small" className="text-ui-fg-subtle">
            Tax Total
          </Text>
          <Text size="small" className="text-ui-fg-base">
            Included in manual follow-up
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <Text size="small" className="font-medium text-ui-fg-base">
            Order Total
          </Text>
          <Text size="small" className="font-medium text-ui-fg-base">
            {formatAdminCurrency(
              order.totals.totalAmount,
              order.totals.currencyCode,
            )}
          </Text>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-ui-border-base border-dashed">
          <Text size="small" className="text-ui-fg-subtle">
            Paid Total
          </Text>
          <Text size="small" className="text-ui-fg-base">
            {formatAdminCurrency(paidAmount, order.totals.currencyCode)}
          </Text>
        </div>
        <div className="flex items-center justify-between">
          <Text size="small" className="font-medium text-ui-fg-base">
            Outstanding amount
          </Text>
          <Text size="small" className="font-medium text-ui-fg-base">
            {formatAdminCurrency(
              outstandingAmount,
              order.totals.currencyCode,
            )}
          </Text>
        </div>
      </div>
    </Container>

  );
}

export function OrderPaymentsSection({
  order, paidAmount, outstandingAmount, updatingAction, onUpdateStatus,
}: {
  order: AdminOrderDetail;
  paidAmount: number;
  outstandingAmount: number;
  updatingAction: string | null;
  onUpdateStatus: (payload: AdminOrderStatusUpdate, successMessage: string, actionId: string) => Promise<void>;
}) {
  const hasPendingPayment = order.paymentStatus === "pending";
  return (

    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <Heading level="h2">Payments</Heading>
        <div className="flex items-center gap-x-3">
          <StatusBadge color={getBadgeColor(order.paymentStatus)}>
            {formatStatusLabel(order.paymentStatus)}
          </StatusBadge>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="transparent" size="small" className="p-1">
                <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={
                  order.paymentStatus === "paid" || Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { paymentStatus: "paid" },
                    "Payment marked as paid",
                    "payment-paid",
                  )
                }
              >
                Mark as paid
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={
                  order.paymentStatus === "failed" || Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { paymentStatus: "failed" },
                    "Payment marked as failed",
                    "payment-failed",
                  )
                }
              >
                Mark as failed
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={
                  order.paymentStatus === "refunded" ||
                  Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { paymentStatus: "refunded" },
                    "Payment marked as refunded",
                    "payment-refunded",
                  )
                }
              >
                Refund payment
              </DropdownMenu.Item>
              <ActionHint>
                Manual payment state is tracked on the order record.
              </ActionHint>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
      <div className="p-6 flex flex-col gap-y-4">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-y-0.5">
            <Text size="small" className="text-ui-fg-base">
              #PAY_DEFAULT
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {formatAdminDate(order.createdAt)}
            </Text>
          </div>
          <div className="flex items-center gap-x-6">
            <Text size="small" className="text-ui-fg-subtle">
              {formatStatusLabel(order.paymentMethod)}
            </Text>
            <StatusBadge color={getBadgeColor(order.paymentStatus)}>
              {formatStatusLabel(order.paymentStatus)}
            </StatusBadge>
            <Text size="small" className="text-ui-fg-base w-16 text-right">
              {formatAdminCurrency(
                order.totals.totalAmount,
                order.totals.currencyCode,
              )}
            </Text>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
          <div className="flex items-center gap-x-2 text-ui-fg-subtle">
            <ArrowPath className="h-4 w-4" />
            <Text size="small">{getPaymentNotice(order)}</Text>
          </div>
          <Button
            variant="secondary"
            size="small"
            disabled={!hasPendingPayment || Boolean(updatingAction)}
            isLoading={updatingAction === "payment-paid-inline"}
            onClick={() =>
              void onUpdateStatus(
                { paymentStatus: "paid" },
                "Payment marked as paid",
                "payment-paid-inline",
              )
            }
          >
            {hasPendingPayment ? "Mark as paid" : "No payment action"}
          </Button>
        </div>

        <div className="flex flex-col gap-y-2 mt-2">
          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle">
              Total paid by customer
            </Text>
            <Text size="small" className="text-ui-fg-base">
              {formatAdminCurrency(paidAmount, order.totals.currencyCode)}
            </Text>
          </div>
          <div className="flex items-center justify-between">
            <Text size="small" className="font-medium text-ui-fg-base">
              Outstanding amount
            </Text>
            <Text size="small" className="font-medium text-ui-fg-base">
              {formatAdminCurrency(
                outstandingAmount,
                order.totals.currencyCode,
              )}
            </Text>
          </div>
        </div>
      </div>
    </Container>

  );
}

export function OrderFulfillmentSection({
  order, updatingAction, onUpdateStatus, fulfillmentTitle, fulfillmentNotice,
}: {
  order: AdminOrderDetail;
  updatingAction: string | null;
  onUpdateStatus: (payload: AdminOrderStatusUpdate, successMessage: string, actionId: string) => Promise<void>;
  fulfillmentTitle: string;
  fulfillmentNotice: string;
}) {
  return (

    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <Heading level="h2">{fulfillmentTitle}</Heading>
        <div className="flex items-center gap-x-3">
          <StatusBadge color={getBadgeColor(order.fulfillmentStatus)}>
            {formatStatusLabel(order.fulfillmentStatus)}
          </StatusBadge>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <Button variant="transparent" size="small" className="p-1">
                <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={
                  order.fulfillmentStatus === "fulfilled" ||
                  Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { fulfillmentStatus: "fulfilled" },
                    "Order marked fulfilled",
                    "fulfillment-fulfilled",
                  )
                }
              >
                Fulfill order
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={
                  order.fulfillmentStatus === "partially_fulfilled" ||
                  Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { fulfillmentStatus: "partially_fulfilled" },
                    "Order marked partially fulfilled",
                    "fulfillment-partial",
                  )
                }
              >
                Mark partially fulfilled
              </DropdownMenu.Item>
              <DropdownMenu.Item
                disabled={
                  order.fulfillmentStatus === "unfulfilled" ||
                  Boolean(updatingAction)
                }
                onClick={() =>
                  void onUpdateStatus(
                    { fulfillmentStatus: "unfulfilled" },
                    "Order marked unfulfilled",
                    "fulfillment-unfulfilled",
                  )
                }
              >
                Mark unfulfilled
              </DropdownMenu.Item>
              <ActionHint>
                Fulfillment state is tracked at order level until shipment
                records exist.
              </ActionHint>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
      </div>
      <div className="border-b border-ui-border-base px-6 py-3">
        <Text size="small" className="text-ui-fg-subtle">
          {fulfillmentNotice}
        </Text>
      </div>
      <div className="p-6">
        {order.items.map((item) => (
          <div
            key={`unfulfilled-${item.id}`}
            className="flex items-start justify-between gap-4 py-3 border-b border-ui-border-base last:border-0 last:pb-0 first:pt-0"
          >
            <div className="flex items-start gap-x-4">
              <div className="h-10 w-8 bg-ui-bg-subtle rounded flex items-center justify-center border border-ui-border-base shrink-0 overflow-hidden">
                <ShoppingCart className="h-4 w-4 text-ui-fg-muted" />
              </div>
              <div className="flex flex-col gap-y-0.5">
                <Text size="small" className="font-medium text-ui-fg-base">
                  {item.product?.title ?? "Unknown product"}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {item.variant?.title ?? "Unknown variant"}{" "}
                  <SquareTwoStack className="inline ml-1 h-3 w-3 text-ui-fg-muted" />
                </Text>
              </div>
            </div>

            <div className="flex items-center gap-x-6 text-ui-fg-muted mt-2">
              <Text size="small">
                {formatAdminCurrency(
                  item.lineSubtotalAmount,
                  order.totals.currencyCode,
                )}
              </Text>
              <Text size="small">{item.quantity}x</Text>
              <Text
                size="small"
                className="font-medium text-ui-fg-base w-16 text-right"
              >
                {formatAdminCurrency(
                  item.lineSubtotalAmount,
                  order.totals.currencyCode,
                )}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </Container>
  );
}
