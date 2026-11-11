import { useState } from "react";
import { Link } from "react-router";
import { CheckCircle2, Copy, Loader2, RefreshCw } from "lucide-react";
import type { StorefrontPaymentInstructionsResponse } from "../../lib/api";
import { usePaymentStatus } from "../../hooks/use-payment-status";
import { formatCurrency } from "../../lib/utils";
import { Button } from "../ui/button";
import { Container } from "../container";
import { BankAppPicker } from "./BankAppPicker";

type CopyKind = "account" | "description";

function CopyButton({
  value,
  kind,
  copied,
  onCopy,
}: {
  value: string;
  kind: CopyKind;
  copied: CopyKind | null;
  onCopy: (value: string, kind: CopyKind) => void;
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => onCopy(value, kind)}>
      <Copy className="size-4" aria-hidden="true" />
      {copied === kind ? "Đã sao chép" : "Sao chép"}
    </Button>
  );
}

function PaidState({ orderNumber, totalAmount }: { orderNumber: string; totalAmount: number }) {
  return (
    <div className="mt-8 border-y border-[#DEDEDE] py-7" role="status">
      <h2 className="font-heading text-2xl uppercase text-brand-strong">Thanh toán thành công</h2>
      <p className="mt-3 text-on-surface">
        Chúng tôi đã nhận <strong>{formatCurrency(totalAmount)}</strong> cho đơn hàng{" "}
        <strong>{orderNumber}</strong>. Đội ngũ Phùng Thị sẽ liên hệ xác nhận và tiến hành sản xuất.
      </p>
    </div>
  );
}

function UnavailableState({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="mt-8 border-y border-[#DEDEDE] py-7">
      <h2 className="font-heading text-2xl uppercase text-brand-strong">Thông tin chuyển khoản</h2>
      <p className="mt-3 text-on-surface-variant">
        Chưa thể tải thông tin chuyển khoản lúc này. Đơn hàng của bạn vẫn được giữ — vui lòng thử lại sau ít phút.
      </p>
      <Button type="button" variant="outline" className="mt-5" onClick={onRetry} disabled={retrying}>
        {retrying ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
        Thử lại
      </Button>
    </div>
  );
}

export function PaymentInstructions({
  instructions,
  accessToken,
  onRetry,
  retrying,
}: {
  instructions: StorefrontPaymentInstructionsResponse;
  accessToken: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { order, bank } = instructions;
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const isBankTransfer = order.paymentMethod === "bank_transfer";
  const isReady = isBankTransfer && order.bankhubStatus === "initialized" && bank && order.paymentDescription;
  const payment = usePaymentStatus({
    orderNumber: order.orderNumber,
    accessToken,
    initialStatus: {
      paymentStatus: order.paymentStatus,
      paidAmount: order.paidAmount,
      totalAmount: order.totalAmount,
      paidAt: null,
    },
    enabled: Boolean(isReady),
  });
  const outstanding = Math.max(payment.status.totalAmount - payment.status.paidAmount, 0);

  async function copy(value: string, kind: CopyKind) {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1500);
  }

  return (
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

          {!isBankTransfer ? (
            <p className="mt-8 border-y border-[#DEDEDE] py-7 text-on-surface-variant">
              Bạn thanh toán khi nhận hàng. Đội ngũ Phùng Thị sẽ liên hệ xác nhận đơn hàng.
            </p>
          ) : payment.isPaid ? (
            <PaidState orderNumber={order.orderNumber} totalAmount={payment.status.paidAmount} />
          ) : !isReady ? (
            <UnavailableState onRetry={onRetry} retrying={retrying} />
          ) : (
            <div className="mt-8 border-y border-[#DEDEDE] py-7">
              <h2 className="font-heading text-2xl uppercase text-brand-strong">Thông tin chuyển khoản</h2>
              <div className="mt-6 grid gap-8 sm:grid-cols-[220px_1fr]">
                {order.vietQrUrl ? (
                  <figure className="mx-auto w-full max-w-[260px] sm:mx-0">
                    <img
                      src={order.vietQrUrl}
                      alt={`Mã VietQR chuyển khoản cho đơn hàng ${order.orderNumber}`}
                      className="aspect-square w-full border border-[#DEDEDE] bg-white object-contain p-2"
                    />
                    <figcaption className="mt-2 text-center text-sm text-on-surface-variant">
                      Quét mã bằng ứng dụng ngân hàng
                    </figcaption>
                  </figure>
                ) : null}
                <dl className="space-y-4 text-on-surface">
                  <div>
                    <dt className="text-sm text-on-surface-variant">Ngân hàng</dt>
                    <dd className="mt-1 flex items-center gap-2 font-semibold">
                      {bank.bankLogoUrl ? (
                        <img src={bank.bankLogoUrl} alt="" className="h-6 w-auto" aria-hidden="true" />
                      ) : null}
                      {bank.bankName || bank.bankCode}
                      {bank.branchName ? (
                        <span className="font-normal text-on-surface-variant">— {bank.branchName}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Chủ tài khoản</dt>
                    <dd className="mt-1 font-semibold">{bank.bankAccountName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Số tài khoản</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-3 font-semibold">
                      {bank.bankAccountNumber}
                      <CopyButton value={bank.bankAccountNumber} kind="account" copied={copied} onCopy={copy} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Số tiền</dt>
                    <dd className="mt-1 font-semibold">{formatCurrency(outstanding)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-on-surface-variant">Nội dung chuyển khoản</dt>
                    <dd className="mt-1 flex flex-wrap items-center gap-3 font-semibold">
                      {order.paymentDescription}
                      <CopyButton value={order.paymentDescription!} kind="description" copied={copied} onCopy={copy} />
                    </dd>
                  </div>
                </dl>
              </div>

              <BankAppPicker orderNumber={order.orderNumber} accessToken={accessToken} />

              {payment.status.paidAmount > 0 ? (
                <p className="mt-6 text-sm text-on-surface">
                  Đã nhận {formatCurrency(payment.status.paidAmount)} — còn thiếu{" "}
                  <strong>{formatCurrency(outstanding)}</strong>.
                </p>
              ) : null}
              <p className="mt-6 text-sm text-on-surface-variant">
                Vui lòng giữ nguyên nội dung chuyển khoản để đơn hàng được xác nhận tự động.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
                {payment.expired ? (
                  <>
                    <span className="text-on-surface-variant">Chưa nhận được thanh toán.</span>
                    <Button type="button" variant="outline" size="sm" onClick={() => void payment.checkNow()} disabled={payment.checking}>
                      <RefreshCw className="size-4" aria-hidden="true" />
                      Kiểm tra lại
                    </Button>
                  </>
                ) : (
                  <span className="flex items-center gap-2 text-on-surface-variant">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Đang chờ xác nhận thanh toán…
                  </span>
                )}
              </div>
            </div>
          )}

          <Link className="mt-8 inline-flex text-sm font-semibold text-primary underline underline-offset-4" to="/products">
            Tiếp tục mua sắm
          </Link>
        </section>
      </Container>
    </main>
  );
}
