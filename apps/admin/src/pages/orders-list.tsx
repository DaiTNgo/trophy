import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Badge, Container, Heading, Input, Table, Text } from "@medusajs/ui";
import {
  fetchAdminOrders,
  formatAdminCurrency,
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderListItem,
} from "../lib/orders-client";

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

export function OrdersListPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let cancelled = false;

    fetchAdminOrders()
      .then((items) => {
        if (!cancelled) {
          setOrders(items);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load orders");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return orders;
    return orders.filter((order) =>
      [
        order.orderNumber,
        order.customerName,
        order.customerEmail ?? "",
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
      ].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery, orders]);

  const openOrders = orders.filter((order) => order.status !== "cancelled" && order.fulfillmentStatus !== "fulfilled");
  const grossSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);
  const reviewQueue = orders.filter((order) => order.status === "pending");

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Orders
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Order operations</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Backend-backed storefront orders are visible here for operator follow-up.
            </Text>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 md:grid-cols-3">
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">Open orders</Text>
          <Heading level="h1" className="text-ui-fg-base">{openOrders.length}</Heading>
          <Text size="xsmall" className="text-ui-fg-muted">{reviewQueue.length} waiting for manual review</Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">Gross sales</Text>
          <Heading level="h1" className="text-ui-fg-base">{formatAdminCurrency(grossSales, "VND")}</Heading>
          <Text size="xsmall" className="text-ui-fg-muted">Captured from stored order totals</Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">Pending confirmation</Text>
          <Heading level="h1" className="text-ui-fg-base">{reviewQueue.length}</Heading>
          <Text size="xsmall" className="text-ui-fg-muted">Orders still waiting for operator follow-up</Text>
        </Container>
      </div>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">All orders</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Search by order number, customer, or backend status fields.
            </Text>
          </div>
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search orders"
            className="w-full sm:w-72"
          />
        </div>
        <div className="mt-3">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">Loading orders…</Text>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-danger">{error}</Text>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">No orders matched your current search.</Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Items</Table.HeaderCell>
                  <Table.HeaderCell>Created</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredOrders.map((order) => (
                  <Table.Row key={order.orderNumber}>
                    <Table.Cell>
                      <Link
                        to={`/orders/${order.orderNumber}`}
                        className="font-medium text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                      >
                        {order.orderNumber}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-y-0.5">
                        <Text size="small" className="text-ui-fg-base">{order.customerName}</Text>
                        {order.customerEmail ? (
                          <Text size="xsmall" className="text-ui-fg-muted">{order.customerEmail}</Text>
                        ) : null}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap gap-2">
                        <Badge color={getBadgeColor(order.status)} size="xsmall" rounded="full">
                          {formatStatusLabel(order.status)}
                        </Badge>
                        <Badge color={getBadgeColor(order.fulfillmentStatus)} size="xsmall" rounded="full">
                          {formatStatusLabel(order.fulfillmentStatus)}
                        </Badge>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">{order.itemCount}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">{formatAdminDate(order.createdAt)}</Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" className="font-medium text-ui-fg-base">
                        {formatAdminCurrency(order.totalAmount, order.currencyCode)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>
    </div>
  );
}
