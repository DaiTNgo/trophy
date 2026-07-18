import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import type { Route } from "./+types/checkout";
import {
  createStorefrontOrder,
  resolveStorefrontCartLines,
  type StorefrontResolvedCartLine,
} from "../lib/api";
import { useCart } from "../hooks/use-cart";
import type { CartLine } from "../lib/cart";
import { formatCurrency } from "../lib/utils";
import { getLocalized } from "../lib/translation";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";
import { Container } from "../components/container";

const ORDER_SUMMARY_STORAGE_KEY = "trophy-order-confirmation";
const CHECKOUT_LOGO_SRC = "/logo.png";

type CheckoutLocale = "vi" | "en";
type CreateOrderResponse = Awaited<ReturnType<typeof createStorefrontOrder>>;

type CheckoutItem = {
  line: CartLine;
  valid: boolean;
  priceAmount: number | null;
  title: string;
  variantTitle: string;
  thumbnail: string | null;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thanh Toán | Phùng Thị - Chế Tác Vinh Quang" },
    {
      name: "description",
      content: "Thanh toán đơn hàng của bạn tại Phùng Thị",
    },
  ];
}

function buildCheckoutItems({
  lines,
  resolved,
  locale,
}: {
  lines: CartLine[];
  resolved: StorefrontResolvedCartLine[];
  locale: CheckoutLocale;
}) {
  return lines.map((line, index): CheckoutItem => {
    const resolvedLine = resolved[index];

    return {
      line,
      valid: resolvedLine?.valid ?? true,
      priceAmount: resolvedLine?.product?.priceAmount ?? line.display.priceAmount,
      title:
        getLocalized(resolvedLine?.product?.title, locale) ||
        getLocalized(line.display.productTitle, locale),
      variantTitle:
        getLocalized(resolvedLine?.product?.variantTitle, locale) ||
        line.display.variantTitle,
      thumbnail: resolvedLine?.product?.thumbnail ?? line.display.thumbnail,
    };
  });
}

function getFormString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

function storeOrderConfirmation({
  order,
  formData,
  checkoutItems,
  locale,
}: {
  order: CreateOrderResponse["order"];
  formData: FormData;
  checkoutItems: CheckoutItem[];
  locale: CheckoutLocale;
}) {
  window.sessionStorage.setItem(
    ORDER_SUMMARY_STORAGE_KEY,
    JSON.stringify({
      ...order,
      customerName: getFormString(formData, "customer.name"),
      customerPhone: getFormString(formData, "customer.phone"),
      customerEmail: getFormString(formData, "customer.email"),
      addressLine1: getFormString(formData, "shipping.primaryAddress.line1"),
      addressCity: getFormString(formData, "shipping.primaryAddress.city"),
      addressProvince: getFormString(formData, "shipping.primaryAddress.province"),
      items: checkoutItems.map((item) => ({
        title: getLocalized(item.title, locale),
        variantTitle: item.variantTitle,
        quantity: item.line.quantity,
        lineSubtotalAmount: (item.priceAmount ?? 0) * item.line.quantity,
        thumbnail: item.thumbnail,
        customizationSummary: item.line.customizationSummary,
      })),
    }),
  );
}

function CheckoutHeader({ showCartLink = true }: { showCartLink?: boolean }) {
  return (
    <header className="sticky top-0 z-20 w-full border-b border-[#DEDEDE] bg-white">
      <Container className="flex h-20 items-center justify-between">
        <div className="flex-1" />
        <div className="flex flex-1 justify-center">
          <Link to="/">
            <img
              alt="Phùng Thị Logo"
              className="h-20 object-contain"
              src={CHECKOUT_LOGO_SRC}
            />
          </Link>
        </div>
        <div className="flex flex-1 justify-end">
          {showCartLink ? (
            <Link
              to="/cart"
              className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
            >
              <ShoppingCart />
              <span className="hidden text-sm font-medium sm:inline">
                Giỏ hàng
              </span>
            </Link>
          ) : null}
        </div>
      </Container>
    </header>
  );
}

function CheckoutErrorAlert({
  error,
  className = "",
}: {
  error: string;
  className?: string;
}) {
  if (!error) return null;

  return (
    <Container className={className}>
      <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
        {error}
      </div>
    </Container>
  );
}

