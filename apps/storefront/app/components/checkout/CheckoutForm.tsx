import { useEffect, useState, type FormEvent } from "react";
import { v3 } from "vietnam-divisions-js";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
  const [provinces, setProvinces] = useState<
    Array<{ idProvince: string; name: string }>
  >([]);
  const [communes, setCommunes] = useState<
    Array<{ idProvince: string; idCommune: string; name: string }>
  >([]);
  const [selectedProvinceId, setSelectedProvinceId] = useState("");
  const [selectedProvinceName, setSelectedProvinceName] = useState("");
  const [selectedWardName, setSelectedWardName] = useState("");
  const [loadingCommunes, setLoadingCommunes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    v3.getAllProvinces().then((data) => {
      if (!cancelled) {
        setProvinces(data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProvinceId) {
      setCommunes([]);
      setSelectedWardName("");
      return;
    }
    let cancelled = false;
    setLoadingCommunes(true);
    v3.getCommunesByProvinceId(selectedProvinceId).then((data) => {
      if (!cancelled) {
        setCommunes(data);
        setLoadingCommunes(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedProvinceId]);

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
            placeholder="Nhập họ và tên của bạn"
            type="text"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Số Điện Thoại
          </Label>
          <Input
            name="customer.phone"
            required
            placeholder="0xxx xxx xxx"
            type="tel"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Email (Tùy chọn)
          </Label>
          <Input
            name="customer.email"
            placeholder="email@vi-du.com"
            type="email"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>

        {/* 2 cấp hành chính: Tỉnh/Thành phố & Xã/Phường */}
        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Tỉnh / Thành phố
          </Label>
          <input
            type="hidden"
            name="shipping.primaryAddress.province"
            value={selectedProvinceName}
          />
          <select
            required
            value={selectedProvinceId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedProvinceId(id);
              const found = provinces.find((p) => p.idProvince === id);
              setSelectedProvinceName(found?.name ?? "");
              setSelectedWardName("");
            }}
            className="flex h-12 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-base text-on-surface shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          >
            <option value="">-- Chọn Tỉnh / Thành phố --</option>
            {provinces.map((p) => (
              <option key={p.idProvince} value={p.idProvince}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Xã / Phường
          </Label>
          <select
            name="shipping.primaryAddress.city"
            required
            value={selectedWardName}
            onChange={(e) => setSelectedWardName(e.target.value)}
            disabled={!selectedProvinceId || loadingCommunes}
            className="flex h-12 w-full rounded-md border border-outline-variant bg-white px-3 py-2 text-base text-on-surface shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:bg-surface-variant/30 disabled:opacity-60"
          >
            <option value="">
              {loadingCommunes
                ? "-- Đang tải danh sách xã/phường... --"
                : selectedProvinceId
                  ? "-- Chọn Xã / Phường --"
                  : "-- Vui lòng chọn Tỉnh/TP trước --"}
            </option>
            {communes.map((c) => (
              <option key={c.idCommune} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 font-label-md text-label-md text-on-surface-variant">
            Địa chỉ chi tiết
          </Label>
          <Input
            name="shipping.primaryAddress.line1"
            required
            placeholder="Số nhà, tên ngõ, đường..."
            type="text"
            className="border-outline-variant bg-white py-6 text-base focus-visible:border-primary focus-visible:ring-primary"
          />
        </div>
      </div>
    </section>
  );
}

function PaymentMethodSection() {
  return (
    <section>
      <h2 className="mb-6 font-heading text-[30px] uppercase leading-none tracking-[0.03em] text-brand-strong lg:mb-8">
        Hình thức thanh toán
      </h2>
      <input type="hidden" name="paymentMethod" value="bank_transfer" />
      <div className="relative flex flex-col rounded-lg border-2 border-action-positive bg-white p-5 shadow-sm lg:p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-action-positive bg-action-positive">
            <span className="h-2 w-2 rounded-full bg-white" />
          </span>
          <p className="font-body-lg text-body-lg font-bold text-on-surface">
            Chuyển khoản ngân hàng (100%)
          </p>
        </div>
        <div className="mt-3 pl-8 text-sm leading-relaxed text-on-surface-variant">
          <p className="italic">
            Sau khi đặt hàng, thông tin số tài khoản và mã nội dung chuyển khoản
            sẽ hiển thị ngay trên màn hình.
          </p>
          <p className="mt-1 text-xs text-on-surface-variant/80">
            * Lưu ý: Do đặc thù sản phẩm chế tác theo yêu cầu, xưởng bắt đầu sản
            xuất ngay sau khi nhận được chuyển khoản.
          </p>
        </div>
      </div>
    </section>
  );
}

function AdditionalRequirementsSection({
  vatChecked,
  onVatCheckedChange,
  vatErrors,
  onVatFieldChange,
}: {
  vatChecked: boolean;
  onVatCheckedChange: (checked: boolean) => void;
  vatErrors: Partial<Record<"name" | "taxId" | "email" | "address", string>>;
  onVatFieldChange: (field: "name" | "taxId" | "email" | "address") => void;
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
        <div className="space-y-1">
          <Label className="group flex cursor-pointer items-center gap-3 font-body-md font-medium text-on-surface">
            <Checkbox
              checked={vatChecked}
              onCheckedChange={(checked) => onVatCheckedChange(Boolean(checked))}
              className="h-5 w-5 rounded-none border-2 border-outline-variant text-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
            />
            <span>Thông tin nhận hóa đơn VAT</span>
          </Label>
          <p className="pl-8 text-xs italic text-on-surface-variant">
            Nếu không chọn, hóa đơn mặc định xuất theo thông tin người mua
          </p>
        </div>
        {vatChecked ? (
          <div className="grid grid-cols-1 gap-4 rounded-md border border-outline-variant bg-surface-container-low p-4 md:grid-cols-2 lg:p-6">
            <div>
              <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Tên đơn vị/Cá nhân
              </Label>
              <Input
                name="vat.name"
                aria-describedby={vatErrors.name ? "vat-name-error" : undefined}
                aria-invalid={Boolean(vatErrors.name)}
                className="border-outline-variant bg-white aria-invalid:border-error aria-invalid:ring-error"
                onChange={() => onVatFieldChange("name")}
                required
                type="text"
              />
              {vatErrors.name ? (
                <p id="vat-name-error" className="mt-1 text-sm text-error">
                  {vatErrors.name}
                </p>
              ) : null}
            </div>
            <div>
              <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Mã số thuế
              </Label>
              <Input
                name="vat.taxId"
                aria-describedby={
                  vatErrors.taxId ? "vat-tax-id-error" : undefined
                }
                aria-invalid={Boolean(vatErrors.taxId)}
                className="border-outline-variant bg-white aria-invalid:border-error aria-invalid:ring-error"
                onChange={() => onVatFieldChange("taxId")}
                required
                type="text"
              />
              {vatErrors.taxId ? (
                <p id="vat-tax-id-error" className="mt-1 text-sm text-error">
                  {vatErrors.taxId}
                </p>
              ) : null}
            </div>
            <div>
              <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Email nhận hóa đơn
              </Label>
              <Input
                name="vat.email"
                aria-describedby={
                  vatErrors.email ? "vat-email-error" : undefined
                }
                aria-invalid={Boolean(vatErrors.email)}
                className="border-outline-variant bg-white aria-invalid:border-error aria-invalid:ring-error"
                onChange={() => onVatFieldChange("email")}
                required
                type="email"
              />
              {vatErrors.email ? (
                <p id="vat-email-error" className="mt-1 text-sm text-error">
                  {vatErrors.email}
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Label className="mb-1 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Địa chỉ hóa đơn
              </Label>
              <Input
                name="vat.address"
                aria-describedby={
                  vatErrors.address ? "vat-address-error" : undefined
                }
                aria-invalid={Boolean(vatErrors.address)}
                className="border-outline-variant bg-white aria-invalid:border-error aria-invalid:ring-error"
                onChange={() => onVatFieldChange("address")}
                required
                type="text"
              />
              {vatErrors.address ? (
                <p id="vat-address-error" className="mt-1 text-sm text-error">
                  {vatErrors.address}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function PurchaseNoticeModal({
  open,
  onOpenChange,
  onAccept,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto bg-white p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl uppercase tracking-wide text-brand-strong">
            Lưu ý mua hàng & Quy định dịch vụ
          </DialogTitle>
          <DialogDescription className="text-sm text-on-surface-variant">
            Kính mời Quý khách đọc kỹ các quy định sau trước khi hoàn tất đặt hàng tại Phùng Thị:
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-on-surface">
          <div className="rounded-lg bg-surface-container-low p-4">
            <h4 className="font-semibold text-brand-strong">
              1. Thanh toán chuyển khoản 100%
            </h4>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
              Do cúp vinh danh, kỷ niệm chương và quà tặng là sản phẩm sản xuất
              theo yêu cầu riêng (in ấn, khắc laser thông tin cá nhân/doanh
              nghiệp), chúng tôi chỉ bắt đầu chế tác sau khi nhận đủ 100% thanh
              toán qua chuyển khoản ngân hàng.
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <h4 className="font-semibold text-brand-strong">
              2. Duyệt maket thiết kế
            </h4>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
              Sau khi đơn hàng được tạo, chuyên viên thiết kế sẽ gửi bản duyệt
              maket chi tiết qua Zalo/SĐT để Quý khách xác nhận trước khi tiến
              hành in/khắc thực tế.
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <h4 className="font-semibold text-brand-strong">
              3. Thời gian gia công & Giao hàng
            </h4>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
              Thời gian chế tác tiêu chuẩn từ 1 – 3 ngày làm việc kể từ thời
              điểm chốt maket và xác nhận thanh toán. Đơn hàng được đóng gói
              bọc xốp chống sốc và chuyển phát tận nơi.
            </p>
          </div>
          <div className="rounded-lg bg-surface-container-low p-4">
            <h4 className="font-semibold text-brand-strong">
              4. Đồng kiểm & Đổi trả
            </h4>
            <p className="mt-1 text-xs text-on-surface-variant sm:text-sm">
              Quý khách có quyền đồng kiểm khi nhận hàng. Nếu sản phẩm bị nứt vỡ
              do vận chuyển hoặc sai lệch nội dung in/khắc so với bản duyệt, Phùng
              Thị cam kết sản xuất lại và đổi mới 1:1 miễn phí.
            </p>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button
            type="button"
            className="w-full bg-action-positive py-6 font-semibold uppercase tracking-wider text-white hover:bg-action-positive-hover"
            onClick={() => {
              onAccept();
              onOpenChange(false);
            }}
          >
            Tôi đã hiểu và đồng ý
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  vatChecked,
  onVatCheckedChange,
  vatErrors,
  onVatFieldChange,
  agreementChecked,
  onAgreementCheckedChange,
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
  paymentMethod?: string;
  onPaymentMethodChange?: (value: string) => void;
  vatChecked: boolean;
  onVatCheckedChange: (checked: boolean) => void;
  vatErrors: Partial<Record<"name" | "taxId" | "email" | "address", string>>;
  onVatFieldChange: (field: "name" | "taxId" | "email" | "address") => void;
  agreementChecked: boolean;
  onAgreementCheckedChange: (checked: boolean) => void;
  submitting: boolean;
  hasInvalidLines: boolean;
}) {
  const [showTermsModal, setShowTermsModal] = useState(false);

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
          <PaymentMethodSection />
          <AdditionalRequirementsSection
            vatChecked={vatChecked}
            onVatCheckedChange={onVatCheckedChange}
            vatErrors={vatErrors}
            onVatFieldChange={onVatFieldChange}
          />

          {/* Cam kết lưu ý mua hàng trước khi thanh toán */}
          <div className="mt-8 space-y-4">
            <Label className="group flex cursor-pointer items-start gap-3 text-sm text-on-surface">
              <Checkbox
                checked={agreementChecked}
                onCheckedChange={(checked) =>
                  onAgreementCheckedChange(Boolean(checked))
                }
                className="mt-0.5 h-5 w-5 rounded-none border-2 border-outline-variant text-primary data-[state=checked]:border-primary data-[state=checked]:bg-primary"
              />
              <span className="leading-tight">
                Tôi đã đọc hiểu và đồng ý nội dung trong{" "}
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="font-semibold text-primary underline underline-offset-4 hover:text-brand-strong focus:outline-none"
                >
                  lưu ý mua hàng
                </button>
              </span>
            </Label>
            <PurchaseNoticeModal
              open={showTermsModal}
              onOpenChange={setShowTermsModal}
              onAccept={() => onAgreementCheckedChange(true)}
            />
          </div>

          <div className="mt-10 lg:mt-12">
            <Button
              type="submit"
              disabled={submitting || hasInvalidLines || !agreementChecked}
              className="w-full rounded-md bg-action-positive py-8 font-label-md text-label-md uppercase tracking-widest text-white shadow-xl transition-all hover:bg-action-positive-hover hover:shadow-2xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Đang gửi đơn..."
                : "Đặt hàng và nhận thông tin chuyển khoản"}
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
