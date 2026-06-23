type OrderStatus = "Pending" | "Processing" | "Fulfilled" | "Canceled";
type ProductStatus = "Published" | "Draft";

export function StatusBadge({ status }: { status: OrderStatus | ProductStatus }) {
  const className =
    status === "Fulfilled" || status === "Published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Processing"
        ? "bg-sky-50 text-sky-700"
        : status === "Pending"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}
