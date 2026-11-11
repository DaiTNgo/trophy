import { Button, Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import { ArrowPath } from "@medusajs/icons";
import {
  formatAdminCurrency,
  formatAdminDate,
  formatStatusLabel,
  type AdminOrderDetail,
} from "../../lib/orders-client";

function bankhubBadgeColor(status: string): "green" | "red" | "orange" | "grey" {
  switch (status) {
    case "initialized":
      return "green";
    case "failed":
      return "red";
    case "pending":
      return "orange";
    default:
      return "grey";
  }
}

function matchStatusColor(status: string): "green" | "red" | "orange" | "grey" {
  if (status === "matched") return "green";
  if (status === "unmatched") return "red";
  if (status === "order_not_payable") return "orange";
  return "grey";
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-x-4 py-1.5">
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="small" className="min-w-0 break-words text-ui-fg-base">
        {children}
      </Text>
    </div>
  );
}

export function OrderBankhubSection({
  order,
  updatingAction,
  onInitialize,
}: {
  order: AdminOrderDetail;
  updatingAction: string | null;
  onInitialize: () => Promise<void>;
}) {
  if (order.paymentMethod !== "bank_transfer") return null;

  const { payment } = order;
  const canInitialize =
    order.status !== "cancelled" &&
    order.paymentStatus === "pending" &&
    payment.bankhubStatus !== "initialized";
  const currency = order.totals.currencyCode;

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between border-b border-ui-border-base px-6 py-4">
        <Heading level="h2">Bank transfer (BankHub)</Heading>
        <StatusBadge color={bankhubBadgeColor(payment.bankhubStatus)}>
          {formatStatusLabel(payment.bankhubStatus)}
        </StatusBadge>
      </div>

      <div className="flex flex-col gap-y-4 p-6">
        <div className="flex flex-col">
          <DetailRow label="Transfer description">{payment.paymentDescription ?? "—"}</DetailRow>
          <DetailRow label="Beneficiary">
            {payment.bank
              ? `${payment.bank.bankName || payment.bank.bankCode} · ${payment.bank.bankAccountNumber} · ${payment.bank.bankAccountName}`
              : "—"}
          </DetailRow>
          <DetailRow label="Initialized">
            {payment.bankhubInitializedAt ? formatAdminDate(payment.bankhubInitializedAt) : "—"}
          </DetailRow>
          <DetailRow label="Received">
            {formatAdminCurrency(payment.paidAmount, currency)} / {formatAdminCurrency(order.totals.totalAmount, currency)}
            {payment.paidAt ? ` · paid ${formatAdminDate(payment.paidAt)}` : ""}
          </DetailRow>
        </div>

        {payment.bankhubStatus === "not_configured" ? (
          <Text size="small" className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 text-ui-fg-subtle">
            BankHub is not configured. A super-admin must set the JETPAY env and enable Settings → Payments.
          </Text>
        ) : null}
        {payment.bankhubLastError ? (
          <Text size="small" className="rounded-lg border border-ui-border-error bg-ui-bg-subtle p-3 text-ui-fg-error">
            {payment.bankhubLastError}
          </Text>
        ) : null}

        {canInitialize ? (
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="small"
              disabled={Boolean(updatingAction)}
              isLoading={updatingAction === "bankhub-initialize"}
              onClick={() => void onInitialize()}
            >
              <ArrowPath className="h-4 w-4" />
              Re-initialize BankHub
            </Button>
          </div>
        ) : null}

        <div className="flex flex-col gap-y-2">
          <Text size="small" weight="plus" className="text-ui-fg-base">
            Received transactions
          </Text>
          {payment.transactions.length === 0 ? (
            <Text size="small" className="text-ui-fg-muted">
              No bank transfers received yet.
            </Text>
          ) : (
            <div className="divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
              {payment.transactions.map((transaction) => (
                <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-y-0.5">
                    <Text size="small" className="text-ui-fg-base">
                      {transaction.transId}
                      {transaction.bankTransId ? (
                        <span className="text-ui-fg-muted"> · bank {transaction.bankTransId}</span>
                      ) : null}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">
                      {formatAdminDate(transaction.transTime ?? transaction.createdAt)} ·{" "}
                      {transaction.confirmType === 2 ? "Manual confirm" : "Auto confirm"}
                      {transaction.description ? ` · ${transaction.description}` : ""}
                    </Text>
                  </div>
                  <div className="flex items-center gap-x-3">
                    <StatusBadge color={matchStatusColor(transaction.matchStatus)}>
                      {formatStatusLabel(transaction.matchStatus)}
                    </StatusBadge>
                    <Text size="small" className="text-ui-fg-base">
                      {formatAdminCurrency(transaction.amount, currency)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Container>
  );
}
