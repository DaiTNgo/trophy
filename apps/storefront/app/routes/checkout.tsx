import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/checkout";
import {
  createStorefrontOrder,
  resolveStorefrontCartLines,
  type StorefrontResolvedCartLine,
} from "../lib/api";
import { useCart } from "../hooks/use-cart";
import type { CartLine } from "../lib/cart";
import { getLocalized } from "../lib/translation";
import { Button } from "../components/ui/button";
import { Container } from "../components/container";
import { CheckoutForm } from "../components/checkout/CheckoutForm";
import type {
  CheckoutItem,
  CheckoutLocale,
} from "../components/checkout/OrderSummary";

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

function getFormString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "");
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

export default function Checkout() {
  const { lines, isReady, clearCart } = useCart();
  const [searchParams] = useSearchParams();
  const locale: CheckoutLocale =
    searchParams.get("locale") === "en" ? "en" : "vi";
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
        notes: getFormString(formData, "notes") || undefined,
        vat: getVatDetails(formData),
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
          customerName: getFormString(formData, "customer.name"),
          customerPhone: getFormString(formData, "customer.phone"),
          customerEmail: getFormString(formData, "customer.email"),
          addressLine1: getFormString(
            formData,
            "shipping.primaryAddress.line1",
          ),
          addressCity: getFormString(formData, "shipping.primaryAddress.city"),
          addressProvince: getFormString(
            formData,
            "shipping.primaryAddress.province",
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
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo đơn hàng.",
      );
    } finally {
      setSubmitting(false);
    }
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
          onVatCheckedChange={setVatChecked}
          submitting={submitting}
          hasInvalidLines={hasInvalidLines}
        />
      </div>
    </div>
  );
}
