import { startTransition, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { ChecklistItem } from "../components/ui/medusa/checklist-item";
import { PageHeader, SectionCard, StatCard, SummaryRow } from "../components/ui/medusa";
import { InlineError } from "../components/ui/medusa/inline-error";
import { useOrders } from "../hooks/use-orders";
import { formatCurrency } from "../lib/utils";

export function OrderDetailPage() {
  const { orderId } = useParams();
  const { orders, runOrderAction } = useOrders();
  const navigate = useNavigate();
  const order = orders.find((entry) => entry.id === `#${orderId}`);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Orders"
          title="Order not found"
          description="The requested order is not available in the current mock operations queue."
          actions={
            <Link
              to="/orders"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to orders
            </Link>
          }
        />
      </section>
    );
  }

  const currentOrder = order;

  const canCapture = currentOrder.paymentStatus === "Authorized" && currentOrder.status !== "Canceled";
  const canFulfill =
    currentOrder.paymentStatus === "Captured" &&
    currentOrder.fulfillmentStatus !== "Fulfilled" &&
    currentOrder.fulfillmentStatus !== "Canceled" &&
    currentOrder.status !== "Canceled";
  const canCancel = currentOrder.status !== "Canceled" && currentOrder.status !== "Fulfilled";

  function run(action: "capture" | "fulfill" | "cancel") {
    if ((action === "capture" && !canCapture) || (action === "fulfill" && !canFulfill) || (action === "cancel" && !canCancel)) {
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
    <section className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title={`Order ${currentOrder.id}`}
        description={`Operational detail for ${currentOrder.customer}, including payment, fulfillment, and activity history.`}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to orders
            </Link>
            <button
              type="button"
              onClick={() => run("capture")}
              disabled={!canCapture}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Capture payment
            </button>
            <button
              type="button"
              onClick={() => run("fulfill")}
              disabled={!canFulfill}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark fulfilled
            </button>
            <button
              type="button"
              onClick={() => run("cancel")}
              disabled={!canCancel}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel order
            </button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="Summary" description="High-level operational state and commercial totals.">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Order status" value={currentOrder.status} hint={`Channel: ${currentOrder.channel}`} />
              <StatCard label="Payment" value={currentOrder.paymentStatus} hint={currentOrder.paymentMethod} />
              <StatCard label="Fulfillment" value={currentOrder.fulfillmentStatus} hint={`${currentOrder.items} items in order`} />
            </div>
          </SectionCard>

          <SectionCard title="Line items" description="Sellable units and variant-level pricing on the order.">
            <div className="space-y-3">
              {currentOrder.lineItems.map((item) => (
                <div key={`${item.title}-${item.variant}`} className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.variant}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{item.quantity} units</p>
                    <p>{formatCurrency(item.unitPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Customer" description="Primary contact and billing or shipping identity.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Name" value={currentOrder.customer} />
              <SummaryRow label="Email" value={currentOrder.email} />
              <SummaryRow label="Channel" value={currentOrder.channel} />
            </dl>
          </SectionCard>

          <SectionCard title="Addresses" description="Billing and shipping records for the order.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-sm font-medium text-slate-700">Shipping</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{currentOrder.shippingAddress}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-sm font-medium text-slate-700">Billing</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{currentOrder.billingAddress}</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Payment" description="Current payment settlement state for operator review.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Method" value={currentOrder.paymentMethod} />
              <SummaryRow label="Status" value={currentOrder.paymentStatus} />
              <SummaryRow label="Total" value={formatCurrency(currentOrder.total)} />
            </dl>
          </SectionCard>

          <SectionCard title="Fulfillment" description="Shipment progress and whether more actions are available.">
            <ChecklistItem label="Payment captured" complete={currentOrder.paymentStatus === "Captured"} />
            <ChecklistItem label="Order fulfilled" complete={currentOrder.fulfillmentStatus === "Fulfilled"} />
            <ChecklistItem label="Order cancellable" complete={canCancel} />
          </SectionCard>

          <SectionCard title="Activity timeline" description="Chronological order events shown in a Medusa-like operational block.">
            <div className="space-y-4">
              {currentOrder.timeline.map((event) => (
                <div key={`${event.at}-${event.title}`} className="border-l-2 border-stone-200 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{event.at}</p>
                  <p className="mt-2 font-medium text-slate-800">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{event.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  );
}
