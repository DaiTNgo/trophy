import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { getLocale } from "../i18n.server";
import { ProductCustomizationPreview } from "@trophy/customization-react";
import type { DynamicFontFamily } from "@trophy/customization";
import type { Route } from "./+types/order-lookup";
import {
  backendFontUrl,
  backendStaticFontUrl,
  lookupStorefrontOrder,
} from "../lib/api";
import {
  getOrderItemPreviewCustomizationValues,
  selectOrderItemPreview,
} from "../lib/order-item-preview";
import { getGenericProductPath } from "../lib/storefront-paths";
import { formatCurrency } from "../lib/utils";

import {
  ClipboardCheck,
  LoaderCircle,
  PackageSearch,
  Search,
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function loader({ context }: Route.LoaderArgs) {
  const locale = getLocale(context);
  return { locale };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const isEn = loaderData?.locale === "en";
  return [
    {
      title: isEn ? "Order Lookup | Phùng Thị" : "Tra Cứu Đơn Hàng | Phùng Thị",
    },
    {
      name: "description",
      content: isEn
        ? "Look up your order using order number and phone number."
        : "Tra cứu đơn hàng bằng mã đơn và số điện thoại.",
    },
  ];
}

export default function OrderLookupRoute() {
  const { t } = useTranslation("orderLookup");
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(
    searchParams.get("orderNumber") ?? "",
  );
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Awaited<
    ReturnType<typeof lookupStorefrontOrder>
  > | null>(null);
  const [selectedItem, setSelectedItem] = useState<
    | Awaited<
        ReturnType<typeof lookupStorefrontOrder>
      >["order"]["items"][number]
    | null
  >(null);
  const [isCustomizationFullscreen, setIsCustomizationFullscreen] =
    useState(false);

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
      setError(err instanceof Error ? err.message : t("lookup_error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-surface-base text-on-surface">
      <Container className="py-10 md:py-16">
        <header className="max-w-2xl">
          <p className="font-label-md text-label-md uppercase tracking-[0.22em] text-brand-accent">
            {t("eyebrow")}
          </p>
          <h1 className="mt-3 font-heading text-headline-lg uppercase leading-none text-brand-hero md:text-display-sm">
            {t("heading")}
          </h1>
          <p className="mt-4 max-w-xl font-body-lg text-body-lg leading-relaxed text-on-surface-variant">
            {t("description")}
          </p>
        </header>

        <main className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-10">
          <section
            className="self-start rounded-2xl border border-border-subtle bg-surface-panel p-5 sm:p-6"
            aria-labelledby="lookup-form-title"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <PackageSearch className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="lookup-form-title"
                  className="font-heading text-title-lg uppercase text-on-surface"
                >
                  {t("form_heading")}
                </h2>
                <p className="mt-0.5 text-sm text-on-surface-variant">
                  {t("form_help")}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">
                  {t("order_number_label")}
                </span>
                <Input
                  value={orderNumber}
                  onChange={(event) => setOrderNumber(event.target.value)}
                  placeholder={t("order_number_placeholder")}
                  autoComplete="off"
                  required
                  className="h-12 rounded-xl border-border-strong/30 bg-white px-4 text-base placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-primary"
                />
              </label>
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-on-surface">
                  {t("phone_label")}
                </span>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder={t("phone_placeholder")}
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  className="h-12 rounded-xl border-border-strong/30 bg-white px-4 text-base placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-primary"
                />
              </label>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-full bg-primary px-6 font-semibold text-primary-foreground hover:bg-brand-strong active:translate-y-px"
              >
                {loading ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Search className="size-4" aria-hidden="true" />
                )}
                {loading ? t("submitting") : t("submit")}
              </Button>
            </form>

            {error ? (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
              >
                {error}
              </div>
            ) : null}
          </section>

          <section
            className="min-h-[380px] rounded-2xl border border-border-subtle bg-white p-5 sm:p-6 md:p-8"
            aria-live="polite"
            aria-labelledby="lookup-results-title"
          >
            {loading ? (
              <div className="space-y-6" aria-label={t("submitting")}>
                <div className="h-5 w-32 animate-pulse rounded bg-surface-subtle" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="h-20 animate-pulse rounded-xl bg-surface-subtle" />
                  <div className="h-20 animate-pulse rounded-xl bg-surface-subtle" />
                </div>
                <div className="h-28 animate-pulse rounded-xl bg-surface-subtle" />
              </div>
            ) : result ? (
              <div className="space-y-7">
                <div className="flex flex-col gap-4 border-b border-border-subtle pb-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      {t("order_number")}
                    </p>
                    <h2
                      id="lookup-results-title"
                      className="mt-1 font-heading text-headline-md uppercase text-brand-hero"
                    >
                      {result.order.orderNumber}
                    </h2>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-sm text-on-surface-variant">
                      {t("total")}
                    </p>
                    <p className="mt-1 font-body-lg text-title-lg font-bold text-primary">
                      {formatCurrency(result.order.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      {t("status")}
                    </p>
                    <p className="mt-1 font-semibold capitalize text-on-surface">
                      {result.order.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      {t("payment")}
                    </p>
                    <p className="mt-1 font-semibold capitalize text-on-surface">
                      {result.order.paymentStatus}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      {t("customer")}
                    </p>
                    <p className="mt-1 font-semibold text-on-surface">
                      {result.order.customer.name}
                    </p>
                    <p className="text-sm text-on-surface-variant">
                      {result.order.customer.phoneMasked}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-on-surface-variant">
                      {t("address")}
                    </p>
                    <p className="mt-1 text-on-surface">
                      {result.order.primaryAddress?.line1}
                      {result.order.primaryAddress?.city
                        ? `, ${result.order.primaryAddress.city}`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="border-t border-border-subtle pt-6">
                  <h3 className="font-heading text-title-lg uppercase text-on-surface">
                    {t("items_heading")}
                  </h3>
                  <div className="mt-3 divide-y divide-border-subtle">
                    {result.order.items.map((item, index) => (
                      <article
                        key={`${item.productTitle}-${index}`}
                        className="flex flex-col gap-4 py-5 first:pt-0 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div>
                          <Link
                            to={
                              item.productHandle
                                ? getGenericProductPath(item.productHandle)
                                : "#"
                            }
                            className="font-semibold text-on-surface transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {item.productTitle}
                          </Link>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {item.variantTitle}
                          </p>
                          <p className="mt-1 text-sm text-on-surface-variant">
                            {t("quantity_abbr")} {item.quantity}
                          </p>
                          {getOrderItemPreviewCustomizationValues(
                            item.customizationValues,
                          ).length > 0 ? (
                            <div className="mt-3 space-y-1 text-sm text-on-surface-variant">
                              {getOrderItemPreviewCustomizationValues(
                                item.customizationValues,
                              ).map((entry) => (
                                <p key={entry.fieldId}>
                                  <span className="font-medium text-on-surface">
                                    {entry.label}:
                                  </span>{" "}
                                  {entry.valueSummary}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end">
                          <p className="font-semibold text-on-surface">
                            {formatCurrency(item.lineSubtotalAmount)}
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedItem(
                                selectOrderItemPreview(
                                  result.order.items,
                                  index,
                                ),
                              )
                            }
                            className="rounded-full border-primary px-4 font-semibold text-primary hover:bg-primary hover:text-primary-foreground active:translate-y-px"
                          >
                            <ClipboardCheck
                              className="size-4"
                              aria-hidden="true"
                            />
                            {t("preview")}
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <Dialog
                  modal={false}
                  open={selectedItem !== null}
                  onOpenChange={(open) => {
                    if (!open && !isCustomizationFullscreen)
                      setSelectedItem(null);
                  }}
                >
                  <DialogContent
                    showOverlay={!isCustomizationFullscreen}
                    aria-hidden={isCustomizationFullscreen || undefined}
                    className={`max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto ${
                      isCustomizationFullscreen
                        ? "pointer-events-none opacity-0"
                        : ""
                    }`}
                    onPointerDownOutside={(event) => {
                      if (isCustomizationFullscreen) event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                      if (isCustomizationFullscreen) event.preventDefault();
                    }}
                    onEscapeKeyDown={(event) => {
                      if (isCustomizationFullscreen) event.preventDefault();
                    }}
                  >
                    {selectedItem ? (
                      <>
                        <DialogHeader>
                          <DialogTitle>{selectedItem.productTitle}</DialogTitle>
                          <DialogDescription>
                            {t("dialog_title")}
                          </DialogDescription>
                        </DialogHeader>

                        {selectedItem.previewImageUrl &&
                        !selectedItem.customizationPreview ? (
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
                            template={
                              selectedItem.customizationPreview.template
                            }
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
                              <p className="text-on-surface-variant">
                                {t("dialog_variant")}
                              </p>
                              <p className="font-medium text-on-surface">
                                {selectedItem.variantTitle}
                              </p>
                            </div>
                            {selectedItem.sku ? (
                              <div>
                                <p className="text-on-surface-variant">
                                  {t("dialog_sku")}
                                </p>
                                <p className="font-medium text-on-surface">
                                  {selectedItem.sku}
                                </p>
                              </div>
                            ) : null}
                            <div>
                              <p className="text-on-surface-variant">
                                {t("dialog_quantity")}
                              </p>
                              <p className="font-medium text-on-surface">
                                {selectedItem.quantity}
                              </p>
                            </div>
                            <div>
                              <p className="text-on-surface-variant">
                                {t("dialog_line_total")}
                              </p>
                              <p className="font-medium text-primary">
                                {formatCurrency(
                                  selectedItem.lineSubtotalAmount,
                                )}
                              </p>
                            </div>
                          </div>

                          {getOrderItemPreviewCustomizationValues(
                            selectedItem.customizationValues,
                          ).length > 0 ? (
                            <div className="border-t border-outline pt-4">
                              <p className="mb-2 font-medium text-on-surface">
                                {t("dialog_customization")}
                              </p>
                              <div className="space-y-2 text-on-surface-variant">
                                {getOrderItemPreviewCustomizationValues(
                                  selectedItem.customizationValues,
                                ).map((entry) => (
                                  <p key={entry.fieldId}>
                                    <span className="font-medium text-on-surface">
                                      {entry.label}:
                                    </span>{" "}
                                    {entry.valueSummary}
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
                              {t("dialog_close")}
                            </button>
                          </DialogClose>
                        </DialogFooter>
                      </>
                    ) : null}
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center px-6 text-center">
                <div className="flex size-12 items-center justify-center rounded-xl bg-surface-subtle text-primary">
                  <PackageSearch className="size-6" aria-hidden="true" />
                </div>
                <h2
                  id="lookup-results-title"
                  className="mt-5 font-heading text-title-lg uppercase text-on-surface"
                >
                  {t("empty_heading")}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">
                  {t("empty_state")}
                </p>
              </div>
            )}
          </section>
        </main>
      </Container>
    </div>
  );
}
