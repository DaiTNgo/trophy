import {
  Button,
  Container,
  DropdownMenu,
  Heading,
  StatusBadge,
  Text,
} from "@medusajs/ui";
import { EllipsisHorizontal, SquareTwoStack } from "@medusajs/icons";

import {
  formatAdminCurrency,
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderDetail,
} from "../../lib/orders-client";
import {
  getBadgeColor,
  getProductionSummary,
  renderAddress,
} from "./order-detail-utils";

function DisabledActionHint() {
  return (
    <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">
      Backend workflow not implemented yet
    </Text>
  );
}

export function OrderDetailSidebar({
  order,
}: {
  order: AdminOrderDetail;
}) {
  const hasProductionReviewItems = order.items.some(
    (item) => item.customization?.values.length,
  );
  const hasPendingProductionReview = order.items.some(
    (item) => item.productionStatus === "pending_review",
  );
  const productionSummary = getProductionSummary(order.items);

  return (
    <aside className="flex flex-col gap-y-4">
      {/* Customer */}
      <Container className="p-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <Heading level="h2">Customer</Heading>
          <div className="flex items-center gap-x-3">
            <Text size="small" className="text-ui-fg-subtle">
              Order address snapshot
            </Text>
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="transparent" size="small" className="p-1">
                  <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item disabled>Edit contact</DropdownMenu.Item>
                <DropdownMenu.Item disabled>
                  Edit shipping address
                </DropdownMenu.Item>
                <DropdownMenu.Item disabled>
                  Edit billing address
                </DropdownMenu.Item>
                <DisabledActionHint />
              </DropdownMenu.Content>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-y-6">
          <div className="flex items-center gap-x-3">
            <div className="h-8 w-8 rounded-full bg-ui-bg-component flex items-center justify-center border border-ui-border-base">
              <Text size="small" className="font-medium text-ui-fg-subtle">
                {order.customer.name.charAt(0).toUpperCase()}
              </Text>
            </div>
            <Text size="small" className="text-ui-fg-base">
              {order.customer.name}
            </Text>
          </div>

          <div className="flex flex-col gap-y-4">
            <div className="flex items-start justify-between">
              <Text size="small" className="text-ui-fg-subtle font-medium">
                Contact
              </Text>
              <div className="flex flex-col items-end gap-y-1">
                <div className="flex items-center gap-x-2 group">
                  <Text size="small" className="text-ui-fg-base">
                    {order.customer.email ?? "No email"}
                  </Text>
                  <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                </div>
                {order.customer.phone && (
                  <div className="flex items-center gap-x-2 group">
                    <Text size="small" className="text-ui-fg-base">
                      {order.customer.phone}
                    </Text>
                    <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start justify-between">
              <Text size="small" className="text-ui-fg-subtle font-medium">
                Shipping address
              </Text>
              <div className="flex gap-x-2 group max-w-[60%]">
                <Text size="small" className="text-ui-fg-base text-right">
                  {order.shippingAddress ? (
                    <>
                      {order.shippingAddress.recipientName}
                      <br />
                      {renderAddress(order.shippingAddress.address)}
                    </>
                  ) : (
                    renderAddress(order.primaryAddress)
                  )}
                </Text>
                <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer mt-1 shrink-0" />
              </div>
            </div>

            <div className="flex items-start justify-between pt-4 border-t border-ui-border-base">
              <Text size="small" className="text-ui-fg-subtle font-medium">
                Billing address
              </Text>
              <Text size="small" className="text-ui-fg-muted text-right">
                Same as shipping address
              </Text>
            </div>
          </div>
        </div>
      </Container>

      {(order.notes || order.vat) && (
        <Container className="p-0">
          <div className="border-b border-ui-border-base px-6 py-4">
            <Heading level="h2">Order information</Heading>
          </div>
          <div className="flex flex-col gap-y-5 p-6">
            {order.notes ? (
              <div className="flex flex-col gap-y-1">
                <Text size="small" className="font-medium text-ui-fg-subtle">
                  Customer note
                </Text>
                <Text size="small" className="whitespace-pre-wrap text-ui-fg-base">
                  {order.notes}
                </Text>
              </div>
            ) : null}
            {order.vat ? (
              <div className="flex flex-col gap-y-3">
                <Text size="small" className="font-medium text-ui-fg-subtle">
                  VAT invoice
                </Text>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                  {[
                    ["Invoice type", order.vat.type],
                    ["Name", order.vat.name],
                    ["Tax ID", order.vat.taxId],
                    ["Email", order.vat.email],
                    ["Billing address", order.vat.address],
                  ].filter(([, value]) => value).map(([label, value]) => (
                    <Text key={label} size="small" className="contents">
                      <span className="text-ui-fg-subtle">{label}</span>
                      <span className="break-words text-right text-ui-fg-base">{value}</span>
                    </Text>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Container>
      )}

      {/* Production */}
      <Container className="p-0">
        <div className="flex items-center justify-between border-b border-ui-border-base px-6 py-4">
          <Heading level="h2">Production</Heading>
          <StatusBadge
            color={
              hasPendingProductionReview
                ? "orange"
                : hasProductionReviewItems
                  ? "green"
                  : "grey"
            }
          >
            {hasPendingProductionReview
              ? "Pending review"
              : hasProductionReviewItems
                ? "Ready"
                : "No review"}
          </StatusBadge>
        </div>
        <div className="flex flex-col gap-y-3 p-6">
          <Text size="small" className="text-ui-fg-subtle">
            {productionSummary}
          </Text>
          <div className="flex flex-col divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
            {order.items.map((item) => (
              <div
                key={`production-${item.id}`}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <div className="min-w-0">
                  <Text size="small" className="truncate text-ui-fg-base">
                    {item.product?.title ?? "Unknown product"}
                  </Text>
                  <Text size="xsmall" className="truncate text-ui-fg-subtle">
                    {item.variant?.title ?? "Unknown variant"}
                  </Text>
                </div>
                <StatusBadge color={getBadgeColor(item.productionStatus)}>
                  {formatStatusLabel(item.productionStatus)}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>
      </Container>

      {/* Activity */}
      <Container className="p-0">
        <div className="px-6 py-4 border-b border-ui-border-base">
          <Heading level="h2">Activity</Heading>
        </div>
        <div className="p-6 flex flex-col gap-y-4">
          <div className="relative pl-6">
            <div className="absolute top-2 left-1.5 h-2 w-2 rounded-full bg-ui-fg-muted"></div>
            <div className="absolute top-4 left-2 h-full w-px bg-ui-border-base"></div>
            <div className="flex flex-col gap-y-0.5">
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-base">
                  {order.paymentStatus === "paid"
                    ? "Payment marked paid"
                    : "Awaiting manual payment"}
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {formatAdminDate(order.updatedAt)}
                </Text>
              </div>
              <Text size="small" className="text-ui-fg-muted">
                {formatAdminCurrency(
                  order.totals.totalAmount,
                  order.totals.currencyCode,
                )}
              </Text>
            </div>
          </div>

          <div className="relative pl-6">
            <div className="absolute top-2 left-1.5 h-2 w-2 rounded-full bg-ui-fg-muted ring-2 ring-ui-bg-base"></div>
            <div className="flex flex-col gap-y-0.5">
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-base">
                  Order placed
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {formatAdminDate(order.createdAt)}
                </Text>
              </div>
              <Text size="small" className="text-ui-fg-muted">
                {formatAdminCurrency(
                  order.totals.totalAmount,
                  order.totals.currencyCode,
                )}
              </Text>
            </div>
          </div>
        </div>
      </Container>
    </aside>
  );
}
