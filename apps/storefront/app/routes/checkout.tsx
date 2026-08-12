import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CheckCircle2, Copy } from "lucide-react";
import type { Route } from "./+types/checkout";
import {
  createStorefrontOrder,
  fetchStorefrontPaymentInstructions,
  resolveStorefrontCartLines,
  type StorefrontPaymentInstructionsResponse,
  type StorefrontResolvedCartLine,
} from "../lib/api";
import { useCart } from "../hooks/use-cart";
import type { CartLine } from "../lib/cart";
import { getLocalized } from "../lib/translation";
import { formatCurrency } from "../lib/utils";
import { Button } from "../components/ui/button";
import { Container } from "../components/container";
import { CheckoutForm } from "../components/checkout/CheckoutForm";
import type {
  CheckoutItem,
  CheckoutLocale,
} from "../components/checkout/OrderSummary";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Thanh Toán | Phùng Thị - Chế Tác Vinh Quang" },
    {
      name: "description",
      content: "Thanh toán đơn hàng của bạn tại Phùng Thị",
    },
  ];
}

function getFormString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
}

export function isValidVietnamTaxId(value: string) {
  const taxId = value.replace(/[\s-]+/g, "");
  if (!/^\d{10}(\d{3})?$/.test(taxId)) return false;

  const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  const sum = weights.reduce((total, weight, index) => total + Number(taxId[index]) * weight, 0);
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 10 - remainder;
  return checkDigit === Number(taxId[9]);
}

function getVatDetails(formData: FormData) {
  const vat = {
    type: getFormString(formData, "vat.type"),
    name: getFormString(formData, "vat.name"),
    taxId: getFormString(formData, "vat.taxId"),
    email: getFormString(formData, "vat.email"),
    address: getFormString(formData, "vat.address"),
  };

  return Object.values(vat).some(Boolean) ? vat : undefined;
}

