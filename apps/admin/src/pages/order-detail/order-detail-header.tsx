import { useState } from "react";
import {
  Button,
  Container,
  DropdownMenu,
  FocusModal,
  Heading,
  Input,
  Label,
  StatusBadge,
  Text,
} from "@medusajs/ui";
import { EllipsisHorizontal, SquareTwoStack, Trash } from "@medusajs/icons";

import {
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderDetail,
} from "../../lib/orders-client";
import { useAuth } from "../../hooks/use-auth";
import { isSuperAdmin } from "../../lib/auth-utils";
import { getBadgeColor } from "./order-detail-utils";

export function OrderDetailHeader({
  order,
  isUpdating,
  onPurge,
}: {
  order: AdminOrderDetail;
  isUpdating: boolean;
  onPurge: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [purgeOpen, setPurgeOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const eligibleForPurge = order.status === "pending" &&
    order.paymentStatus === "pending" &&
    order.fulfillmentStatus === "unfulfilled";
  const confirmationText = `PURGE ${order.orderNumber}`;
  const canPurge = isSuperAdmin(user?.role) && eligibleForPurge;

  async function confirmPurge() {
    if (confirmation !== confirmationText || isUpdating) return;
    await onPurge();
  }

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
          {canPurge ? (
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="transparent" size="small" className="p-1">
                  <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={() => setPurgeOpen(true)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Purge order
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      <FocusModal open={purgeOpen} onOpenChange={setPurgeOpen}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h2">Permanently delete order</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-col gap-4 px-6 py-6">
            <Text size="small" className="text-ui-fg-subtle">
              Verify that no bank transfer has arrived. Trophy deletes the MISA
              SaleOrder first, then permanently removes this local order. This
              cannot be undone.
            </Text>
            <div className="flex flex-col gap-2">
              <Label htmlFor="purge-order-confirmation">
                Type {confirmationText} to confirm
              </Label>
              <Input
                id="purge-order-confirmation"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
              />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <FocusModal.Close asChild>
              <Button variant="secondary" disabled={isUpdating}>Keep order</Button>
            </FocusModal.Close>
            <Button
              variant="danger"
              isLoading={isUpdating}
              disabled={confirmation !== confirmationText || isUpdating}
              onClick={() => void confirmPurge()}
            >
              Permanently delete
            </Button>
          </FocusModal.Footer>
        </FocusModal.Content>
      </FocusModal>
    </Container>
  );
}
