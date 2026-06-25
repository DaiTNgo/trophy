import { startTransition, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  Badge,
  Button,
  Container,
  Heading,
  Text,
} from "@medusajs/ui";
import {
  ArrowLeft,
  Clock,
  CreditCard,
  MapPin,
  Package,
  ShoppingCart,
  User,
  XCircle,
} from "lucide-react";
import { ChecklistItem } from "../components/ui/medusa/checklist-item";
import { InlineError } from "../components/ui/medusa/inline-error";
import { useOrders } from "../hooks/use-orders";
import { formatCurrency } from "../lib/utils";

function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "Fulfilled":
    case "Captured":
      return "green";
    case "Pending":
    case "Partially fulfilled":
      return "orange";
    case "Processing":
    case "Authorized":
      return "blue";
    case "Canceled":
    case "Refunded":
      return "red";
    default:
      return "grey";
  }
}

export function OrderDetailPage() {
  const { orderId } = useParams();
  const { orders, runOrderAction } = useOrders();
  const navigate = useNavigate();
  const order = orders.find((entry) => entry.id === `#${orderId}`);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <div className="flex flex-col gap-y-6">
        <Container>
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
              Orders
            </Text>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">Order not found</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  The requested order is not available in the current mock operations queue.
                </Text>
              </div>
              <Button variant="secondary" size="small" asChild>
                <Link to="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const currentOrder = order;
  const canCapture =
    currentOrder.paymentStatus === "Authorized" && currentOrder.status !== "Canceled";
  const canFulfill =
    currentOrder.paymentStatus === "Captured" &&
    currentOrder.fulfillmentStatus !== "Fulfilled" &&
    currentOrder.fulfillmentStatus !== "Canceled" &&
    currentOrder.status !== "Canceled";
  const canCancel =
    currentOrder.status !== "Canceled" && currentOrder.status !== "Fulfilled";

  function run(action: "capture" | "fulfill" | "cancel") {
    if (
      (action === "capture" && !canCapture) ||
      (action === "fulfill" && !canFulfill) ||
      (action === "cancel" && !canCancel)
    ) {
      setError("This action is not available for the order's current payment or fulfillment state.");
      return;
    }

    const updated = runOrderAction(currentOrder.id, action);
    if (!updated) {
      setError("Unable to apply the requested action.");
      return;
    }

    setError(null);
    startTransition(() => {
      navigate(`/orders/${updated.id.slice(1)}`, { replace: true });
    });
  }

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Orders
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">Order {currentOrder.id}</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Operational detail for {currentOrder.customer}, including payment,
                fulfillment, and activity history.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="small" asChild>
                <Link to="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => run("capture")}
                disabled={!canCapture}
              >
                <CreditCard className="h-4 w-4" />
                Capture
              </Button>
              <Button
                variant="secondary"
                size="small"
                onClick={() => run("fulfill")}
                disabled={!canFulfill}
              >
                <Package className="h-4 w-4" />
                Fulfill
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={() => run("cancel")}
                disabled={!canCancel}
              >
                <XCircle className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </Container>

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-y-6">
          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">Summary</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  High-level operational state and commercial totals.
                </Text>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    Order status
                  </Text>
                  <Badge
                    color={getBadgeColor(currentOrder.status)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentOrder.status}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    Channel: {currentOrder.channel}
                  </Text>
                </div>
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    Payment
                  </Text>
                  <Badge
                    color={getBadgeColor(currentOrder.paymentStatus)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentOrder.paymentStatus}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {currentOrder.paymentMethod}
                  </Text>
                </div>
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">
                    Fulfillment
                  </Text>
                  <Badge
                    color={getBadgeColor(currentOrder.fulfillmentStatus)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentOrder.fulfillmentStatus}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">
                    {currentOrder.items} items in order
                  </Text>
                </div>
              </div>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <ShoppingCart className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Line items
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Sellable units and variant-level pricing on the order.
                </Text>
              </div>
              <div className="flex flex-col gap-y-2">
                {currentOrder.lineItems.map((item) => (
                  <div
                    key={`${item.title}-${item.variant}`}
                    className="flex items-center justify-between rounded-lg border border-ui-border-base px-4 py-3"
                  >
                    <div className="flex flex-col gap-y-0.5">
                      <Text size="small" className="text-ui-fg-base font-medium">
                        {item.title}
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-muted">
                        {item.variant}
                      </Text>
                    </div>
                    <div className="text-right">
                      <Text size="small" className="text-ui-fg-muted">
                        {item.quantity} units
                      </Text>
                      <Text size="small" className="text-ui-fg-muted">
                        {formatCurrency(item.unitPrice)}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <User className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Customer
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Primary contact and billing or shipping identity.
                </Text>
              </div>
              <dl className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Name
                  </Text>
                  <Text size="small" className="text-ui-fg-base">
                    {currentOrder.customer}
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Email
                  </Text>
                  <Text size="small" className="text-ui-fg-base">
                    {currentOrder.email}
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Channel
                  </Text>
                  <Text size="small" className="text-ui-fg-base">
                    {currentOrder.channel}
                  </Text>
                </div>
              </dl>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <MapPin className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Addresses
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Billing and shipping records for the order.
                </Text>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" className="text-ui-fg-base font-medium">
                    Shipping
                  </Text>
                  <Text size="small" className="text-ui-fg-muted mt-2">
                    {currentOrder.shippingAddress}
                  </Text>
                </div>
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" className="text-ui-fg-base font-medium">
                    Billing
                  </Text>
                  <Text size="small" className="text-ui-fg-muted mt-2">
                    {currentOrder.billingAddress}
                  </Text>
                </div>
              </div>
            </div>
          </Container>
        </div>

        <aside className="flex flex-col gap-y-6">
          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <CreditCard className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Payment
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Current payment settlement state for operator review.
                </Text>
              </div>
              <dl className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Method
                  </Text>
                  <Text size="small" className="text-ui-fg-base">
                    {currentOrder.paymentMethod}
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Status
                  </Text>
                  <Badge
                    color={getBadgeColor(currentOrder.paymentStatus)}
                    size="xsmall"
                    rounded="full"
                  >
                    {currentOrder.paymentStatus}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Total
                  </Text>
                  <Text size="small" className="text-ui-fg-base font-medium">
                    {formatCurrency(currentOrder.total)}
                  </Text>
                </div>
              </dl>
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Package className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Fulfillment
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Shipment progress and whether more actions are available.
                </Text>
              </div>
              <ChecklistItem
                label="Payment captured"
                complete={currentOrder.paymentStatus === "Captured"}
              />
              <ChecklistItem
                label="Order fulfilled"
                complete={currentOrder.fulfillmentStatus === "Fulfilled"}
              />
              <ChecklistItem
                label="Order cancellable"
                complete={canCancel}
              />
            </div>
          </Container>

          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">
                  <Clock className="-ml-1 mr-1 inline h-4 w-4 text-ui-fg-muted" />
                  Activity timeline
                </Heading>
                <Text size="small" className="text-ui-fg-subtle">
                  Chronological order events shown in a Medusa-like operational block.
                </Text>
              </div>
              <div className="flex flex-col gap-y-4">
                {currentOrder.timeline.map((event) => (
                  <div
                    key={`${event.at}-${event.title}`}
                    className="relative border-l border-ui-border-base pl-4"
                  >
                    <Text
                      size="xsmall"
                      className="text-ui-fg-muted uppercase tracking-wider"
                    >
                      {event.at}
                    </Text>
                    <Text
                      size="small"
                      className="text-ui-fg-base font-medium"
                    >
                      {event.title}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {event.detail}
                    </Text>
                  </div>
                ))}
              </div>
            </div>
          </Container>
        </aside>
      </div>
    </div>
  );
}
