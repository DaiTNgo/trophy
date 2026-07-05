import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { ArrowLeft, CreditCard, MapPin, Package, ShoppingCart, User } from "lucide-react";
import { fetchAdminOrderDetail, formatAdminCurrency, formatAdminDate, formatStatusLabel, type AdminOrderDetail } from "../lib/orders-client";

function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "fulfilled":
    case "paid":
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

function renderAddress(address: AdminOrderDetail["primaryAddress"]) {
  if (!address) {
    return "No address on record.";
  }

  return [address.line1, address.line2, address.city, address.province, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState<AdminOrderDetail | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      return;
    }

    let cancelled = false;
    fetchAdminOrderDetail(orderNumber)
      .then((value) => {
        if (!cancelled) {
          setOrder(value);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load order detail");
          setOrder(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (order === undefined) {
    return (
      <Container>
        <Text size="small" className="text-ui-fg-muted">Loading order…</Text>
      </Container>
    );
  }

  if (!order || error) {
    return (
      <div className="flex flex-col gap-y-6">
        <Container>
          <div className="flex flex-col gap-y-3">
            <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">Orders</Text>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">Order not found</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  {error || "The requested order is not available in the backend queue."}
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

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">Orders</Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">Order {order.orderNumber}</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Backend-backed detail for storefront checkout intake. Status transitions stay read-only in this slice.
              </Text>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="small" asChild>
                <Link to="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-y-6">
          <Container>
            <div className="flex flex-col gap-y-3">
              <div className="flex flex-col gap-y-1">
                <Heading level="h3">Summary</Heading>
                <Text size="small" className="text-ui-fg-subtle">Stored order state and totals from the backend snapshot.</Text>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">Order status</Text>
                  <Badge color={getBadgeColor(order.status)} size="xsmall" rounded="full">
                    {formatStatusLabel(order.status)}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">Created {formatAdminDate(order.createdAt)}</Text>
                </div>
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">Payment</Text>
                  <Badge color={getBadgeColor(order.paymentStatus)} size="xsmall" rounded="full">
                    {formatStatusLabel(order.paymentStatus)}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">Method: {formatStatusLabel(order.paymentMethod)}</Text>
                </div>
                <div className="flex flex-col gap-y-1">
                  <Text size="small" className="text-ui-fg-subtle">Fulfillment</Text>
                  <Badge color={getBadgeColor(order.fulfillmentStatus)} size="xsmall" rounded="full">
                    {formatStatusLabel(order.fulfillmentStatus)}
                  </Badge>
                  <Text size="xsmall" className="text-ui-fg-muted">{order.totals.itemCount} items in order</Text>
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
                  Stored product, variant, and customization summaries captured at checkout.
                </Text>
              </div>
              <div className="flex flex-col gap-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="rounded-lg border border-ui-border-base px-4 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-y-0.5">
                        <Text size="small" className="font-medium text-ui-fg-base">
                          {item.product?.title ?? "Unknown product"}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {item.variant?.title ?? "Unknown variant"}
                          {item.variant?.sku ? ` • ${item.variant.sku}` : ""}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Production: {formatStatusLabel(item.productionStatus)}
                        </Text>
                      </div>
                      <div className="text-right">
                        <Text size="small" className="text-ui-fg-muted">{item.quantity} units</Text>
                        <Text size="small" className="font-medium text-ui-fg-base">
                          {formatAdminCurrency(item.lineSubtotalAmount, order.totals.currencyCode)}
                        </Text>
                      </div>
                    </div>
                    {item.customization?.values.length ? (
                      <div className="mt-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                        {item.customization.values.map((entry) => (
                          <Text key={entry.fieldId} size="xsmall" className="text-ui-fg-muted">
                            <span className="font-medium text-ui-fg-base">{entry.label}:</span> {entry.valueSummary}
                          </Text>
                        ))}
                      </div>
                    ) : null}
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
                <Text size="small" className="text-ui-fg-subtle">Primary storefront checkout contact.</Text>
              </div>
              <dl className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Name</Text>
                  <Text size="small" className="text-ui-fg-base">{order.customer.name}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Phone</Text>
                  <Text size="small" className="text-ui-fg-base">{order.customer.phone}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Email</Text>
                  <Text size="small" className="text-ui-fg-base">{order.customer.email ?? "Not provided"}</Text>
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
                <Text size="small" className="text-ui-fg-subtle">Stored primary and optional different shipping address snapshots.</Text>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" className="font-medium text-ui-fg-base">Primary</Text>
                  <Text size="small" className="mt-2 text-ui-fg-muted">{renderAddress(order.primaryAddress)}</Text>
                </div>
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
                  <Text size="small" className="font-medium text-ui-fg-base">Shipping</Text>
                  <Text size="small" className="mt-2 text-ui-fg-muted">
                    {order.shippingAddress
                      ? `${order.shippingAddress.recipientName} • ${order.shippingAddress.recipientPhone} • ${renderAddress(order.shippingAddress.address)}`
                      : "Uses primary checkout address."}
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
                <Text size="small" className="text-ui-fg-subtle">Manual follow-up state returned by the backend order snapshot.</Text>
              </div>
              <dl className="flex flex-col gap-y-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Method</Text>
                  <Text size="small" className="text-ui-fg-base">{formatStatusLabel(order.paymentMethod)}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Status</Text>
                  <Badge color={getBadgeColor(order.paymentStatus)} size="xsmall" rounded="full">
                    {formatStatusLabel(order.paymentStatus)}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">Total</Text>
                  <Text size="small" className="font-medium text-ui-fg-base">
                    {formatAdminCurrency(order.totals.totalAmount, order.totals.currencyCode)}
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
                  This change intentionally stops at read-only visibility. Capture, fulfill, and cancel flows stay out of scope.
                </Text>
              </div>
              <Badge color={getBadgeColor(order.fulfillmentStatus)} size="xsmall" rounded="full">
                {formatStatusLabel(order.fulfillmentStatus)}
              </Badge>
            </div>
          </Container>
        </aside>
      </div>
    </div>
  );
}
