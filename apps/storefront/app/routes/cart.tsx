import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Flame,
  Image,
  ShieldCheck,
  CheckCircle,
  ChevronRight,
  Mail,
  X,
  DeleteIcon,
  TrashIcon,
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
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { QuantityInput } from "../components/ui/quantity-input";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Shopping Cart | Phùng Thị" },
    { name: "description", content: "Shopping Cart" },
  ];
}

function reasonLabel(reason: StorefrontResolvedCartLine["reason"]) {
  switch (reason) {
    case "product_unavailable":
      return "Product is no longer available.";
    case "variant_missing":
      return "Variant is missing.";
    case "variant_mismatch":
      return "Variant does not match product.";
    case "contact_price":
      return "Contact for price.";
    default:
      return "";
  }
}

export default function Cart() {
  const { lines, isReady, updateQuantity, removeLine, itemCount } = useCart();
  const [searchParams] = useSearchParams();
  const locale = (searchParams.get('locale') === 'en' ? 'en' : 'vi') as 'vi' | 'en';
  const [resolved, setResolved] = useState<StorefrontResolvedCartLine[]>([]);
  const [error, setError] = useState("");

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
          setError(err instanceof Error ? err.message : "Cannot load cart.");
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
              title: getLocalized(resolvedLine.product.title, locale),
              handle: resolvedLine.product.handle,
              variantTitle: getLocalized(resolvedLine.product.variantTitle, locale),
              sku: resolvedLine.product.sku,
              thumbnail: resolvedLine.product.thumbnail,
              priceAmount: resolvedLine.product.priceAmount,
            }
          : {
              title: getLocalized(line.display.productTitle, locale),
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
    [lines, resolved, locale],
  );

  const subtotal = rows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0);
  const hasInvalidLines = rows.some((row) => !row.valid);

  return (
    <div className="min-h-screen bg-white pb-0 font-sans text-text-base">
      <main className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Title area */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-12">
          <h1 className="font-heading text-[42px] uppercase leading-none tracking-[0.04em] text-brand-strong">
            Shopping Cart
          </h1>
        </div>

        {error ? (
          <div className="mb-6 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {rows.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="mb-4 font-heading text-[34px] uppercase leading-none tracking-[0.03em] text-brand-strong">Your cart is empty</h2>
            <Button asChild size="lg" className="bg-action-support px-8 font-bold uppercase tracking-[0.12em] hover:bg-action-support-hover">
              <Link to="/products">Continue Shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
            <div className="lg:col-span-8 flex flex-col gap-10  border-t border-gray-100 pt-10">
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
                        to={`/product/${display.handle ?? line.display.productHandle}`}
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
                        {line.customizationSummary.map((entry) => (
                          <div key={entry.fieldId}>
                            {entry.label}: {entry.valueSummary}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                        <div>Finish: Gold</div>
                        <div>Strap Color: Black Leather</div>
                        <div>
                          Check here to confirm your design is correct: on
                        </div>
                      </div>
                    )}
                    {!valid && reason ? (
                      <p className="mt-3 text-sm text-red-500">
                        {reasonLabel(reason)}
                      </p>
                    ) : null}
                  </div>

                  {/* Quantity */}
                  <div className="flex flex-col items-start sm:items-center w-28 shrink-0">
                    <QuantityInput
                      value={line.quantity}
                      min={1}
                      max={99}
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
                      <span className="text-indicator-trust">100%</span> SATISFACTION
                      GUARANTEE
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-4 border-t border-gray-200 font-medium text-sm">
                    <span>Subtotal</span>
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
                      CHECKOUT
                    </Link>
                  </Button>
                  <div className="mt-5 flex items-center justify-center gap-2 text-sm text-brand-strong">
                    <CheckCircle className="text-[18px] text-indicator-trust" />
                    Free Shipping Over $40!
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Recently Viewed Mock */}
      <section className="max-w-7xl mx-auto px-4 py-20 border-t border-gray-100 mt-10">
        <h2 className="mb-12 text-center font-heading text-[32px] uppercase leading-none tracking-[0.03em] text-brand-strong">Recently Viewed</h2>
        <div className="flex overflow-x-auto gap-6 pb-4 md:grid md:grid-cols-5 md:overflow-visible relative items-center">
          {[
            {
              title: "Square Base League Plate - Silver",
              price: "$15",
              image: null,
            },
            {
              title: "Ultimate 6lb Custom Championship Belt",
              price: "$199",
              image: null,
            },
            {
              title: "Magic: The Gathering - Ultimate 6lb Championship Belt",
              price: "$199",
              image: null,
            },
            {
              title: "Customizable Chromatic Chain",
              price: "$59",
              image: null,
            },
            {
              title:
                '26"-56" Perpetual Fantasy Football Trophy - Black Football',
              price: "$170",
              image: null,
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-center shrink-0 w-[200px] md:w-auto"
            >
              <div className="w-full aspect-square bg-gray-50 flex items-center justify-center p-4 mb-4">
                <Image className="text-gray-300 text-6xl" />
              </div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-brand-strong sm:text-sm">
                {getLocalized(item.title, locale)}
              </h4>
              <p className="font-heading text-[18px] uppercase leading-none text-indicator-price sm:text-[20px]">{item.price}</p>
            </div>
          ))}
          <button className="hidden md:flex absolute -right-6 w-10 h-10 bg-white border border-gray-200 shadow-sm items-center justify-center hover:bg-gray-50">
            <ChevronRight />
          </button>
        </div>
      </section>
    </div>
  );
}
