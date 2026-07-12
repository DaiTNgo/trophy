import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/checkout";
import { ShoppingCart, ChevronUp, ChevronDown } from "lucide-react";
import {
  createStorefrontOrder,
  resolveStorefrontCartLines,
  type StorefrontResolvedCartLine,
} from "../lib/api";
import { useCart } from "../hooks/use-cart";
import { formatCurrency } from "../lib/utils";
import { getLocalized } from "../lib/translation";

import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Textarea } from "../components/ui/textarea";

const ORDER_SUMMARY_STORAGE_KEY = "trophy-order-confirmation";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thanh Toán | Phùng Thị - Chế Tác Vinh Quang" },
    {
      name: "description",
      content: "Thanh toán đơn hàng của bạn tại Phùng Thị",
    },
  ];
}

export default function Checkout() {
  const { lines, isReady, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const locale = (searchParams.get('locale') === 'en' ? 'en' : 'vi') as 'vi' | 'en';
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
    () =>
      lines.map((line, index) => {
        const resolvedLine = resolved[index];
        return {
          line,
          valid: resolvedLine?.valid ?? true,
          priceAmount:
            resolvedLine?.product?.priceAmount ?? line.display.priceAmount,
          title: getLocalized(resolvedLine?.product?.title, locale) ?? getLocalized(line.display.productTitle, locale),
          variantTitle:
            getLocalized(resolvedLine?.product?.variantTitle, locale) || line.display.variantTitle,
          thumbnail: resolvedLine?.product?.thumbnail ?? line.display.thumbnail,
        };
      }),
    [lines, resolved, locale],
  );

  const subtotal = checkoutItems.reduce(
    (sum, item) => sum + (item.priceAmount ?? 0) * item.line.quantity,
    0,
  );
  const hasInvalidLines = checkoutItems.some(
    (item) => !item.valid || item.priceAmount === null,
  );

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
      locale,
        customer: {
          name: String(formData.get("customer.name") ?? ""),
          phone: String(formData.get("customer.phone") ?? ""),
          email: String(formData.get("customer.email") ?? "") || undefined,
        },
        shipping: {
          primaryAddress: {
            line1: String(formData.get("shipping.primaryAddress.line1") ?? ""),
            city: String(formData.get("shipping.primaryAddress.city") ?? ""),
            province:
              String(formData.get("shipping.primaryAddress.province") ?? "") ||
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

      window.sessionStorage.setItem(
        ORDER_SUMMARY_STORAGE_KEY,
        JSON.stringify({
          ...response.order,
          customerName: String(formData.get("customer.name") ?? ""),
          customerPhone: String(formData.get("customer.phone") ?? ""),
          customerEmail: String(formData.get("customer.email") ?? ""),
          addressLine1: String(
            formData.get("shipping.primaryAddress.line1") ?? "",
          ),
          addressCity: String(
            formData.get("shipping.primaryAddress.city") ?? "",
          ),
          addressProvince: String(
            formData.get("shipping.primaryAddress.province") ?? "",
          ),
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
      <div className="min-h-screen bg-white text-on-background flex flex-col">
        <header className="w-full bg-white border-b border-outline-variant z-20 sticky top-0">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-20 flex items-center justify-between">
            <div className="flex-1"></div>
            <div className="flex-1 flex justify-center">
              <Link to="/">
                <img
                  alt="Phùng Thị Logo"
                  className="h-20 object-contain"
                  src="https://lh3.googleusercontent.com/aida/AP1WRLswS_vcN2RSQNnE4mSNo0yXb0pXBbCvNihKCR365QudgK_q6GfL_xoNtysWZp8syb9h3u1mOJTDYeXkVoDl1bpw6ahdiuCUhN6vC6AzLr9K6S75kpKCJwO-MNKheBG7VEq5OtcAgp2o3LvBjx6QxHkuvclP3uyr8wASue0CdJX1rWdc07Is5gEwZoVXMBCr3Dz5KTJckrEVPlpo18HKvnqDc8a9FDECX-NlMhMpd1FtW28payQzmOhZhw"
                />
              </Link>
            </div>
            <div className="flex-1 flex justify-end"></div>
          </div>
        </header>
        <main className="mx-auto flex-grow w-full max-w-container-max px-margin-mobile py-12 md:px-margin-desktop">
          <div className="rounded-2xl border border-outline bg-white px-8 py-16 text-center">
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
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-on-background flex flex-col">
      {/* Minimal Header (Always White Background) */}
      <header className="w-full bg-white border-b border-outline-variant z-20 sticky top-0">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop h-20 flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="flex-1 flex justify-center">
            <Link to="/">
              <img
                alt="Phùng Thị Logo"
                className="h-20 object-contain"
                src="https://lh3.googleusercontent.com/aida/AP1WRLswS_vcN2RSQNnE4mSNo0yXb0pXBbCvNihKCR365QudgK_q6GfL_xoNtysWZp8syb9h3u1mOJTDYeXkVoDl1bpw6ahdiuCUhN6vC6AzLr9K6S75kpKCJwO-MNKheBG7VEq5OtcAgp2o3LvBjx6QxHkuvclP3uyr8wASue0CdJX1rWdc07Is5gEwZoVXMBCr3Dz5KTJckrEVPlpo18HKvnqDc8a9FDECX-NlMhMpd1FtW28payQzmOhZhw"
              />
            </Link>
          </div>
          <div className="flex-1 flex justify-end">
            <Link
              to="/cart"
              className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-2"
            >
              <ShoppingCart />
              <span className="hidden sm:inline text-sm font-medium">
                Giỏ hàng
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Split Content Area */}
      <div className="relative flex-grow flex flex-col w-full">
        {/* Full-bleed right side background on desktop */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[50%] bg-surface-container-low z-0 border-l border-outline-variant"></div>

        {/* Main Content */}
        <main className="relative z-10 max-w-container-max mx-auto w-full flex-grow px-margin-mobile md:px-margin-desktop py-8 lg:py-12">
          {error ? (
            <div className="mb-6 rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
              {error}
            </div>
          ) : null}

          <form
            onSubmit={handleSubmit}
            className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16"
          >
            {/* Mobile Order Summary Toggle */}
            <div className="lg:hidden bg-surface-container-low -mx-margin-mobile px-margin-mobile py-4 border-y border-outline-variant">
              <button
                type="button"
                onClick={() => setShowMobileSummary(!showMobileSummary)}
                className="w-full flex justify-between items-center text-primary"
              >
                <span className="flex items-center gap-2 font-medium">
                  <ShoppingCart className="text-xl" />
                  {showMobileSummary
                    ? "Ẩn tóm tắt đơn hàng"
                    : "Hiển thị tóm tắt đơn hàng"}
                  {showMobileSummary ? (
                    <ChevronUp className="text-xl" />
                  ) : (
                    <ChevronDown className="text-xl" />
                  )}
                </span>
                <span className="font-heading text-[24px] uppercase leading-none tracking-[0.02em] text-text-base">
                  {formatCurrency(subtotal)}
                </span>
              </button>

              {/* Mobile Summary Content (Accordion) */}
              <div
                className={`mt-6 space-y-6 ${showMobileSummary ? "block" : "hidden"}`}
              >
                {checkoutItems.map((item) => (
                  <div key={item.line.id} className="flex gap-4 items-start">
                    <div className="w-16 h-16 bg-white rounded-lg border border-outline-variant flex-shrink-0 relative">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={getLocalized(item.title, locale)}
                          className="w-full h-full object-contain rounded-lg p-1"
                        />
                      ) : null}
                      <span className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-text-base text-[11px] font-medium text-white">
                        {item.line.quantity}
                      </span>
                    </div>

                    <div className="flex-grow min-w-0 pt-0.5">
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-brand-strong leading-tight">
                          {getLocalized(item.title, locale)}
                        </h4>
                        <p className="font-heading text-[20px] uppercase leading-none text-text-base whitespace-nowrap">
                          {formatCurrency(item.priceAmount)}
                        </p>
                      </div>

                      <div className="mt-1 flex flex-col gap-0.5 text-[13px] text-text-muted">
                        {item.variantTitle &&
                          item.variantTitle !== "Default Title" && (
                            <p>{item.variantTitle}</p>
                          )}
                        {item.line.customizationSummary?.map((entry, idx) => (
                          <p key={idx}>{entry.valueSummary}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="py-4 border-y border-outline-variant flex gap-3">
                  <Input
                    placeholder="Discount code or gift card"
                    className="bg-white text-base h-11"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 border border-outline-variant bg-surface-subtle px-6 font-medium text-text-base hover:bg-surface-container-high"
                  >
                    Apply
                  </Button>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-text-base">
                      Subtotal · {checkoutItems.length} items
                    </span>
                    <span className="font-medium text-text-base">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[14px]">
                    <span className="text-text-base">Shipping</span>
                    <span className="text-text-muted">Miễn phí</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-brand-strong">
                      Total
                    </span>
                    <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-text-base">
                      <span className="mr-2 text-sm font-normal text-text-muted">
                        VND
                      </span>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Left Column: Forms */}
            <div className="space-y-12 pb-12 lg:pr-8">
              {/* Billing Details */}
              <section>
                <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
                  Thông tin khách hàng
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                  <div className="md:col-span-2">
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Họ và Tên
                    </Label>
                    <Input
                      name="customer.name"
                      required
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder="Nhập họ và tên của bạn"
                      type="text"
                    />
                  </div>
                  <div>
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Số Điện Thoại
                    </Label>
                    <Input
                      name="customer.phone"
                      required
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder="0xxx xxx xxx"
                      type="tel"
                    />
                  </div>
                  <div>
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Email (Tùy chọn)
                    </Label>
                    <Input
                      name="customer.email"
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder="email@vi-du.com"
                      type="email"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Địa Chỉ Giao Hàng
                    </Label>
                    <Input
                      name="shipping.primaryAddress.line1"
                      required
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder="Số nhà, tên đường, phường/xã"
                      type="text"
                    />
                  </div>
                  <div>
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Tỉnh / Thành phố
                    </Label>
                    <Input
                      name="shipping.primaryAddress.city"
                      required
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder=""
                      type="text"
                    />
                  </div>
                  <div>
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Quận / Huyện
                    </Label>
                    <Input
                      name="shipping.primaryAddress.province"
                      className="bg-white border-outline-variant py-6 focus-visible:ring-primary focus-visible:border-primary text-base"
                      placeholder=""
                      type="text"
                    />
                  </div>
                </div>
              </section>

              {/* Shipping Methods */}
              <section>
                <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
                  Hình thức thanh toán
                </h2>

                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  name="paymentMethod"
                  className="space-y-4"
                >
                  <Label
                    htmlFor="bank_transfer"
                    className="group relative flex flex-col rounded-lg border-2 border-surface-variant bg-white p-4 shadow-sm transition-all hover:border-action-positive [&:has([data-state=checked])]:border-action-positive lg:p-6"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <RadioGroupItem
                        value="bank_transfer"
                        id="bank_transfer"
                        className="sr-only"
                      />
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${paymentMethod === "bank_transfer" ? "border-action-positive bg-action-positive" : "border-outline-variant group-hover:border-action-positive"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === "bank_transfer" ? "opacity-100" : "opacity-0"}`}
                        ></div>
                      </div>
                      <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                        Chuyển khoản ngân hàng
                      </p>
                    </div>
                    <div className="text-on-surface-variant text-sm pl-9 font-normal">
                      <p className="mb-2">
                        Thực hiện thanh toán vào ngay tài khoản ngân hàng:
                      </p>
                      <p className="font-bold text-on-surface">
                        STK: 9987996745
                      </p>
                      <p>Ngân hàng Vietcombank</p>
                      <p>Chủ Tài khoản: Nguyen Tuan Thanh</p>
                      <p className="mt-2 italic">
                        Vui lòng sử dụng Mã đơn hàng của bạn trong phần Nội dung
                        thanh toán. Đơn hàng sẽ đươc giao sau khi tiền đã
                        chuyển.
                      </p>
                    </div>
                  </Label>

                  <Label
                    htmlFor="cod"
                    className="group relative flex items-center gap-4 rounded-lg border-2 border-surface-variant bg-white p-4 shadow-sm transition-all hover:border-action-positive [&:has([data-state=checked])]:border-action-positive lg:p-6"
                  >
                    <RadioGroupItem value="cod" id="cod" className="sr-only" />
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all ${paymentMethod === "cod" ? "border-action-positive bg-action-positive" : "border-outline-variant group-hover:border-action-positive"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full bg-white transition-opacity ${paymentMethod === "cod" ? "opacity-100" : "opacity-0"}`}
                      ></div>
                    </div>
                    <p className="font-body-lg text-body-lg font-semibold text-on-surface">
                      Trả tiền mặt khi nhận hàng
                    </p>
                  </Label>
                </RadioGroup>
              </section>

              {/* Additional requirements */}
              <section className="mt-12">
                <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
                  Yêu cầu bổ sung
                </h2>
                <div className="space-y-6">
                  <div>
                    <Label className="font-label-md text-label-md text-on-surface-variant mb-2">
                      Ghi chú đơn hàng
                    </Label>
                    <Textarea
                      name="notes"
                      className="w-full bg-white border-outline-variant py-3 px-4 focus-visible:ring-primary focus-visible:border-primary min-h-[100px] text-base"
                      placeholder="Ghi chú về đơn hàng, ví dụ: thời gian hay chỉ dẫn địa điểm giao hàng chi tiết hơn."
                    />
                  </div>
                  <div className="flex flex-col gap-4">
                    <Label className="flex items-center gap-3 cursor-pointer group font-body-md font-normal text-on-surface">
                      <Checkbox
                        checked={vatChecked}
                        onCheckedChange={(checked) =>
                          setVatChecked(checked as boolean)
                        }
                        className="w-5 h-5 border-2 border-outline-variant text-primary rounded-none data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span>Tôi muốn xuất hoá đơn VAT</span>
                    </Label>

                    {vatChecked && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 lg:p-6 bg-surface-container-low border border-outline-variant rounded-md">
                        <div className="md:col-span-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                            Loại hóa đơn
                          </Label>
                          <Input
                            name="vat.type"
                            className="bg-white border-outline-variant"
                            placeholder="Cá nhân / Công ty"
                            type="text"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                            Tên đơn vị/Cá nhân
                          </Label>
                          <Input
                            name="vat.name"
                            className="bg-white border-outline-variant"
                            type="text"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                            Mã số thuế
                          </Label>
                          <Input
                            name="vat.taxId"
                            className="bg-white border-outline-variant"
                            type="text"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                            Email nhận hóa đơn
                          </Label>
                          <Input
                            name="vat.email"
                            className="bg-white border-outline-variant"
                            type="email"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                            Địa chỉ hóa đơn
                          </Label>
                          <Input
                            name="vat.address"
                            className="bg-white border-outline-variant"
                            type="text"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Submit Button & Policies */}
              <div className="mt-10 lg:mt-12">
                <Button
                  type="submit"
                  disabled={submitting || hasInvalidLines}
                  className="w-full rounded-md bg-action-positive py-8 font-label-md text-label-md uppercase tracking-widest text-white transition-all shadow-xl hover:bg-action-positive-hover hover:shadow-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Đang gửi đơn..." : "Đặt hàng ngay"}
                </Button>

                <div className="mt-8 flex flex-wrap justify-center items-center gap-x-6 gap-y-4 text-sm font-medium">
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
            </div>

            {/* Right Column: Order Summary (Desktop only, mobile uses the accordion above) */}
            <div className="hidden lg:block lg:pl-8">
              <div className="sticky top-32 flex flex-col max-h-[calc(100vh-8rem)]">
                <div className="flex-1 overflow-y-auto pt-4 -mt-4 pr-4 -mr-4 pl-4 -ml-4 pb-4">
                  <div className="space-y-6">
                    {checkoutItems.map((item) => (
                      <div
                        key={item.line.id}
                        className="flex gap-4 items-start"
                      >
                        <div className="w-16 h-16 bg-white rounded-lg border border-outline-variant flex-shrink-0 relative">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={getLocalized(item.title, locale)}
                              className="w-full h-full object-contain rounded-lg p-1"
                            />
                          ) : null}
                          <span className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-text-base text-[11px] font-medium text-white">
                            {item.line.quantity}
                          </span>
                        </div>

                        <div className="flex-grow min-w-0 pt-0.5">
                          <div className="flex justify-between items-start gap-4">
                            <h4 className="text-[14px] font-semibold uppercase tracking-[0.06em] text-brand-strong leading-tight">
                              {getLocalized(item.title, locale)}
                            </h4>
                            <p className="font-heading text-[20px] uppercase leading-none text-text-base whitespace-nowrap">
                              {formatCurrency(item.priceAmount)}
                            </p>
                          </div>

                          <div className="mt-1 flex flex-col gap-0.5 text-[13px] text-text-muted">
                            {item.variantTitle &&
                              item.variantTitle !== "Default Title" && (
                                <p>{item.variantTitle}</p>
                              )}
                            {item.line.customizationSummary?.map(
                              (entry, idx) => (
                                <p key={idx}>{entry.valueSummary}</p>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-none pt-6 mt-6 border-t border-outline-variant">
                  <div className="flex gap-3 mb-6">
                    <Input
                      placeholder="Discount code or gift card"
                      className="bg-white text-base h-11"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 border border-outline-variant bg-surface-subtle px-6 font-medium text-text-base hover:bg-surface-container-high"
                    >
                      Apply
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-text-base">
                        Subtotal · {checkoutItems.length} items
                      </span>
                      <span className="font-medium text-text-base">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[14px]">
                      <span className="text-text-base">Shipping</span>
                      <span className="text-text-muted">Miễn phí</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-brand-strong">
                        Total
                      </span>
                      <span className="font-heading text-[28px] uppercase leading-none tracking-[0.03em] text-text-base">
                        <span className="mr-2 text-sm font-normal text-text-muted">
                          VND
                        </span>
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
