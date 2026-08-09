import type { FormEvent } from "react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Textarea } from "../ui/textarea";
import { Container } from "../container";
import {
  DesktopOrderSummary,
  MobileOrderSummary,
  type CheckoutItem,
  type CheckoutLocale,
} from "./OrderSummary";

function ErrorAlert({
  error,
  className = "",
}: {
  error: string;
  className?: string;
}) {
  return error ? (
    <Container className={className}>
      <div className="rounded-lg border border-error/20 bg-error-container px-4 py-3 text-sm text-error">
        {error}
      </div>
    </Container>
  ) : null;
}

function CustomerInformationSection() {
  const fields = [
    [
      "customer.name",
      "Họ và Tên",
      "Nhập họ và tên của bạn",
      "text",
      true,
      "md:col-span-2",
    ],
    ["customer.phone", "Số Điện Thoại", "0xxx xxx xxx", "tel", true, ""],
    [
      "customer.email",
      "Email (Tùy chọn)",
      "email@vi-du.com",
      "email",
      false,
      "",
    ],
    [
      "shipping.primaryAddress.line1",
      "Địa Chỉ Giao Hàng",
      "Số nhà, tên đường, phường/xã",
      "text",
      true,
      "md:col-span-2",
    ],
  ] as const;
  return (
    <section>
      <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
        Thông tin khách hàng
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        {fields.map(([name, label, placeholder, type, required, span]) => (
          <div key={name} className={span}>
            <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
              {label}
            </Label>
            <Input
              name={name}
              required={required}
              placeholder={placeholder}
              type={type}
              className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
            />
          </div>
        ))}
      </div>
    </section>
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
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === "bank_transfer" ? "border-action-positive bg-action-positive" : "border-outline-variant"}`}
            >
              <span className="h-2 w-2 rounded-full bg-white" />
            </span>
            <p className="font-body-lg text-body-lg font-semibold text-on-surface">
              Chuyển khoản ngân hàng
            </p>
          </div>
          <div className="pl-9 text-sm font-normal text-on-surface-variant">
            <p className="mt-2 italic">
              Sau khi đặt hàng, thông tin chuyển khoản và mã nội dung thanh
              toán sẽ hiển thị ngay trên màn hình này.
            </p>
          </div>
        </Label>
        <Label
          htmlFor="cod"
          className="group relative flex items-center gap-4 rounded-lg border-2 border-surface-variant bg-white p-4 shadow-sm transition-all hover:border-action-positive [&:has([data-state=checked])]:border-action-positive lg:p-6"
        >
          <RadioGroupItem value="cod" id="cod" className="sr-only" />
          <span
            className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${paymentMethod === "cod" ? "border-action-positive bg-action-positive" : "border-outline-variant"}`}
          >
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <p className="font-body-lg text-body-lg font-semibold text-on-surface">
            Trả tiền mặt khi nhận hàng
          </p>
        </Label>
      </RadioGroup>
    </section>
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
        <Label className="group flex cursor-pointer items-center gap-3 font-body-md font-normal text-on-surface">
          <Checkbox
            checked={vatChecked}
            onCheckedChange={(checked) => onVatCheckedChange(Boolean(checked))}
            className="h-5 w-5 rounded-none border-2 border-outline-variant text-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
          />
          <span>Tôi muốn xuất hoá đơn VAT</span>
        </Label>
        {vatChecked ? (
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
        ) : null}
      </div>
    </section>
  );
}

export function CheckoutForm({
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
      <ErrorAlert error={error} className="mb-6 lg:hidden" />
      <form
        onSubmit={onSubmit}
        className="flex flex-col lg:grid lg:min-h-[calc(100vh-5rem)] lg:grid-cols-2"
      >
        {error ? (
          <div className="hidden lg:col-span-2 lg:block">
            <ErrorAlert error={error} className="mt-8" />
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
          <div className="mt-10 lg:mt-12">
            <Button
              type="submit"
              disabled={submitting || hasInvalidLines}
              className="w-full rounded-md bg-action-positive py-8 font-label-md text-label-md uppercase tracking-widest text-white shadow-xl transition-all hover:bg-action-positive-hover hover:shadow-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Đang gửi đơn..."
                : paymentMethod === "bank_transfer"
                  ? "Đặt hàng và nhận thông tin chuyển khoản"
                  : "Đặt hàng ngay"}
            </Button>
          </div>
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
