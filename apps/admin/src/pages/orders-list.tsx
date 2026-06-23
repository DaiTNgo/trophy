import { useDeferredValue, useMemo, useState } from "react";
import { Link } from "react-router";
import { StatusBadge } from "../components/ui/medusa/status-badge";
import { PageHeader, StatCard, DataPanel, EmptyState } from "../components/ui/medusa";
import { useOrders } from "../hooks/use-orders";
import { formatCurrency } from "../lib/utils";

export function OrdersListPage() {
  const { orders } = useOrders();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return orders;
    }

    return orders.filter((order) =>
      [order.id, order.customer, order.status, order.channel].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery]);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Order operations"
        description="Monitor order intake, fulfillment state, and channel performance from one queue."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open orders" value="18" hint="6 waiting for fulfillment" />
        <StatCard label="Gross sales" value="$1,103" hint="Past 24 hours" />
        <StatCard label="Refund risk" value="2 orders" hint="Flagged by support rules" />
      </div>
      <DataPanel
        title="All orders"
        description="Search by order id, customer, status, or channel."
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:w-72"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-4 font-semibold text-slate-800">
                    <Link to={`/orders/${order.id.slice(1)}`} className="transition hover:text-slate-950">
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{order.customer}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{order.items}</td>
                  <td className="px-4 py-4 text-slate-600">{order.channel}</td>
                  <td className="px-4 py-4 text-slate-600">{order.date}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 ? <EmptyState message="No orders matched your current search." /> : null}
        </div>
      </DataPanel>
    </section>
  );
}
