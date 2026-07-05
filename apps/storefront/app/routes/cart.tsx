import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/cart";
import { resolveStorefrontCartLines, type StorefrontResolvedCartLine } from "../lib/api";
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Giỏ Hàng | Phùng Thị - Chế Tác Vinh Quang" },
    { name: "description", content: "Giỏ hàng của bạn tại Phùng Thị" },
  ];
}

function reasonLabel(reason: StorefrontResolvedCartLine["reason"]) {
  switch (reason) {
    case "product_unavailable":
      return "Sản phẩm không còn khả dụng.";
    case "variant_missing":
      return "Biến thể không còn tồn tại.";
    case "variant_mismatch":
      return "Biến thể không còn thuộc sản phẩm này.";
    case "contact_price":
      return "Biến thể này hiện ở trạng thái Liên hệ báo giá.";
    default:
      return "";
  }
}

export default function Cart() {
  const { lines, isReady, updateQuantity, removeLine, itemCount } = useCart();
  const [resolved, setResolved] = useState<StorefrontResolvedCartLine[]>([]);
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
          setError(err instanceof Error ? err.message : "Không thể tải lại thông tin giỏ hàng.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, lines]);

  const rows = useMemo(
    () =>
      lines.map((line, index) => {
        const resolvedLine = resolved[index];
        const display = resolvedLine?.product
          ? {
              title: resolvedLine.product.title,
              handle: resolvedLine.product.handle,
              variantTitle: resolvedLine.product.variantTitle,
              sku: resolvedLine.product.sku,
              thumbnail: resolvedLine.product.thumbnail,
              priceAmount: resolvedLine.product.priceAmount,
            }
          : {
              title: line.display.productTitle,
              handle: line.display.productHandle,
              variantTitle: line.display.variantTitle,
              sku: line.display.sku,
              thumbnail: line.display.thumbnail,
              priceAmount: line.display.priceAmount,
            };
        const valid = resolvedLine ? resolvedLine.valid : true;
        const unitPrice = display.priceAmount;

        return {
          line,
          display,
          valid,
          reason: resolvedLine?.reason ?? null,
          lineTotal: unitPrice === null ? null : unitPrice * line.quantity,
        };
      }),
    [lines, resolved],
  );

  const subtotal = rows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0);
  const hasInvalidLines = rows.some((row) => !row.valid);

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <main className="mx-auto flex-grow w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
        <nav className="mb-8 flex items-center space-x-2 font-label-md text-label-md text-on-surface-variant">
          <Link to="/" className="transition-colors hover:text-primary">Trang chủ</Link>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="font-bold text-primary">Giỏ hàng</span>
        </nav>

        <div className="mb-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg uppercase tracking-wider text-on-background">
              Giỏ hàng của bạn
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant">
              {itemCount} sản phẩm đang chờ xác nhận trước khi đặt hàng.
            </p>
          </div>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Tiếp tục mua sắm
          </Link>
        </div>

        {error ? (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-outline bg-white px-8 py-16 text-center">
            <h2 className="font-headline-md text-2xl text-on-surface">Giỏ hàng đang trống</h2>
            <p className="mt-3 text-on-surface-variant">
              Chọn một sản phẩm, cấu hình biến thể và thêm vào giỏ để bắt đầu đặt hàng.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white"
            >
              Xem sản phẩm
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="overflow-hidden rounded-2xl border border-outline bg-white">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline bg-surface-container-lowest text-sm uppercase tracking-wide text-on-surface-variant">
                    <th className="px-6 py-4">Sản phẩm</th>
                    <th className="px-6 py-4 text-center">Số lượng</th>
                    <th className="px-6 py-4 text-right">Thành tiền</th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ line, display, valid, reason, lineTotal }) => (
                    <tr key={line.id} className="border-b border-outline last:border-b-0">
                      <td className="px-6 py-6 align-top">
                        <div className="flex gap-5">
                          <div className="h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
                            {display.thumbnail ? (
                              <img src={display.thumbnail} alt={display.title} className="h-full w-full object-contain" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-on-surface-variant">
                                <span className="material-symbols-outlined">image</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link to={`/product/${display.handle ?? line.display.productHandle}`} className="font-semibold text-on-surface hover:text-primary">
                              {display.title ?? line.display.productTitle}
                            </Link>
                            <p className="mt-1 text-sm uppercase tracking-wide text-on-surface-variant">
                              {display.variantTitle ?? line.display.variantTitle}
                              {display.sku ? ` • ${display.sku}` : ""}
                            </p>
                            {line.customizationSummary.length > 0 ? (
                              <div className="mt-3 rounded-lg border border-outline bg-surface-container-lowest px-3 py-3 text-sm text-on-surface-variant">
                                {line.customizationSummary.map((entry) => (
                                  <p key={entry.fieldId}>
                                    <span className="font-medium text-on-surface">{entry.label}:</span> {entry.valueSummary}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                            {!valid ? (
                              <p className="mt-3 text-sm text-destructive">{reasonLabel(reason)}</p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 align-top">
                        <div className="flex justify-center">
                          <div className="inline-flex items-center overflow-hidden rounded-lg border border-outline">
                            <button
                              type="button"
                              className="px-3 py-2 hover:bg-surface-container"
                              onClick={() => updateQuantity(line.id, line.quantity - 1)}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={line.quantity}
                              onChange={(event) => {
                                const next = Number(event.target.value);
                                updateQuantity(line.id, Number.isFinite(next) && next > 0 ? Math.min(99, next) : 1);
                              }}
                              className="w-14 border-x border-outline px-2 py-2 text-center"
                            />
                            <button
                              type="button"
                              className="px-3 py-2 hover:bg-surface-container"
                              onClick={() => updateQuantity(line.id, line.quantity + 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right align-top font-semibold text-on-surface">
                        {formatCurrency(lineTotal)}
                      </td>
                      <td className="px-6 py-6 text-right align-top">
                        <button
                          type="button"
                          className="text-on-surface-variant transition hover:text-destructive"
                          onClick={() => removeLine(line.id)}
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <aside className="rounded-2xl border border-outline bg-white p-8 shadow-sm">
              <h2 className="border-b border-outline pb-4 font-headline-md text-2xl text-on-surface">Tóm tắt</h2>
              <div className="mt-6 space-y-4 text-sm text-on-surface-variant">
                <div className="flex items-center justify-between">
                  <span>Tổng tiền hàng</span>
                  <span className="font-semibold text-on-surface">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vận chuyển</span>
                  <span>Tính sau khi xác nhận</span>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-y border-outline py-5">
                <span className="font-semibold uppercase tracking-wide text-on-surface">Tổng cộng</span>
                <span className="font-headline-md text-2xl text-primary">{formatCurrency(subtotal)}</span>
              </div>
              {hasInvalidLines ? (
                <p className="mt-4 text-sm text-destructive">
                  Hãy sửa hoặc xóa các dòng không còn hợp lệ trước khi tiếp tục thanh toán.
                </p>
              ) : null}
              <Link
                to={hasInvalidLines ? "#" : "/checkout"}
                className={`mt-8 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-sm font-semibold uppercase tracking-wide ${
                  hasInvalidLines
                    ? "cursor-not-allowed bg-surface-variant text-on-surface-variant"
                    : "bg-primary text-white"
                }`}
                onClick={(event) => {
                  if (hasInvalidLines) {
                    event.preventDefault();
                  }
                }}
              >
                Tiến hành đặt hàng
                <span className="material-symbols-outlined text-[18px]">trending_flat</span>
              </Link>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
