import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/checkout";
import { createStorefrontOrder, resolveStorefrontCartLines } from "../lib/api";
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";

const ORDER_SUMMARY_STORAGE_KEY = "trophy-order-confirmation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thanh Toán | Phùng Thị - Chế Tác Vinh Quang" },
    { name: "description", content: "Thanh toán đơn hàng của bạn tại Phùng Thị" },
  ];
}

export default function Checkout() {
  const { lines, isReady, clearCart } = useCart();
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<Array<{ valid: boolean; reason: string | null; product?: { priceAmount: number | null; title: string; variantTitle: string; thumbnail: string | null; }; }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isReady || lines.length === 0) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    resolveStorefrontCartLines({
      items: lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
      })),
    })
      .then((response) => {
        if (!cancelled) {
          setResolved(response.items);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Không thể tải lại giỏ hàng.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, lines]);

  const checkoutItems = useMemo(
    () =>
      lines.map((line, index) => {
        const resolvedLine = resolved[index];
        return {
          line,
          valid: resolvedLine?.valid ?? true,
          priceAmount: resolvedLine?.product?.priceAmount ?? line.display.priceAmount,
          title: resolvedLine?.product?.title ?? line.display.productTitle,
          variantTitle: resolvedLine?.product?.variantTitle ?? line.display.variantTitle,
          thumbnail: resolvedLine?.product?.thumbnail ?? line.display.thumbnail,
        };
      }),
    [lines, resolved],
  );

  const subtotal = checkoutItems.reduce((sum, item) => sum + ((item.priceAmount ?? 0) * item.line.quantity), 0);
  const hasInvalidLines = checkoutItems.some((item) => !item.valid || item.priceAmount === null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasInvalidLines || lines.length === 0 || submitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await createStorefrontOrder({
        customer: {
          name: String(formData.get("customer.name") ?? ""),
          phone: String(formData.get("customer.phone") ?? ""),
          email: String(formData.get("customer.email") ?? "") || undefined,
        },
        shipping: {
          primaryAddress: {
            line1: String(formData.get("shipping.primaryAddress.line1") ?? ""),
            city: String(formData.get("shipping.primaryAddress.city") ?? ""),
            province: String(formData.get("shipping.primaryAddress.province") ?? "") || undefined,
            country: "VN",
          },
          shipToDifferentAddress: false,
        },
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          customization: line.customizationValues ? { values: line.customizationValues } : undefined,
        })),
      });

      window.sessionStorage.setItem(
        ORDER_SUMMARY_STORAGE_KEY,
        JSON.stringify({
          ...response.order,
          customerName: String(formData.get("customer.name") ?? ""),
          customerPhone: String(formData.get("customer.phone") ?? ""),
          customerEmail: String(formData.get("customer.email") ?? ""),
          addressLine1: String(formData.get("shipping.primaryAddress.line1") ?? ""),
          addressCity: String(formData.get("shipping.primaryAddress.city") ?? ""),
          addressProvince: String(formData.get("shipping.primaryAddress.province") ?? ""),
          items: checkoutItems.map((item) => ({
            title: item.title,
            variantTitle: item.variantTitle,
            quantity: item.line.quantity,
            lineSubtotalAmount: (item.priceAmount ?? 0) * item.line.quantity,
            thumbnail: item.thumbnail,
            customizationSummary: item.line.customizationSummary,
          })),
        }),
      );
      clearCart();
      navigate(`/order-confirmation?orderNumber=${response.order.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isReady && lines.length === 0) {
    return (
      <div className="min-h-screen bg-surface text-on-background">
        <main className="mx-auto flex-grow w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
          <div className="rounded-2xl border border-outline bg-white px-8 py-16 text-center">
            <h1 className="font-headline-md text-3xl text-on-surface">Không có sản phẩm để thanh toán</h1>
            <p className="mt-3 text-on-surface-variant">Thêm sản phẩm vào giỏ trước khi tiếp tục.</p>
            <Link to="/products" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white">
              Xem sản phẩm
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="mx-auto flex-grow w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
        <div className="mb-10">
          <p className="text-sm uppercase tracking-wide text-on-surface-variant">Checkout</p>
          <h1 className="mt-2 font-headline-lg text-headline-lg uppercase tracking-wider text-on-background">Xác nhận đặt hàng</h1>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-10">
            <section className="rounded-2xl border border-outline bg-white p-8">
              <h2 className="font-headline-md text-2xl text-on-surface">Thông tin liên hệ</h2>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Họ và tên</span>
                  <input name="customer.name" required className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Số điện thoại</span>
                  <input name="customer.phone" required className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Email</span>
                  <input name="customer.email" type="email" className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Địa chỉ giao hàng</span>
                  <input name="shipping.primaryAddress.line1" required className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Tỉnh / Thành phố</span>
                  <input name="shipping.primaryAddress.city" required className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-on-surface-variant">Quận / Huyện / Ghi chú</span>
                  <input name="shipping.primaryAddress.province" className="w-full rounded-xl border border-outline bg-surface-container-low px-4 py-4" />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-outline bg-white p-8">
              <h2 className="font-headline-md text-2xl text-on-surface">Lưu ý đơn hàng</h2>
              <p className="mt-3 text-on-surface-variant">
                Sau khi gửi đơn, đội ngũ của Phùng Thị sẽ liên hệ để xác nhận chi tiết giao hàng và thanh toán thủ công.
              </p>
            </section>
          </div>

          <aside className="rounded-2xl border border-outline bg-white p-8 shadow-sm">
            <h2 className="border-b border-outline pb-4 font-headline-md text-2xl text-on-surface">Tóm tắt đơn hàng</h2>
            <div className="mt-6 space-y-5">
              {checkoutItems.map((item) => (
                <div key={item.line.id} className="flex gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-xl bg-surface-container-low">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt={item.title} className="h-full w-full object-contain" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-on-surface">{item.title}</p>
                    <p className="text-sm text-on-surface-variant">{item.variantTitle}</p>
                    <p className="text-sm text-on-surface-variant">SL: {item.line.quantity}</p>
                    {item.line.customizationSummary.length > 0 ? (
                      <p className="mt-1 text-sm text-on-surface-variant">
                        {item.line.customizationSummary.map((entry) => entry.valueSummary).join(" • ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-right font-semibold text-on-surface">
                    {formatCurrency(item.priceAmount === null ? null : item.priceAmount * item.line.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 border-t border-outline pt-6 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Tổng tiền hàng</span>
                <span className="font-semibold text-on-surface">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Vận chuyển</span>
                <span className="text-on-surface-variant">Xác nhận sau</span>
              </div>
              <div className="flex items-center justify-between border-t border-outline pt-4">
                <span className="font-semibold uppercase tracking-wide text-on-surface">Tổng cộng</span>
                <span className="font-headline-md text-2xl text-primary">{formatCurrency(subtotal)}</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || hasInvalidLines}
              className="mt-8 w-full rounded-full bg-primary px-6 py-4 text-sm font-semibold uppercase tracking-wide text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Đang gửi đơn..." : "Gửi đơn hàng"}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
