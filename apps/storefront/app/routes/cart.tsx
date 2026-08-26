import { useEffect, useMemo, useState } from "react";
import { Link, useLoaderData, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Image,
  ShieldCheck,
  CheckCircle,
  Trash2Icon,
} from "lucide-react";
import type { Route } from "./+types/cart";
import {
  resolveStorefrontCartLines,
  type StorefrontResolvedCartLine,
} from "../lib/api";
import { useCart } from "../hooks/use-cart";
import { getLocalized } from "../lib/translation";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { QuantityInput } from "../components/ui/quantity-input";
import {
  getRecentlyViewedProducts,
  type RecentlyViewedProduct,
} from "../lib/recently-viewed";
import { RecentlyViewedProducts } from "../components/cart/RecentlyViewedProducts";
import { getGenericProductPath } from "../lib/storefront-paths";
import { canReviseCartLine, getCartLineRevisionPath } from "../lib/cart-revision";
import { getLocale } from "../i18n.server";
import { withStorefrontLoaderLog } from "../lib/observability";

export async function loader({ request, context }: Route.LoaderArgs) {
  return withStorefrontLoaderLog("cart", request, async () => {
    const locale = getLocale(context);
    return { locale };
  });
}

export function meta({ loaderData }: Route.MetaArgs) {
  const isEn = loaderData?.locale === "en";
  return [
    { title: isEn ? "Shopping Cart | Phùng Thị" : "Giỏ hàng | Phùng Thị" },
    { name: "description", content: isEn ? "Shopping Cart" : "Giỏ hàng" },
  ];
}

function reasonLabel(
  reason: StorefrontResolvedCartLine["reason"],
  t: (key: string) => string,
) {
  switch (reason) {
    case "product_unavailable":
      return t("errors.product_unavailable");
    case "variant_missing":
      return t("errors.variant_missing");
    case "variant_mismatch":
      return t("errors.variant_mismatch");
    case "contact_price":
      return t("errors.contact_price");
    default:
      return "";
  }
}