function EmptyCheckoutState() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-on-background">
      <CheckoutHeader showCartLink={false} />
      <main className="flex-grow py-12">
        <Container>
          <div className="rounded-2xl border border-[#DEDEDE] bg-white px-8 py-16 text-center">
            <h1 className="font-heading text-[34px] uppercase leading-none tracking-[0.03em] text-brand-strong">
              Không có sản phẩm để thanh toán
            </h1>
            <p className="mt-3 text-on-surface-variant">
              Thêm sản phẩm vào giỏ trước khi tiếp tục.
            </p>
            <Button
              asChild
              className="mt-6 rounded-full bg-action-support px-6 py-6 font-semibold uppercase tracking-[0.12em] hover:bg-action-support-hover"
            >
              <Link to="/products">Xem sản phẩm</Link>
            </Button>
          </div>
        </Container>
      </main>
    </div>
  );
}

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
          {item.line.customizationSummary?.map((entry, idx) => (
            <p key={idx}>{entry.valueSummary}</p>
          ))}
        </div>
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

function OrderSummaryItems({
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

function MobileOrderSummary({
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
        <OrderSummaryItems items={items} locale={locale} />
        <DiscountCodeForm className="border-y border-[#DEDEDE] py-4" />
        <div className="pt-2">
          <OrderTotals itemCount={items.length} subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}

function DesktopOrderSummary({
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
          <OrderSummaryItems items={items} locale={locale} />
        </div>

        <div className="mt-6 flex-none border-t border-[#DEDEDE] pt-6">
          <DiscountCodeForm className="mb-6" />
          <OrderTotals itemCount={items.length} subtotal={subtotal} />
        </div>
      </div>
    </div>
  );
}

function CustomerInformationSection() {
  return (
    <section>
      <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
        Thông tin khách hàng
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        <div className="md:col-span-2">
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Họ và Tên
          </Label>
          <Input
            name="customer.name"
            required
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            placeholder="Nhập họ và tên của bạn"
            type="text"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Số Điện Thoại
          </Label>
          <Input
            name="customer.phone"
            required
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            placeholder="0xxx xxx xxx"
            type="tel"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Email (Tùy chọn)
          </Label>
          <Input
            name="customer.email"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            placeholder="email@vi-du.com"
            type="email"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Địa Chỉ Giao Hàng
          </Label>
          <Input
            name="shipping.primaryAddress.line1"
            required
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            placeholder="Số nhà, tên đường, phường/xã"
            type="text"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Tỉnh / Thành phố
          </Label>
          <Input
            name="shipping.primaryAddress.city"
            required
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            type="text"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Quận / Huyện
          </Label>
          <Input
            name="shipping.primaryAddress.province"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            type="text"
          />
        </div>
      </div>
    </section>
  );
}

function PaymentRadioIndicator({ checked }: { checked: boolean }) {
  return (
    <div
      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${
        checked
          ? "border-action-positive bg-action-positive"
          : "border-outline-variant group-hover:border-action-positive"
      }`}
    >
      <div
        className={`h-2 w-2 rounded-full bg-white transition-opacity ${
          checked ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function PaymentMethodSection({
  paymentMethod,
  onPaymentMethodChange,
}: {
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
}) {
  return (
    <section>
      <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
        Hình thức thanh toán
      </h2>

      <RadioGroup
        value={paymentMethod}
        onValueChange={onPaymentMethodChange}
        name="paymentMethod"
        className="space-y-4"
      >
        <Label
          htmlFor="bank_transfer"
          className="group relative flex flex-col rounded-lg border-2 border-surface-variant bg-white p-4 shadow-sm transition-all hover:border-action-positive [&:has([data-state=checked])]:border-action-positive lg:p-6"
        >
          <div className="mb-4 flex items-center gap-4">
            <RadioGroupItem
              value="bank_transfer"
              id="bank_transfer"
              className="sr-only"
            />
            <PaymentRadioIndicator checked={paymentMethod === "bank_transfer"} />
            <p className="font-body-lg text-body-lg font-semibold text-on-surface">
              Chuyển khoản ngân hàng
            </p>
          </div>
          <div className="pl-9 text-sm font-normal text-on-surface-variant">
            <p className="mb-2">
              Thực hiện thanh toán vào ngay tài khoản ngân hàng:
            </p>
            <p className="font-bold text-on-surface">STK: 9987996745</p>
            <p>Ngân hàng Vietcombank</p>
            <p>Chủ Tài khoản: Nguyen Tuan Thanh</p>
            <p className="mt-2 italic">
              Vui lòng sử dụng Mã đơn hàng của bạn trong phần Nội dung thanh
              toán. Đơn hàng sẽ đươc giao sau khi tiền đã chuyển.
            </p>
          </div>
        </Label>

        <Label
          htmlFor="cod"
          className="group relative flex items-center gap-4 rounded-lg border-2 border-surface-variant bg-white p-4 shadow-sm transition-all hover:border-action-positive [&:has([data-state=checked])]:border-action-positive lg:p-6"
        >
          <RadioGroupItem value="cod" id="cod" className="sr-only" />
          <PaymentRadioIndicator checked={paymentMethod === "cod"} />
          <p className="font-body-lg text-body-lg font-semibold text-on-surface">
            Trả tiền mặt khi nhận hàng
          </p>
        </Label>
      </RadioGroup>
    </section>
  );
}

function VatFields() {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-md border border-outline-variant bg-surface-container-low p-4 md:grid-cols-2 lg:p-6">
      <div className="md:col-span-2">
        <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Loại hóa đơn
        </Label>
        <Input
          name="vat.type"
          className="border-outline-variant bg-white"
          placeholder="Cá nhân / Công ty"
          type="text"
        />
      </div>
      <div>
        <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Tên đơn vị/Cá nhân
        </Label>
        <Input
          name="vat.name"
          className="border-outline-variant bg-white"
          type="text"
        />
      </div>
      <div>
        <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Mã số thuế
        </Label>
        <Input
          name="vat.taxId"
          className="border-outline-variant bg-white"
          type="text"
        />
      </div>
      <div>
        <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Email nhận hóa đơn
        </Label>
        <Input
          name="vat.email"
          className="border-outline-variant bg-white"
          type="email"
        />
      </div>
      <div className="md:col-span-2">
        <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Địa chỉ hóa đơn
        </Label>
        <Input
          name="vat.address"
          className="border-outline-variant bg-white"
          type="text"
        />
      </div>
    </div>
  );
}

function AdditionalRequirementsSection({
  vatChecked,
  onVatCheckedChange,
}: {
  vatChecked: boolean;
  onVatCheckedChange: (checked: boolean) => void;
}) {
  return (
    <section className="mt-12">
      <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
        Yêu cầu bổ sung
      </h2>
      <div className="space-y-6">
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Ghi chú đơn hàng
          </Label>
          <Textarea
            name="notes"
            className="min-h-[100px] w-full border-outline-variant bg-white px-4 py-3 text-base focus-visible:border-primary focus-visible:ring-primary"
            placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."
          />
        </div>
        <div className="flex flex-col gap-4">
          <Label className="group flex cursor-pointer items-center gap-3 font-body-md font-normal text-on-surface">
            <Checkbox
              checked={vatChecked}
              onCheckedChange={(checked) => onVatCheckedChange(Boolean(checked))}
              className="h-5 w-5 rounded-none border-2 border-outline-variant text-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <span>Tôi muốn xuất hoá đơn VAT</span>
          </Label>

          {vatChecked ? <VatFields /> : null}
        </div>
      </div>
    </section>
  );
}

function CheckoutSubmitActions({
  submitting,
  hasInvalidLines,
}: {
  submitting: boolean;
  hasInvalidLines: boolean;
}) {
  return (
    <div className="mt-10 lg:mt-12">
      <Button
        type="submit"
        disabled={submitting || hasInvalidLines}
        className="w-full rounded-md bg-action-positive py-8 font-label-md text-label-md uppercase tracking-widest text-white shadow-xl transition-all hover:bg-action-positive-hover hover:shadow-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Đang gửi đơn..." : "Đặt hàng ngay"}
      </Button>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4 text-sm font-medium">
        <a href="#" className="text-primary hover:underline">
          Refund policy
        </a>
        <a href="#" className="text-primary hover:underline">
          Privacy policy
        </a>
        <a href="#" className="text-primary hover:underline">
          Terms of service
        </a>
      </div>
    </div>
  );
}

function CheckoutForm({
  error,
  onSubmit,
  checkoutItems,
  subtotal,
  locale,
  showMobileSummary,
  onToggleMobileSummary,
  paymentMethod,
  onPaymentMethodChange,
  vatChecked,
  onVatCheckedChange,
  submitting,
  hasInvalidLines,
}: {
  error: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  checkoutItems: CheckoutItem[];
  subtotal: number;
  locale: CheckoutLocale;
  showMobileSummary: boolean;
  onToggleMobileSummary: () => void;
  paymentMethod: string;
  onPaymentMethodChange: (value: string) => void;
  vatChecked: boolean;
  onVatCheckedChange: (checked: boolean) => void;
  submitting: boolean;
  hasInvalidLines: boolean;
}) {
  return (
    <main className="relative z-10 flex-grow">
      <CheckoutErrorAlert error={error} className="mb-6 lg:hidden" />

      <form
        onSubmit={onSubmit}
        className="flex flex-col lg:grid lg:min-h-[calc(100vh-5rem)] lg:grid-cols-2"
      >
        {error ? (
          <div className="hidden lg:col-span-2 lg:block">
            <CheckoutErrorAlert error={error} className="mt-8" />
          </div>
        ) : null}

        <MobileOrderSummary
          isOpen={showMobileSummary}
          onToggle={onToggleMobileSummary}
          items={checkoutItems}
          subtotal={subtotal}
          locale={locale}
        />

        <div className="mx-auto w-full max-w-[640px] space-y-12 px-4 pb-12 pt-8 sm:px-6 lg:mr-0 lg:max-w-[720px] lg:px-12 lg:py-16 xl:px-16">
          <CustomerInformationSection />
          <PaymentMethodSection
            paymentMethod={paymentMethod}
            onPaymentMethodChange={onPaymentMethodChange}
          />
          <AdditionalRequirementsSection
            vatChecked={vatChecked}
            onVatCheckedChange={onVatCheckedChange}
          />
          <CheckoutSubmitActions
            submitting={submitting}
            hasInvalidLines={hasInvalidLines}
          />
        </div>

        <DesktopOrderSummary
          items={checkoutItems}
          subtotal={subtotal}
          locale={locale}
        />
      </form>
    </main>
  );
}

export default function Checkout() {
  const { lines, isReady, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const locale = (searchParams.get("locale") === "en" ? "en" : "vi") as CheckoutLocale;
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<StorefrontResolvedCartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [vatChecked, setVatChecked] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

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
          setError(
            err instanceof Error ? err.message : "Không thể tải lại giỏ hàng.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isReady, lines, locale]);

  const checkoutItems = useMemo(
    () => buildCheckoutItems({ lines, resolved, locale }),
    [lines, resolved, locale],
  );

  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.priceAmount ?? 0) * item.line.quantity,
    0,
  );
  const hasInvalidLines = checkoutItems.some(
    (item) => !item.valid || item.priceAmount === null,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasInvalidLines || lines.length === 0 || submitting) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setSubmitting(true);
    setError("");

    try {
      const response = await createStorefrontOrder({
        locale,
        customer: {
          name: getFormString(formData, "customer.name"),
          phone: getFormString(formData, "customer.phone"),
          email: getFormString(formData, "customer.email") || undefined,
        },
        shipping: {
          primaryAddress: {
            line1: getFormString(formData, "shipping.primaryAddress.line1"),
            city: getFormString(formData, "shipping.primaryAddress.city"),
            province:
              getFormString(formData, "shipping.primaryAddress.province") ||
              undefined,
            country: "VN",
          },
          shipToDifferentAddress: false,
        },
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          customization: line.customizationValues
            ? { values: line.customizationValues }
            : undefined,
        })),
      });

      storeOrderConfirmation({
        order: response.order,
        formData,
        checkoutItems,
        locale,
      });
      clearCart();
      navigate(`/order-confirmation?orderNumber=${response.order.orderNumber}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo đơn hàng.");
    } finally {
      setSubmitting(false);
    }
  }

  if (isReady && lines.length === 0) {
    return <EmptyCheckoutState />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-on-background">
      <CheckoutHeader />
      <div className="relative flex w-full flex-grow flex-col">
        <CheckoutForm
          error={error}
          onSubmit={handleSubmit}
          checkoutItems={checkoutItems}
          subtotal={subtotal}
          locale={locale}
          showMobileSummary={showMobileSummary}
          onToggleMobileSummary={() => setShowMobileSummary((current) => !current)}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          vatChecked={vatChecked}
          onVatCheckedChange={setVatChecked}
          submitting={submitting}
          hasInvalidLines={hasInvalidLines}
        />
      </div>
    </div>
  );
}
