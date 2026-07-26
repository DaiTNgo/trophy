import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ProductCustomizationPreview } from "@trophy/customization-react";
import type { DynamicFontFamily } from "@trophy/customization";
import type { Route } from "./+types/order-lookup";
import { lookupStorefrontOrder } from "../lib/api";
import {
  getOrderItemPreviewCustomizationValues,
  selectOrderItemPreview,
} from "../lib/order-item-preview";
import { getGenericProductPath } from "../lib/storefront-paths";
import { formatCurrency } from "../lib/utils";
import { backendFontUrl, backendStaticFontUrl } from "../lib/api";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Container from "@/components/container";

export function meta({ }: Route.MetaArgs) {
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
  const [selectedItem, setSelectedItem] = useState<
    Awaited<ReturnType<typeof lookupStorefrontOrder>>["order"]["items"][number] | null
  >(null);
  const [isCustomizationFullscreen, setIsCustomizationFullscreen] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await lookupStorefrontOrder({ orderNumber, phone });
      setResult(response);
      setSelectedItem(null);
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Không thể tra cứu đơn hàng.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface text-on-background">
      <Container className="py-8 md:py-10">
        <main className="grid gap-10 lg:grid-cols-[420px_minmax(0,1fr)]">
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
                            to={
                              item.productHandle
                                ? getGenericProductPath(item.productHandle)
                                : "#"
                            }
                            className="font-semibold text-on-surface hover:text-primary"
                          >
                            {item.productTitle}
                          </Link>
                          <p className="text-sm text-on-surface-variant">{item.variantTitle}</p>
                          <p className="text-sm text-on-surface-variant">SL: {item.quantity}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-3 text-right">
                          <p className="font-semibold text-on-surface">{formatCurrency(item.lineSubtotalAmount)}</p>
                          <button
                            type="button"
                            onClick={() => setSelectedItem(selectOrderItemPreview(result.order.items, index))}
                            className="rounded-full border border-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          >
                            Preview
                          </button>
                        </div>
                      </div>
                      {getOrderItemPreviewCustomizationValues(item.customizationValues).length > 0 ? (
                        <div className="mt-4 space-y-1 text-sm text-on-surface-variant">
                          {getOrderItemPreviewCustomizationValues(item.customizationValues).map((entry) => (
                            <p key={entry.fieldId}>
                              <span className="font-medium text-on-surface">{entry.label}:</span> {entry.valueSummary}
                            </p>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <Dialog
                  modal={false}
                  open={selectedItem !== null}
                  onOpenChange={(open) => {
                    if (!open && !isCustomizationFullscreen) setSelectedItem(null);
                  }}
                >
                  <DialogContent
                    showOverlay={!isCustomizationFullscreen}
                    aria-hidden={isCustomizationFullscreen || undefined}
                    className={`max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto ${
                      isCustomizationFullscreen ? "pointer-events-none opacity-0" : ""
                    }`}
                    onPointerDownOutside={(event) => {
                      if (isCustomizationFullscreen) event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                      if (isCustomizationFullscreen) event.preventDefault();
                    }}
                  >
                    {selectedItem ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>{selectedItem.productTitle}</DialogTitle>
                          <DialogDescription>Thông tin sản phẩm trong đơn hàng</DialogDescription>
                        </DialogHeader>

                        {selectedItem.previewImageUrl && !selectedItem.customizationPreview ? (
                          <div className="overflow-hidden rounded-xl border border-outline bg-surface-container-low">
                            <img
                              src={selectedItem.previewImageUrl}
                              alt={selectedItem.productTitle}
                              className="mx-auto max-h-72 w-full object-contain"
                            />
                          </div>
                        ) : null}

                        {selectedItem.customizationPreview ? (
                          <ProductCustomizationPreview
                            template={selectedItem.customizationPreview.template}
                            values={selectedItem.customizationPreview.values}
                            dynamicFonts={[] as DynamicFontFamily[]}
                            watermark
                            readOnly
                            className="h-[min(52vh,420px)] min-h-[280px] rounded-xl border border-outline"
                            resolveFontUrl={backendFontUrl}
                            resolveStaticFontUrl={backendStaticFontUrl}
                            selectedVariantId={null}
                            onFullscreenChange={setIsCustomizationFullscreen}
                          />
                        ) : null}

                        <div className="space-y-4 text-sm">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <p className="text-on-surface-variant">Phiên bản</p>
                              <p className="font-medium text-on-surface">{selectedItem.variantTitle}</p>
                            </div>
                            {selectedItem.sku ? (
                              <div>
                                <p className="text-on-surface-variant">SKU</p>
                                <p className="font-medium text-on-surface">{selectedItem.sku}</p>
                              </div>
                            ) : null}
                            <div>
                              <p className="text-on-surface-variant">Số lượng</p>
                              <p className="font-medium text-on-surface">{selectedItem.quantity}</p>
                            </div>
                            <div>
                              <p className="text-on-surface-variant">Thành tiền</p>
                              <p className="font-medium text-primary">{formatCurrency(selectedItem.lineSubtotalAmount)}</p>
                            </div>
                          </div>

                          {getOrderItemPreviewCustomizationValues(selectedItem.customizationValues).length > 0 ? (
                            <div className="border-t border-outline pt-4">
                              <p className="mb-2 font-medium text-on-surface">Thông tin tùy chỉnh</p>
                              <div className="space-y-2 text-on-surface-variant">
                                {getOrderItemPreviewCustomizationValues(selectedItem.customizationValues).map((entry) => (
                                  <p key={entry.fieldId}>
                                    <span className="font-medium text-on-surface">{entry.label}:</span> {entry.valueSummary}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <DialogFooter>
                          <DialogClose asChild>
                            <button
                              type="button"
                              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                            >
                              Đóng
                            </button>
                          </DialogClose>
                        </DialogFooter>
                      </>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center text-on-surface-variant">
                Kết quả tra cứu sẽ hiển thị tại đây sau khi bạn nhập đúng mã đơn và số điện thoại.
              </div>
            )}
          </section>
        </main>
      </Container>
    </div>
  );
}
