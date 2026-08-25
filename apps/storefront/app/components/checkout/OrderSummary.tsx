import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import type { CartLine } from "../../lib/cart";
import { getLocalized } from "../../lib/translation";
import { formatCurrency } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export type CheckoutLocale = "vi" | "en";

export type CheckoutItem = {
  line: CartLine;
  valid: boolean;
  priceAmount: number | null;
  title: string;
  variantTitle: string;
  thumbnail: string | null;
  customization?: {
    enabled: boolean;
    formFields: Array<{
      id: string;
      label: string;
    }>;
  } | null;
};

function OrderSummaryItem({
  item,
  locale,
}: {
  item: CheckoutItem;
  locale: CheckoutLocale;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="relative h-16 w-16 flex-shrink-0 rounded-lg border border-outline-variant bg-white">
        {item.thumbnail ? (
          <img
            src={item.thumbnail}
            alt={getLocalized(item.title, locale)}
            className="h-full w-full rounded-lg object-contain p-1"
          />
        ) : null}
        <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-text-base text-[11px] font-medium text-white">
          {item.line.quantity}
        </span>
      </div>
      <div className="min-w-0 flex-grow pt-0.5">
        <div className="flex items-start justify-between gap-4">
          <h4 className="text-[14px] font-semibold uppercase leading-tight tracking-[0.06em] text-brand-strong">
            {getLocalized(item.title, locale)}
          </h4>
          <p className="whitespace-nowrap font-heading text-[20px] uppercase leading-none text-text-base">
            {formatCurrency(item.priceAmount)}
          </p>
        </div>
        <div className="mt-1 flex flex-col gap-0.5 text-[13px] text-text-muted">
          {item.variantTitle && item.variantTitle !== "Default Title" ? (
            <p>{item.variantTitle}</p>
          ) : null}
          {item.line.customizationSummary?.map((entry, index) => {
            const liveField = item.customization?.formFields?.find(
              (f) => f.id === entry.fieldId,
            );
            const label = liveField?.label || getLocalized(entry.label, locale);
            return (
              <p key={index}>
                {label ? `${label}: ` : ""}
                {entry.valueSummary}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderTotals({
  itemCount,
  subtotal,
}: {
  itemCount: number;
  subtotal: number;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-text-base">Subtotal · {itemCount} items</span>
        <span className="font-medium text-text-base">
          {formatCurrency(subtotal)}
        </span>
      </div>
      <div className="flex items-center justify-between text-[14px]">
        <span className="text-text-base">Shipping</span>
        <span className="text-text-muted">Miễn phí</span>
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-brand-strong">
          Total
        </span>
        <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-text-base">
          <span className="mr-2 text-sm font-normal text-text-muted">VND</span>
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
}

function DiscountCodeForm({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <Input
        placeholder="Discount code or gift card"
        className="h-11 bg-white text-base"
      />
      <Button
        type="button"
        variant="secondary"
        className="h-11 border border-outline-variant bg-surface-subtle px-6 font-medium text-text-base hover:bg-surface-container-high"
      >
        Apply
      </Button>
    </div>
  );
}

function SummaryItems({
  items,
  locale,
}: {
  items: CheckoutItem[];
  locale: CheckoutLocale;
}) {
  return (
    <div className="space-y-6">
      {items.map((item) => (
        <OrderSummaryItem key={item.line.id} item={item} locale={locale} />
      ))}
    </div>
  );
}

export function MobileOrderSummary({
  isOpen,
  onToggle,
  items,
  subtotal,
  locale,
}: {
  isOpen: boolean;
  onToggle: () => void;
  items: CheckoutItem[];
  subtotal: number;
  locale: CheckoutLocale;
}) {
  return (
    <div className="border-y border-[#DEDEDE] bg-[#F5F5F5] px-4 py-4 sm:px-6 lg:hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-primary"
      >
        <span className="flex items-center gap-2 font-medium">
          <ShoppingCart className="text-xl" />
          {isOpen ? "Ẩn tóm tắt đơn hàng" : "Hiển thị tóm tắt đơn hàng"}
          {isOpen ? (
            <ChevronUp className="text-xl" />
          ) : (
            <ChevronDown className="text-xl" />
          )}
        </span>
        <span className="font-heading text-[24px] uppercase leading-none tracking-[0.02em] text-text-base">
          {formatCurrency(subtotal)}
        </span>
      </button>
      <div className={`mt-6 space-y-6 ${isOpen ? "block" : "hidden"}`}>
        <SummaryItems items={items} locale={locale} />
        <DiscountCodeForm className="border-y border-[#DEDEDE] py-4" />
        <div className="pt-2">
          <OrderTotals itemCount={items.length} subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}

export function DesktopOrderSummary({
  items,
  subtotal,
  locale,
}: {
  items: CheckoutItem[];
  subtotal: number;
  locale: CheckoutLocale;
}) {
  return (
    <div className="hidden bg-[#F5F5F5] lg:block lg:border-l lg:border-[#DEDEDE]">
      <div className="sticky top-20 flex max-h-[calc(100vh-5rem)] w-full max-w-[520px] flex-col px-12 py-16 xl:px-16">
        <div className="-ml-4 -mr-4 -mt-4 flex-1 overflow-y-auto pb-4 pl-4 pr-4 pt-4">
          <SummaryItems items={items} locale={locale} />
        </div>
        <div className="mt-6 flex-none border-t border-[#DEDEDE] pt-6">
          <DiscountCodeForm className="mb-6" />
          <OrderTotals itemCount={items.length} subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}