function buildCheckoutItems(
  lines: CartLine[],
  resolved: StorefrontResolvedCartLine[],
  locale: CheckoutLocale,
): CheckoutItem[] {
  return lines.map((line, index) => {
    const resolvedLine = resolved[index];
    return {
      line,
      valid: resolvedLine?.valid ?? true,
      priceAmount:
        resolvedLine?.product?.priceAmount ?? line.display.priceAmount,
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
              src="/logo.png"
            />
          </Link>
        </div>
        <div className="flex flex-1 justify-end">
          {showCartLink ? (
            <Link
              to="/cart"
              className="flex items-center gap-2 text-on-surface-variant transition-colors hover:text-primary"
            >
              Giỏ hàng
            </Link>
          ) : null}
        </div>
      </Container>
    </header>
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

function PaymentInstructionsState({
  order,
}: {
  order: StorefrontPaymentInstructionsResponse["order"];
}) {
  const [copied, setCopied] = useState<"account" | "reference" | null>(null);
  const transferReference = order.paymentReference;

  async function copy(value: string, kind: "account" | "reference") {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1500);
  }

  const isBankTransfer = order.paymentMethod === "bank_transfer";
  return (
    <div className="flex min-h-screen flex-col bg-white text-on-background">
      <CheckoutHeader showCartLink={false} />
      <main className="flex-grow py-8 sm:py-12">
        <Container className="max-w-3xl">
          <section className="border border-[#DEDEDE] bg-white px-5 py-8 sm:px-10 sm:py-12">
            <CheckCircle2 className="size-10 text-action-positive" aria-hidden="true" />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.08em] text-on-surface-variant">
              Đơn hàng đã được ghi nhận
            </p>
            <h1 className="mt-2 font-heading text-[34px] uppercase leading-none tracking-[0.03em] text-brand-strong">
              {order.orderNumber}
            </h1>
            <p className="mt-5 text-lg text-on-surface">
              Tổng thanh toán: <strong>{formatCurrency(order.totalAmount)}</strong>
            </p>

            {isBankTransfer ? (
              <div className="mt-8 border-y border-[#DEDEDE] py-7">
                <h2 className="font-heading text-2xl uppercase text-brand-strong">Thông tin chuyển khoản</h2>
                <dl className="mt-5 space-y-4 text-on-surface">
                  <div>
                    <dt className="text-sm text-on-surface-variant">Ngân hàng</dt>
                    <dd className="mt-1 font-semibold">Vietcombank</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Chủ tài khoản</dt>
                    <dd className="mt-1 font-semibold">Nguyen Tuan Thanh</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Số tài khoản</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-3 font-semibold">
                      9987996745
                      <Button type="button" variant="outline" size="sm" onClick={() => void copy("9987996745", "account")}>
                        <Copy className="size-4" aria-hidden="true" />
                        {copied === "account" ? "Đã sao chép" : "Sao chép"}
                      </Button>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Nội dung chuyển khoản</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-3 font-semibold">
                      {transferReference}
                      <Button type="button" variant="outline" size="sm" onClick={() => void copy(transferReference, "reference")}>
                        <Copy className="size-4" aria-hidden="true" />
                        {copied === "reference" ? "Đã sao chép" : "Sao chép"}
                      </Button>
                    </dd>
                  </div>
                </dl>
                <p className="mt-6 text-sm text-on-surface-variant">
                  Đơn hàng sẽ được xác nhận sau khi chúng tôi đối soát khoản chuyển.
                </p>
              </div>
            ) : (
              <p className="mt-8 border-y border-[#DEDEDE] py-7 text-on-surface-variant">
                Bạn thanh toán khi nhận hàng. Đội ngũ Phùng Thị sẽ liên hệ xác nhận đơn hàng.
              </p>
            )}
            <Link className="mt-8 inline-flex text-sm font-semibold text-primary underline underline-offset-4" to="/products">
              Tiếp tục mua sắm
            </Link>
          </section>
        </Container>
      </main>
    </div>
  );
}

export default function Checkout() {
  const { lines, isReady, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const locale: CheckoutLocale =
    searchParams.get("locale") === "en" ? "en" : "vi";
  const paymentOrderNumber = searchParams.get("order");
  const paymentAccessToken = searchParams.get("access");
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<StorefrontResolvedCartLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [vatChecked, setVatChecked] = useState(false);
  const [vatTaxIdError, setVatTaxIdError] = useState("");
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentInstructions, setPaymentInstructions] = useState<StorefrontPaymentInstructionsResponse["order"] | null>(null);
  const [paymentInstructionsError, setPaymentInstructionsError] = useState("");

  useEffect(() => {
    if (!paymentOrderNumber || !paymentAccessToken) return;
    let cancelled = false;
    fetchStorefrontPaymentInstructions({ orderNumber: paymentOrderNumber, accessToken: paymentAccessToken })
      .then((response) => {
        if (!cancelled) setPaymentInstructions(response.order);
      })
      .catch((reason) => {
        if (!cancelled) {
          setPaymentInstructionsError(reason instanceof Error ? reason.message : "Không thể tải hướng dẫn thanh toán.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [paymentAccessToken, paymentOrderNumber]);

  useEffect(() => {
    if (!isReady || lines.length === 0) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    resolveStorefrontCartLines({
      locale,
      items: lines.map(({ productId, variantId }) => ({
        productId,
        variantId,
      })),
    })
      .then((response) => {
        if (!cancelled) {
          setResolved(response.items);
          setError("");
        }
      })
      .catch((reason) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể tải lại giỏ hàng.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [isReady, lines, locale]);

  const checkoutItems = useMemo(
    () => buildCheckoutItems(lines, resolved, locale),
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
    if (hasInvalidLines || lines.length === 0 || submitting) return;
    const formData = new FormData(event.currentTarget);
    const vat = getVatDetails(formData);
    if (vat?.taxId && !isValidVietnamTaxId(vat.taxId)) {
      setVatTaxIdError("Mã số thuế không hợp lệ.");
      const taxIdInput = event.currentTarget.elements.namedItem("vat.taxId");
      if (taxIdInput instanceof HTMLInputElement) taxIdInput.focus();
      return;
    }
    setVatTaxIdError("");
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
          },
          shipToDifferentAddress: false,
        },
        payment: {
          method: paymentMethod === "cod" ? "cash_on_delivery" : "bank_transfer",
        },
        notes: getFormString(formData, "notes") || undefined,
        vat,
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          customization: line.customizationValues
            ? { values: line.customizationValues }
            : undefined,
        })),
      });
      clearCart();
      const paymentSearch = new URLSearchParams({
        order: response.order.orderNumber,
        access: response.order.checkoutAccessToken,
      });
      if (locale === "en") paymentSearch.set("locale", "en");
      navigate(`/checkout?${paymentSearch}`, { replace: true });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo đơn hàng.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (paymentOrderNumber && paymentAccessToken) {
    if (paymentInstructions) return <PaymentInstructionsState order={paymentInstructions} />;
    return (
      <div className="flex min-h-screen flex-col bg-white text-on-background">
        <CheckoutHeader showCartLink={false} />
        <main className="flex-grow py-12"><Container>{paymentInstructionsError || "Đang tải hướng dẫn thanh toán..."}</Container></main>
      </div>
    );
  }

  if (isReady && lines.length === 0) return <EmptyCheckoutState />;
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
          onToggleMobileSummary={() =>
            setShowMobileSummary((current) => !current)
          }
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          vatChecked={vatChecked}
          onVatCheckedChange={(checked) => {
            setVatChecked(checked);
            if (!checked) setVatTaxIdError("");
          }}
          vatTaxIdError={vatTaxIdError}
          onVatTaxIdChange={() => setVatTaxIdError("")}
          submitting={submitting}
          hasInvalidLines={hasInvalidLines}
        />
      </div>
    </div>
  );
}
