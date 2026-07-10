import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Container, Heading, Input, Table, Text, StatusBadge } from "@medusajs/ui";
import { Adjustments } from "@medusajs/icons";
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

  return (
    <div className="flex flex-col gap-y-6">
      <Container className="p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <Heading level="h2">Orders</Heading>
          <Button variant="secondary" size="small">Export</Button>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <Button variant="secondary" size="small">Add filter</Button>
          <div className="flex items-center gap-x-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full sm:w-64"
            />
            <Button variant="secondary" size="small" className="p-1 px-2 h-auto text-ui-fg-muted">
              <Adjustments className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div>
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
                  <Table.HeaderCell>Date</Table.HeaderCell>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Payment</Table.HeaderCell>
                  <Table.HeaderCell>Fulfillment</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Order Total</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredOrders.map((order) => (
                  <Table.Row key={order.orderNumber}>
                    <Table.Cell>
                      <Link
                        to={`/orders/${order.orderNumber}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                      >
                        #{order.orderNumber}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">{formatAdminDate(order.createdAt)}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">{order.customerEmail || order.customerName}</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={getBadgeColor(order.status)}>
                        {formatStatusLabel(order.status)}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={getBadgeColor(order.paymentStatus)}>
                        {formatStatusLabel(order.paymentStatus)}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color={getBadgeColor(order.fulfillmentStatus)}>
                        {formatStatusLabel(order.fulfillmentStatus)}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" className="text-ui-fg-subtle">
                        {formatAdminCurrency(order.totalAmount, order.currencyCode)}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-ui-border-base">
          <Text size="small" className="text-ui-fg-subtle">
            1 — {filteredOrders.length} of {filteredOrders.length} results
          </Text>
          <div className="flex items-center gap-x-4">
            <Text size="small" className="text-ui-fg-subtle">1 of 1 pages</Text>
            <div className="flex gap-x-2">
               <Button variant="transparent" size="small" disabled className="text-ui-fg-muted font-normal">Prev</Button>
               <Button variant="transparent" size="small" disabled className="text-ui-fg-muted font-normal">Next</Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