export default function Cart() {
  const loaderData = useLoaderData<typeof loader>();
  const { t, i18n } = useTranslation("cart");
  const { lines, isReady, updateQuantity, removeLine, itemCount } = useCart();
  const [searchParams] = useSearchParams();
  const locale = (searchParams.get("locale") || loaderData?.locale || i18n.language || "vi") as "vi" | "en";
  const [resolved, setResolved] = useState<StorefrontResolvedCartLine[]>([]);
  const [error, setError] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedProduct[]>([]);

  useEffect(() => {
    if (!isReady || lines.length === 0) {
      setResolved([]);
      return;
    }

    let cancelled = false;
    resolveStorefrontCartLines({
      locale,
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
          setError(err instanceof Error ? err.message : t("errors.cannot_load"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, lines, locale, t]);

  useEffect(() => {
    setRecentlyViewed(getRecentlyViewedProducts());
  }, []);

  const rows = useMemo(
    () =>
      lines.map((line, index) => {
        const resolvedLine = resolved[index];
        const display = resolvedLine?.product
          ? {
              title: getLocalized(resolvedLine.product.title, locale),
              handle: resolvedLine.product.handle,
              variantTitle: getLocalized(resolvedLine.product.variantTitle, locale),
              sku: resolvedLine.product.sku,
              thumbnail: resolvedLine.product.thumbnail,
              priceAmount: resolvedLine.product.priceAmount,
              customization: resolvedLine.product.customization ?? null,
            }
          : {
              title: getLocalized(line.display.productTitle, locale),
              handle: line.display.productHandle,
              variantTitle: line.display.variantTitle,
              sku: line.display.sku,
              thumbnail: line.display.thumbnail,
              priceAmount: line.display.priceAmount,
              customization: null,
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
    [lines, locale, resolved],
  );

  const subtotal = useMemo(() => {
    return rows.reduce<number | null>((acc, row) => {
      if (acc === null || row.lineTotal === null) return null;
      return acc + row.lineTotal;
    }, 0);
  }, [rows]);

  const hasInvalidLines = rows.some((row) => !row.valid);
  const recentlyViewedForCart = useMemo(() => {
    const productIdsInCart = new Set(lines.map((line) => line.productId));
    return recentlyViewed
      .filter((item) => !productIdsInCart.has(item.productId))
      .slice(0, 4);
  }, [lines, recentlyViewed]);

  if (!isReady) {
    return null;
  }

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-white pb-0 font-sans text-text-base">
        <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
          <div className="py-20 text-center">
            <h2 className="mb-4 font-heading text-[34px] uppercase leading-none tracking-[0.03em] text-brand-strong">{t("empty_title")}</h2>
            <Button asChild size="lg" className="bg-action-support px-8 font-bold uppercase tracking-[0.12em] hover:bg-action-support-hover">
              <Link to="/products">{t("continue_shopping")}</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-0 font-sans text-text-base">
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12">
          <h1 className="font-heading text-[42px] uppercase leading-none tracking-[0.04em] text-brand-strong">
            {t("title")}
          </h1>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          <div className="lg:col-span-8 flex flex-col gap-10 border-t border-gray-100 pt-10">
            {rows.map(({ line, display, valid, reason, lineTotal }) => (
              <div
                key={line.id}
                className="flex flex-col sm:flex-row sm:items-center gap-6 lg:gap-10 border-b border-gray-200 pb-10 last:border-0 relative"
              >
                {/* Image */}
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 flex-shrink-0 relative rounded-sm border border-gray-200 flex items-center justify-center">
                  {display.thumbnail ? (
                    <img
                      src={display.thumbnail}
                      alt={getLocalized(display.title, locale)}
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Image className="text-gray-300 text-3xl" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base mb-1 pr-6 uppercase">
                    <Link
                      to={getGenericProductPath(
                        display.handle ?? line.display.productHandle,
                      )}
                      className="hover:text-primary transition-colors"
                    >
                      {getLocalized(display.title, locale) ?? getLocalized(line.display.productTitle, locale)}
                    </Link>
                  </h3>
                  <div className="mb-4 font-heading text-[22px] uppercase leading-none tracking-[0.02em] text-text-base">
                    {formatCurrency(display.priceAmount)}
                  </div>
                  {line.customizationSummary.length > 0 ? (
                    <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                      {line.customizationSummary.map((entry) => {
                        const liveField = display.customization?.formFields?.find(
                          (f) => f.id === entry.fieldId,
                        );
                        const label = liveField?.label || getLocalized(entry.label, locale);
                        return (
                          <div key={entry.fieldId}>
                            {label}: {entry.valueSummary}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                  {canReviseCartLine(line) ? (
                    <Button asChild variant="outline" size="sm" className="mt-4">
                      <Link to={getCartLineRevisionPath(display.handle ?? line.display.productHandle, line.id)}>
                        {t("review_and_edit")}
                      </Link>
                    </Button>
                  ) : null}
                  {!valid && reason ? (
                    <p className="mt-3 text-sm text-red-500">
                      {reasonLabel(reason, t)}
                    </p>
                  ) : null}
                </div>

                {/* Quantity */}
                <div className="flex flex-col items-start sm:items-center w-28 shrink-0">
                  <QuantityInput
                    value={line.quantity}
                    min={1}
                    max={99}
                    commitOnBlur
                    onValueChange={(next) => updateQuantity(line.id, next)}
                  />
                </div>

                {/* Price */}
                <div className="w-16 shrink-0 text-right font-heading text-[22px] uppercase leading-none tracking-[0.02em] text-text-base">
                  {formatCurrency(lineTotal)}
                </div>

                {/* Remove */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 sm:static sm:translate-y-0 sm:w-10 flex justify-end shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-transparent"
                    onClick={() => removeLine(line.id)}
                    aria-label={t("remove_item_aria")}
                  >
                    <Trash2Icon />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4">
            <Card className="rounded-none border border-border-subtle shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
              <CardContent className="p-6">
                <div className="flex justify-center items-center gap-2 mb-8">
                  <ShieldCheck className="text-indicator-trust text-[24px]" />
                  <span className="font-bold text-[13px] tracking-wider uppercase text-brand-strong">
                    <span className="text-indicator-trust">{t("satisfaction_guarantee_highlight")}</span> {t("satisfaction_guarantee_text")}
                  </span>
                </div>
                <div className="flex items-center justify-between py-4 border-t border-gray-200 font-medium text-sm">
                  <span>{t("subtotal")}</span>
                  <span className="font-bold">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <Button
                  asChild
                  className="mt-4 w-full bg-action-support py-6 text-sm font-bold uppercase tracking-[0.14em] text-white hover:bg-action-support-hover"
                  disabled={hasInvalidLines}
                >
                  <Link
                    to={hasInvalidLines ? "#" : "/checkout"}
                    onClick={(e) => hasInvalidLines && e.preventDefault()}
                  >
                    {t("checkout")}
                  </Link>
                </Button>
                <div className="mt-5 flex items-center justify-center gap-2 text-sm text-brand-strong">
                  <CheckCircle className="text-[18px] text-indicator-trust" />
                  {t("free_shipping_notice")}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <RecentlyViewedProducts items={recentlyViewedForCart} />
      </main>
    </div>
  );
}
