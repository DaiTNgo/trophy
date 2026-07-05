import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/order-confirmation";
import { formatCurrency } from "../lib/utils";

const ORDER_SUMMARY_STORAGE_KEY = "trophy-order-confirmation";

type StoredConfirmation = {
  orderNumber: string;
  status: string;
  totalAmount: number;
  currencyCode: string;
  itemCount: number;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  addressLine1: string;
  addressCity: string;
  addressProvince: string;
  items: Array<{
    title: string;
    variantTitle: string;
    quantity: number;
    lineSubtotalAmount: number;
    thumbnail: string | null;
    customizationSummary: Array<{ fieldId: string; label: string; valueSummary: string }>;
  }>;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cảm ơn bạn - PHÙNG THỊ" },
    { name: "description", content: "Xác nhận đơn hàng thành công tại Phùng Thị" },
  ];
}

export default function OrderConfirmation() {
  const [searchParams] = useSearchParams();
  const orderNumber = searchParams.get("orderNumber") ?? "";
  const [summary, setSummary] = useState<StoredConfirmation | null>(null);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(ORDER_SUMMARY_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as StoredConfirmation;
      if (parsed.orderNumber === orderNumber) {
        setSummary(parsed);
      }
    } catch {
      setSummary(null);
    }
  }, [orderNumber]);

  const createdAt = useMemo(() => {
    if (!summary) {
      return null;
    }

    return new Intl.DateTimeFormat("vi-VN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(summary.createdAt));
  }, [summary]);

  return (
    <div className="min-h-screen bg-background text-on-background">
      <main className="mx-auto max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-[28px] border border-outline bg-white px-8 py-12">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-container/15">
              <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                check_circle
              </span>
            </div>
            <h1 className="mt-8 font-headline-lg text-[42px] uppercase text-primary">Cảm ơn bạn!</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              Đơn hàng đã được ghi nhận. Đội ngũ Phùng Thị sẽ liên hệ để xác nhận chi tiết sản xuất, giao hàng và thanh toán thủ công.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/products" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white">
                Tiếp tục mua sắm
              </Link>
              <Link
                to={`/order-lookup${orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : ""}`}
                className="rounded-full border border-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-primary"
              >
                Tra cứu đơn hàng
              </Link>
            </div>
          </section>

          <aside className="rounded-[28px] border border-outline bg-white p-8 shadow-sm">
            <h2 className="border-b border-outline pb-4 font-headline-md text-2xl text-on-surface">Chi tiết đơn</h2>
            {summary ? (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="uppercase tracking-wide text-on-surface-variant">Mã đơn</p>
                    <p className="mt-1 font-semibold text-on-surface">{summary.orderNumber}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-on-surface-variant">Ngày tạo</p>
                    <p className="mt-1 font-semibold text-on-surface">{createdAt}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-on-surface-variant">Trạng thái</p>
                    <p className="mt-1 font-semibold capitalize text-on-surface">{summary.status}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-wide text-on-surface-variant">Tổng cộng</p>
                    <p className="mt-1 font-semibold text-primary">{formatCurrency(summary.totalAmount)}</p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-outline pt-6">
                  {summary.items.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="flex gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-xl bg-surface-container-low">
                        {item.thumbnail ? <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-on-surface">{item.title}</p>
                        <p className="text-sm text-on-surface-variant">{item.variantTitle}</p>
                        <p className="text-sm text-on-surface-variant">SL: {item.quantity}</p>
                      </div>
                      <div className="text-right font-semibold text-on-surface">
                        {formatCurrency(item.lineSubtotalAmount)}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-outline pt-6 text-sm text-on-surface-variant">
                  <p className="font-semibold text-on-surface">{summary.customerName}</p>
                  <p>{summary.customerPhone}</p>
                  {summary.customerEmail ? <p>{summary.customerEmail}</p> : null}
                  <p className="mt-3">{summary.addressLine1}</p>
                  <p>{summary.addressCity}{summary.addressProvince ? `, ${summary.addressProvince}` : ""}</p>
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
                <p>Mã đơn hàng: <span className="font-semibold text-on-surface">{orderNumber || "Chưa có"}</span></p>
                <p>Trang này đang chờ dữ liệu từ phiên đặt hàng gần nhất. Bạn vẫn có thể tra cứu lại đơn bằng số điện thoại.</p>
                <Link
                  to={`/order-lookup${orderNumber ? `?orderNumber=${encodeURIComponent(orderNumber)}` : ""}`}
                  className="inline-flex rounded-full border border-primary px-5 py-3 text-xs font-semibold uppercase tracking-wide text-primary"
                >
                  Tra cứu lại đơn hàng
                </Link>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
