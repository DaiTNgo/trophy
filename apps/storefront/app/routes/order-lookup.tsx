import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/order-lookup";
import { lookupStorefrontOrder } from "../lib/api";
import { formatCurrency } from "../lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Tra Cứu Đơn Hàng | Phùng Thị" },
    { name: "description", content: "Tra cứu đơn hàng bằng mã đơn và số điện thoại." },
  ];
}

export default function OrderLookupRoute() {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") ?? "");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<ReturnType<typeof lookupStorefrontOrder>> | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await lookupStorefrontOrder({ orderNumber, phone });
      setResult(response);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Không thể tra cứu đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="mx-auto max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
        <div className="grid gap-10 lg:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[28px] border border-outline bg-white p-8">
            <p className="text-sm uppercase tracking-wide text-on-surface-variant">Order lookup</p>
            <h1 className="mt-2 font-headline-lg text-[40px] uppercase text-on-surface">Tra cứu đơn hàng</h1>
            <p className="mt-4 text-on-surface-variant">
              Nhập mã đơn và số điện thoại đã dùng khi đặt hàng để xem lại tình trạng đơn.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-on-surface-variant">Mã đơn hàng</span>
                <input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  required
                  className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-on-surface-variant">Số điện thoại</span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Đang tra cứu..." : "Tra cứu đơn hàng"}
              </button>
            </form>

            {error ? (
              <div className="mt-5 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-outline bg-white p-8 shadow-sm">
            {result ? (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 border-b border-outline pb-6">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Mã đơn hàng</p>
                    <h2 className="mt-1 font-headline-md text-2xl text-on-surface">{result.order.orderNumber}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Tổng cộng</p>
                    <p className="mt-1 font-headline-md text-2xl text-primary">{formatCurrency(result.order.totalAmount)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Trạng thái đơn</p>
                    <p className="mt-1 font-semibold capitalize text-on-surface">{result.order.status}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Thanh toán</p>
                    <p className="mt-1 font-semibold capitalize text-on-surface">{result.order.paymentStatus}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Khách hàng</p>
                    <p className="mt-1 font-semibold text-on-surface">{result.order.customer.name}</p>
                    <p className="text-sm text-on-surface-variant">{result.order.customer.phoneMasked}</p>
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-wide text-on-surface-variant">Địa chỉ</p>
                    <p className="mt-1 text-on-surface">
                      {result.order.primaryAddress?.line1}
                      {result.order.primaryAddress?.city ? `, ${result.order.primaryAddress.city}` : ""}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-outline pt-6">
                  {result.order.items.map((item, index) => (
                    <div key={`${item.productTitle}-${index}`} className="rounded-2xl border border-outline p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Link
                            to={item.productHandle ? `/product/${item.productHandle}` : "#"}
                            className="font-semibold text-on-surface hover:text-primary"
                          >
                            {item.productTitle}
                          </Link>
                          <p className="text-sm text-on-surface-variant">{item.variantTitle}</p>
                          <p className="text-sm text-on-surface-variant">SL: {item.quantity}</p>
                        </div>
                        <div className="text-right font-semibold text-on-surface">
                          {formatCurrency(item.lineSubtotalAmount)}
                        </div>
                      </div>
                      {item.customizationValues.length > 0 ? (
                        <div className="mt-4 space-y-1 text-sm text-on-surface-variant">
                          {item.customizationValues.map((entry) => (
                            <p key={entry.fieldId}>
                              <span className="font-medium text-on-surface">{entry.label}:</span> {entry.valueSummary}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-on-surface-variant">
                Kết quả tra cứu sẽ hiển thị tại đây sau khi bạn nhập đúng mã đơn và số điện thoại.
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
