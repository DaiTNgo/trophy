import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Button, Container, DropdownMenu, Heading, IconButton, Input, Table, Text, StatusBadge, toast } from "@medusajs/ui";
import { Adjustments, EllipseMiniSolid } from "@medusajs/icons";
import { ArrowUpDown, Check, X } from "lucide-react";
import {
  fetchAdminOrders,
  formatAdminCurrency,
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderListItem,
} from "../lib/orders-client";

const PAGE_SIZE = 20;
const DATE_FILTERS = ["Today", "Last 7 days", "Last 30 days", "Last 90 days"] as const;

type OrderFilterKey = "status" | "payment" | "fulfillment" | "created";
type SortField = "createdAt" | "orderNumber" | "customer" | "totalAmount";
type SortOrder = "asc" | "desc";

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

function normalizeStatus(value: string) {
  return formatStatusLabel(value);
}

function isWithinDateFilter(value: string, filter: string | null) {
  if (!filter) return true;

  const orderDate = new Date(value);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (filter === "Today") {
    return orderDate >= start;
  }

  const days = filter === "Last 7 days" ? 7 : filter === "Last 30 days" ? 30 : 90;
  const threshold = new Date(now);
  threshold.setDate(now.getDate() - days);
  return orderDate >= threshold;
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function downloadOrdersCsv(orders: AdminOrderListItem[]) {
  const header = [
    "Order",
    "Date",
    "Customer",
    "Status",
    "Payment",
    "Fulfillment",
    "Order Total",
    "Currency",
  ];
  const rows = orders.map((order) => [
    `#${order.orderNumber}`,
    formatAdminDate(order.createdAt),
    order.customerEmail || order.customerName,
    normalizeStatus(order.status),
    normalizeStatus(order.paymentStatus),
    normalizeStatus(order.fulfillmentStatus),
    order.totalAmount,
    order.currencyCode,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function OrdersListPage() {
  const [orders, setOrders] = useState<AdminOrderListItem[]>([]);
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<OrderFilterKey[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string[]>([]);
  const [createdFilter, setCreatedFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [pageIndex, setPageIndex] = useState(0);
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

  const statusOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status))),
    [orders],
  );
  const paymentOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.paymentStatus))),
    [orders],
  );
  const fulfillmentOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.fulfillmentStatus))),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    let result = orders.filter((order) => {
      if (statusFilter.length > 0 && !statusFilter.includes(order.status)) {
        return false;
      }
      if (paymentFilter.length > 0 && !paymentFilter.includes(order.paymentStatus)) {
        return false;
      }
      if (fulfillmentFilter.length > 0 && !fulfillmentFilter.includes(order.fulfillmentStatus)) {
        return false;
      }
      if (!isWithinDateFilter(order.createdAt, createdFilter)) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }

      return [
        order.orderNumber,
        order.customerName,
        order.customerEmail ?? "",
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
      ].some((value) => value.toLowerCase().includes(normalizedQuery));
    });

    result = [...result].sort((left, right) => {
      let compare = 0;
      if (sortField === "createdAt") {
        compare = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
      } else if (sortField === "totalAmount") {
        compare = left.totalAmount - right.totalAmount;
      } else if (sortField === "customer") {
        compare = (left.customerEmail || left.customerName).localeCompare(right.customerEmail || right.customerName);
      } else {
        compare = left.orderNumber.localeCompare(right.orderNumber, undefined, { numeric: true });
      }
      return sortOrder === "asc" ? compare : -compare;
    });

    return result;
  }, [createdFilter, deferredQuery, fulfillmentFilter, orders, paymentFilter, sortField, sortOrder, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const pageStart = pageIndex * PAGE_SIZE;
  const paginatedOrders = filteredOrders.slice(pageStart, pageStart + PAGE_SIZE);
  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex + 1 < pageCount;

  useEffect(() => {
    setPageIndex(0);
  }, [deferredQuery, statusFilter, paymentFilter, fulfillmentFilter, createdFilter, sortField, sortOrder]);

  const addFilter = (filter: OrderFilterKey) => {
    setActiveFilters((current) => (current.includes(filter) ? current : [...current, filter]));
  };

  const removeFilter = (filter: OrderFilterKey) => {
    setActiveFilters((current) => current.filter((item) => item !== filter));
    if (filter === "status") setStatusFilter([]);
    if (filter === "payment") setPaymentFilter([]);
    if (filter === "fulfillment") setFulfillmentFilter([]);
    if (filter === "created") setCreatedFilter(null);
  };

  const clearFilters = () => {
    setActiveFilters([]);
    setStatusFilter([]);
    setPaymentFilter([]);
    setFulfillmentFilter([]);
    setCreatedFilter(null);
  };

  const handleExport = () => {
    if (filteredOrders.length === 0) {
      toast.warning("No orders to export");
      return;
    }
    downloadOrdersCsv(filteredOrders);
    toast.success("Orders export started");
  };

  return (
    <div className="flex flex-col gap-y-6">
      <Container className="p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <Heading level="h2">Orders</Heading>
          <Button variant="secondary" size="small" onClick={handleExport}>
            Export
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 px-6 py-4 border-b border-ui-border-base lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.includes("status") ? (
              <div className="flex items-center overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base text-sm shadow-sm">
                <div className="border-r border-ui-border-base bg-ui-bg-subtle px-2 py-1 font-medium">Status</div>
                <div className="border-r border-ui-border-base px-2 py-1 text-ui-fg-muted">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="flex items-center px-2 py-1 outline-none hover:bg-ui-bg-subtle-hover">
                    {statusFilter.length > 0 ? statusFilter.map(normalizeStatus).join(", ") : "Select..."}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {statusOptions.map((status) => (
                      <DropdownMenu.Item
                        key={status}
                        onClick={(event) => {
                          event.preventDefault();
                          setStatusFilter((current) =>
                            current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Check className={statusFilter.includes(status) ? "h-4 w-4" : "invisible h-4 w-4"} />
                          {normalizeStatus(status)}
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button className="border-l border-ui-border-base px-2 py-1 text-ui-fg-muted hover:text-ui-fg-base" onClick={() => removeFilter("status")} type="button">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {activeFilters.includes("payment") ? (
              <div className="flex items-center overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base text-sm shadow-sm">
                <div className="border-r border-ui-border-base bg-ui-bg-subtle px-2 py-1 font-medium">Payment</div>
                <div className="border-r border-ui-border-base px-2 py-1 text-ui-fg-muted">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="flex items-center px-2 py-1 outline-none hover:bg-ui-bg-subtle-hover">
                    {paymentFilter.length > 0 ? paymentFilter.map(normalizeStatus).join(", ") : "Select..."}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {paymentOptions.map((status) => (
                      <DropdownMenu.Item
                        key={status}
                        onClick={(event) => {
                          event.preventDefault();
                          setPaymentFilter((current) =>
                            current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Check className={paymentFilter.includes(status) ? "h-4 w-4" : "invisible h-4 w-4"} />
                          {normalizeStatus(status)}
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button className="border-l border-ui-border-base px-2 py-1 text-ui-fg-muted hover:text-ui-fg-base" onClick={() => removeFilter("payment")} type="button">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {activeFilters.includes("fulfillment") ? (
              <div className="flex items-center overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base text-sm shadow-sm">
                <div className="border-r border-ui-border-base bg-ui-bg-subtle px-2 py-1 font-medium">Fulfillment</div>
                <div className="border-r border-ui-border-base px-2 py-1 text-ui-fg-muted">is</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="flex items-center px-2 py-1 outline-none hover:bg-ui-bg-subtle-hover">
                    {fulfillmentFilter.length > 0 ? fulfillmentFilter.map(normalizeStatus).join(", ") : "Select..."}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {fulfillmentOptions.map((status) => (
                      <DropdownMenu.Item
                        key={status}
                        onClick={(event) => {
                          event.preventDefault();
                          setFulfillmentFilter((current) =>
                            current.includes(status) ? current.filter((item) => item !== status) : [...current, status],
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Check className={fulfillmentFilter.includes(status) ? "h-4 w-4" : "invisible h-4 w-4"} />
                          {normalizeStatus(status)}
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button className="border-l border-ui-border-base px-2 py-1 text-ui-fg-muted hover:text-ui-fg-base" onClick={() => removeFilter("fulfillment")} type="button">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            {activeFilters.includes("created") ? (
              <div className="flex items-center overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base text-sm shadow-sm">
                <div className="border-r border-ui-border-base bg-ui-bg-subtle px-2 py-1 font-medium">Created</div>
                <DropdownMenu>
                  <DropdownMenu.Trigger className="flex items-center px-2 py-1 outline-none hover:bg-ui-bg-subtle-hover">
                    {createdFilter || "Select..."}
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="start">
                    {DATE_FILTERS.map((label) => (
                      <DropdownMenu.Item key={label} onClick={() => setCreatedFilter(label)}>
                        <div className="flex items-center gap-2">
                          <EllipseMiniSolid className={createdFilter === label ? "visible" : "invisible"} />
                          {label}
                        </div>
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu>
                <button className="border-l border-ui-border-base px-2 py-1 text-ui-fg-muted hover:text-ui-fg-base" onClick={() => removeFilter("created")} type="button">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}

            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <Button variant="secondary" size="small" className={activeFilters.length > 0 ? "border-dashed" : ""}>
                  Add filter
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="start">
                {!activeFilters.includes("status") ? <DropdownMenu.Item onClick={() => addFilter("status")}>Status</DropdownMenu.Item> : null}
                {!activeFilters.includes("created") ? <DropdownMenu.Item onClick={() => addFilter("created")}>Created</DropdownMenu.Item> : null}
                {!activeFilters.includes("payment") ? <DropdownMenu.Item onClick={() => addFilter("payment")}>Payment</DropdownMenu.Item> : null}
                {!activeFilters.includes("fulfillment") ? <DropdownMenu.Item onClick={() => addFilter("fulfillment")}>Fulfillment</DropdownMenu.Item> : null}
              </DropdownMenu.Content>
            </DropdownMenu>

            {activeFilters.length > 0 ? (
              <Button variant="transparent" size="small" className="text-ui-fg-muted hover:text-ui-fg-base" onClick={clearFilters}>
                Clear all
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-x-2">
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full sm:w-64"
            />
            <DropdownMenu>
              <DropdownMenu.Trigger asChild>
                <IconButton variant="transparent" size="small">
                  <ArrowUpDown className="h-4 w-4 text-ui-fg-muted" />
                </IconButton>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content align="end">
                <DropdownMenu.Item onClick={() => setSortField("createdAt")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortField === "createdAt" ? "visible" : "invisible"} />
                    Date
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortField("orderNumber")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortField === "orderNumber" ? "visible" : "invisible"} />
                    Order
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortField("customer")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortField === "customer" ? "visible" : "invisible"} />
                    Customer
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortField("totalAmount")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortField === "totalAmount" ? "visible" : "invisible"} />
                    Order Total
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => setSortOrder("asc")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortOrder === "asc" ? "visible" : "invisible"} />
                    Ascending
                  </div>
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => setSortOrder("desc")}>
                  <div className="flex items-center gap-2">
                    <EllipseMiniSolid className={sortOrder === "desc" ? "visible" : "invisible"} />
                    Descending
                  </div>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu>
            <IconButton variant="transparent" size="small" disabled>
              <Adjustments className="h-4 w-4 text-ui-fg-muted" />
            </IconButton>
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
                {paginatedOrders.map((order) => (
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
                      <Link to={`/orders/${order.orderNumber}`} className="text-ui-fg-subtle hover:text-ui-fg-base">
                        {formatAdminDate(order.createdAt)}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Link to={`/orders/${order.orderNumber}`} className="text-ui-fg-subtle hover:text-ui-fg-base">
                        {order.customerEmail || order.customerName}
                      </Link>
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

        {!loading && !error ? (
          <Table.Pagination
            count={filteredOrders.length}
            pageSize={PAGE_SIZE}
            pageIndex={pageIndex}
            pageCount={pageCount}
            canPreviousPage={canPreviousPage}
            canNextPage={canNextPage}
            previousPage={() => setPageIndex((current) => Math.max(0, current - 1))}
            nextPage={() => setPageIndex((current) => Math.min(pageCount - 1, current + 1))}
          />
        ) : null}
      </Container>
    </div>
  );
}
