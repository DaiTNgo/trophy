import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import {
  Badge,
  Container,
  Heading,
  Input,
  Table,
  Text,
} from "@medusajs/ui";

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

export function OrdersListPage() {
  const { orders } = useOrders();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) return orders;
    return orders.filter((order) =>
      [order.id, order.customer, order.status, order.channel].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [deferredQuery]);

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text
            size="small"
            className="text-ui-fg-muted uppercase tracking-wider"
          >
            Orders
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">Order operations</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              Monitor order intake, fulfillment state, and channel performance
              from one queue.
            </Text>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 md:grid-cols-3">
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Open orders
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            18
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            6 waiting for fulfillment
          </Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Gross sales
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            $1,103
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            Past 24 hours
          </Text>
        </Container>
        <Container className="flex flex-col gap-y-1">
          <Text size="small" className="text-ui-fg-subtle">
            Refund risk
          </Text>
          <Heading level="h1" className="text-ui-fg-base">
            2 orders
          </Heading>
          <Text size="xsmall" className="text-ui-fg-muted">
            Flagged by support rules
          </Text>
        </Container>
      </div>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">All orders</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Search by order id, customer, status, or channel.
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
          {filteredOrders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                No orders matched your current search.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Order</Table.HeaderCell>
                  <Table.HeaderCell>Customer</Table.HeaderCell>
                  <Table.HeaderCell>Status</Table.HeaderCell>
                  <Table.HeaderCell>Items</Table.HeaderCell>
                  <Table.HeaderCell>Channel</Table.HeaderCell>
                  <Table.HeaderCell>Date</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">
                    Total
                  </Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {filteredOrders.map((order) => (
                  <Table.Row key={order.id}>
                    <Table.Cell>
                      <Link
                        to={`/orders/${order.id.slice(1)}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                      >
                        {order.id}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {order.customer}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        color={getBadgeColor(order.status)}
                        size="xsmall"
                        rounded="full"
                      >
                        {order.status}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {order.items}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {order.channel}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {order.date}
                      </Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" className="text-ui-fg-base font-medium">
                        {formatCurrency(order.total)}
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
