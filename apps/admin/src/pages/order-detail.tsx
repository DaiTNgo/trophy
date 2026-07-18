import { useEffect, useState } from "react";
import { zipSync } from "fflate";
import { Link, useParams } from "react-router";
import {
  StatusBadge,
  Button,
  Container,
  FocusModal,
  Heading,
  Text,
  DropdownMenu,
  toast,
} from "@medusajs/ui";
import { ProductCustomizationPreview } from "@trophy/customization-react";
import type { CustomizationTemplate } from "@trophy/customization";
import { ArrowLeft, SquareTwoStack, EllipsisHorizontal, PencilSquare, ArrowPath, ShoppingCart, XMark } from "@medusajs/icons";
import {
  fetchAdminOrderDetail,
  formatAdminCurrency,
  formatAdminDate,
  formatStatusLabel,
  updateAdminOrderItemProductionStatus,
  updateAdminOrderStatus,
  type AdminOrderStatusUpdate,
  type AdminOrderDetail,
} from "../lib/orders-client";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { backendFetch } from "../lib/fetch";

type OrderDetailItem = AdminOrderDetail["items"][number];

function getBadgeColor(
  status: string,
): "green" | "red" | "blue" | "orange" | "grey" | "purple" {
  switch (status) {
    case "fulfilled":
    case "paid":
    case "ready":
      return "green";
    case "pending":
    case "unfulfilled":
    case "partially_fulfilled":
      return "orange";
    case "confirmed":
      return "blue";
    case "cancelled":
    case "failed":
    case "refunded":
      return "red";
    default:
      return "grey";
  }
}

function renderAddress(address: AdminOrderDetail["primaryAddress"]) {
  if (!address) {
    return "No address on record.";
  }

  return [
    address.line1,
    address.line2,
    address.city,
    address.province,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

function getPaidAmount(order: AdminOrderDetail) {
  return order.paymentStatus === "paid" ? order.totals.totalAmount : 0;
}

function getOutstandingAmount(order: AdminOrderDetail) {
  if (
    order.paymentStatus === "paid" ||
    order.paymentStatus === "refunded" ||
    order.paymentStatus === "cancelled"
  ) {
    return 0;
  }

  return order.totals.totalAmount;
}

function getPaymentNotice(order: AdminOrderDetail) {
  if (order.paymentStatus === "paid") {
    return "Manual payment has been marked as paid.";
  }

  if (order.paymentStatus === "failed") {
    return "Manual payment follow-up failed and needs operator review.";
  }

  if (order.paymentStatus === "refunded") {
    return "Payment has been refunded.";
  }

  if (order.paymentStatus === "cancelled") {
    return "Payment collection was cancelled with the order.";
  }

  return "Manual payment is pending operator follow-up.";
}

function getFulfillmentTitle(status: string) {
  if (status === "fulfilled") return "Fulfilled Items";
  if (status === "partially_fulfilled") return "Partially Fulfilled Items";
  return "Unfulfilled Items";
}

function getFulfillmentNotice(status: string) {
  if (status === "fulfilled") {
    return "All order items are marked fulfilled.";
  }

  if (status === "partially_fulfilled") {
    return "Some order items still need fulfillment follow-up.";
  }

  return "Order items are awaiting fulfillment.";
}

function getProductionSummary(items: OrderDetailItem[]) {
  const customItems = items.filter((item) => item.customization?.values.length);
  const pendingItems = items.filter((item) => item.productionStatus === "pending_review");

  if (customItems.length === 0) {
    return "No production review is required for plain order items.";
  }

  if (pendingItems.length > 0) {
    return `${pendingItems.length} customized item${pendingItems.length === 1 ? "" : "s"} pending production review.`;
  }

  return "Customized items are ready for production.";
}

function getCancelOrderUpdate(order: AdminOrderDetail): AdminOrderStatusUpdate {
  return {
    status: "cancelled",
    ...(order.paymentStatus === "pending" ? { paymentStatus: "cancelled" } : {}),
  };
}

function DisabledActionHint() {
  return (
    <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">
      Backend workflow not implemented yet
    </Text>
  );
}

function ActionHint({ children }: { children: string }) {
  return (
    <Text size="xsmall" className="px-2 py-1 text-ui-fg-muted">
      {children}
    </Text>
  );
}

function buildOrderItemCustomizationTemplate(
  order: AdminOrderDetail,
  item: OrderDetailItem,
): CustomizationTemplate | null {
  const preview = item.customization?.preview;
  if (!preview) {
    return null;
  }

  return {
    id: `order_${order.id}_item_${item.id}`,
    productId: item.product ? String(item.product.id) : `order_item_${item.id}`,
    name: `${item.product?.title ?? "Order item"} customization`,
    revision: 1,
    status: "published",
    background: item.background
      ? {
          assetId: item.background.assetId,
          previewUrl: item.background.previewUrl,
          filename: item.background.assetId,
          mimeType: "image/*",
          widthPx: preview.templateSnapshot.canvasWidthPx ?? item.background.widthPx ?? 900,
          heightPx: preview.templateSnapshot.canvasHeightPx ?? item.background.heightPx ?? 900,
        }
      : null,
    layers: preview.templateSnapshot.layers,
    formFields: preview.templateSnapshot.formFields,
  };
}

function sanitizeFilenamePart(value: string) {
  return value
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "upload";
}

function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  return "bin";
}

function getUploadedImageEntries(item: OrderDetailItem) {
  const values = item.customization?.preview?.values;
  if (!values) {
    return [];
  }

  const labelsByFieldId = new Map(
    item.customization?.values.map((entry) => [entry.fieldId, entry.label]) ?? [],
  );

  return Object.entries(values)
    .map(([fieldId, value]) => {
      if (!value || typeof value !== "object" || !("assetId" in value) || "clipartAssetId" in value) {
        return null;
      }

      return {
        fieldId,
        label: labelsByFieldId.get(fieldId) ?? fieldId,
        previewUrl: value.previewUrl,
      };
    })
    .filter((entry): entry is { fieldId: string; label: string; previewUrl: string } => entry !== null);
}

async function fetchUploadBytes(previewUrl: string) {
  const url = previewUrl;
  const response = url.startsWith("blob:") || url.startsWith("data:")
    ? await fetch(url)
    : await backendFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download upload (${response.status})`);
  }

  const blob = await response.blob();
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    extension: extensionFromContentType(blob.type || response.headers.get("content-type") || ""),
  };
}

function OrderCustomizationPreviewModal({
  order,
  item,
  onClose,
}: {
  order: AdminOrderDetail;
  item: OrderDetailItem;
  onClose: () => void;
}) {
  const template = buildOrderItemCustomizationTemplate(order, item);
  const preview = item.customization?.preview;
  const uploadedImages = getUploadedImageEntries(item);
  const [isDownloadingUploads, setIsDownloadingUploads] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  async function downloadUploadedImages() {
    setIsDownloadingUploads(true);
    setDownloadError("");

    try {
      const zipFiles: Record<string, Uint8Array> = {};
      for (const [index, upload] of uploadedImages.entries()) {
        const { bytes, extension } = await fetchUploadBytes(upload.previewUrl);
        const filename = [
          sanitizeFilenamePart(order.orderNumber),
          `item-${item.id}`,
          `${String(index + 1).padStart(2, "0")}-${sanitizeFilenamePart(upload.label)}`,
        ].join("-");
        zipFiles[`${filename}.${extension}`] = bytes;
      }

      const zipBytes = zipSync(zipFiles);
      const blob = new Blob([zipBytes], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${sanitizeFilenamePart(order.orderNumber)}-item-${item.id}-uploads.zip`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Failed to download uploaded images.");
    } finally {
      setIsDownloadingUploads(false);
    }
  }

  return (
    <FocusModal open={Boolean(item)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <FocusModal.Content>
        <FocusModal.Header>
          <div className="flex flex-1 items-center justify-between gap-x-2">
            <FocusModal.Title asChild>
              <Heading level="h2">Customization preview</Heading>
            </FocusModal.Title>
            <FocusModal.Description className="sr-only">
              Read-only preview of the frozen order customization snapshot.
            </FocusModal.Description>
            <FocusModal.Close asChild>
              <Button variant="secondary" size="small">Close</Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-y-1">
            <Heading level="h1">Customization preview</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {item.product?.title ?? "Unknown product"} · {item.variant?.title ?? "Unknown variant"}
            </Text>
          </div>

          {template && preview ? (
            <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-[560px] overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle">
                <ProductCustomizationPreview
                  template={template}
                  values={preview.values}
                  readOnly
                  selectedVariantId={item.variant?.id ?? null}
                  resolveFontUrl={(assetId) => `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/api/admin/brand-assets/fonts/file/${assetId}`}
                  resolveStaticFontUrl={(fileName) => `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/fonts/${fileName}`}
                />
              </div>
              <aside className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5">
                <div className="flex flex-col gap-y-1">
                  <Heading level="h2">Submitted values</Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Values are frozen from the customer order and cannot be edited here.
                  </Text>
                </div>
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-y-1">
                      <Text size="small" className="font-medium text-ui-fg-base">
                        Uploaded images
                      </Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {uploadedImages.length
                          ? `${uploadedImages.length} customer upload${uploadedImages.length === 1 ? "" : "s"} available for print.`
                          : "No customer-uploaded images in this item."}
                      </Text>
                    </div>
                    <Button
                      variant="secondary"
                      size="small"
                      disabled={!uploadedImages.length || isDownloadingUploads}
                      isLoading={isDownloadingUploads}
                      onClick={() => void downloadUploadedImages()}
                    >
                      Download uploads
                    </Button>
                    {downloadError ? (
                      <Text size="xsmall" className="text-ui-fg-error">
                        {downloadError}
                      </Text>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-col divide-y divide-ui-border-base">
                  {item.customization?.values.map((entry) => (
                    <div key={entry.fieldId} className="flex flex-col gap-y-1 py-3 first:pt-0 last:pb-0">
                      <Text size="small" className="font-medium text-ui-fg-subtle">
                        {entry.label}
                      </Text>
                      <Text size="small" className="break-words text-ui-fg-base">
                        {entry.valueSummary}
                      </Text>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          ) : (
            <Container>
              <Text size="small" className="text-ui-fg-subtle">
                This order item does not have enough customization data to render a preview.
              </Text>
            </Container>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (orderNumber) {
      setBreadcrumbs([
        { label: "Orders", path: "/orders" },
        { label: `#${orderNumber}` }
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [orderNumber, setBreadcrumbs]);

  const [order, setOrder] = useState<AdminOrderDetail | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState<OrderDetailItem | null>(null);
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      return;
    }

    let cancelled = false;
    fetchAdminOrderDetail(orderNumber)
      .then((value) => {
        if (!cancelled) {
          setOrder(value);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load order detail",
          );
          setOrder(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  if (order === undefined) {
    return (
      <Container>
        <Text size="small" className="text-ui-fg-muted">
          Loading order…
        </Text>
      </Container>
    );
  }

  if (!order || error) {
    return (
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center gap-x-2">
          <Link
            to="/orders"
            className="text-ui-fg-subtle hover:text-ui-fg-base text-small transition-colors"
          >
            Orders
          </Link>
          <Text size="small" className="text-ui-fg-muted">
            ›
          </Text>
          <Text size="small" className="text-ui-fg-muted">
            Error
          </Text>
        </div>
        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">Order not found</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  {error ||
                    "The requested order is not available in the backend queue."}
                </Text>
              </div>
              <Button variant="secondary" size="small" asChild>
                <Link to="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  const currentOrder = order;
  const paidAmount = getPaidAmount(currentOrder);
  const outstandingAmount = getOutstandingAmount(order);
  const fulfillmentTitle = getFulfillmentTitle(order.fulfillmentStatus);
  const fulfillmentNotice = getFulfillmentNotice(order.fulfillmentStatus);
  const productionSummary = getProductionSummary(order.items);
  const hasPendingPayment = order.paymentStatus === "pending";
  const hasProductionReviewItems = order.items.some((item) => item.customization?.values.length);
  const hasPendingProductionReview = order.items.some((item) => item.productionStatus === "pending_review");

  async function updateOrderStatus(payload: AdminOrderStatusUpdate, successMessage: string, actionId: string) {
    setUpdatingAction(actionId);
    try {
      const nextOrder = await updateAdminOrderStatus(currentOrder.orderNumber, payload);
      setOrder(nextOrder);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setUpdatingAction(null);
    }
  }

  async function updateOrderItemProductionStatus(itemId: number, actionId: string) {
    setUpdatingAction(actionId);
    try {
      const nextOrder = await updateAdminOrderItemProductionStatus(currentOrder.orderNumber, itemId, {
        productionStatus: "ready",
      });
      setOrder(nextOrder);
      toast.success("Item marked ready for production");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update production status");
    } finally {
      setUpdatingAction(null);
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column - Main Content */}
        <div className="flex flex-col gap-y-4">
          {/* Header Card */}
          <Container className="p-0">
            <div className="flex items-center justify-between p-6">
              <div className="flex flex-col gap-y-2">
                <div className="flex items-center gap-x-2">
                  <Heading level="h1">#{order.orderNumber}</Heading>
                  <Button
                    variant="transparent"
                    size="small"
                    className="p-1 h-auto"
                  >
                    <SquareTwoStack className="h-4 w-4 text-ui-fg-muted" />
                  </Button>
                </div>
                <Text size="small" className="text-ui-fg-subtle">
                  {formatAdminDate(order.createdAt)}
                </Text>
              </div>
              <div className="flex items-center gap-x-3">
                <StatusBadge color={getBadgeColor(order.paymentStatus)}>
                  {formatStatusLabel(order.paymentStatus)}
                </StatusBadge>
                <StatusBadge
                  color={getBadgeColor(order.fulfillmentStatus)}
                >
                  {formatStatusLabel(order.fulfillmentStatus)}
                </StatusBadge>
                <StatusBadge color={getBadgeColor(order.status)}>
                  {formatStatusLabel(order.status)}
                </StatusBadge>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="transparent" size="small" className="p-1">
                      <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item
                      disabled={order.status === "cancelled" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus(getCancelOrderUpdate(order), "Order cancelled", "cancel-order")}
                    >
                      <XMark className="mr-2 h-4 w-4" />
                      Cancel order
                    </DropdownMenu.Item>
                    <ActionHint>
                      Pending manual payment is cancelled with the order; settled payments stay separate.
                    </ActionHint>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
          </Container>

          {/* Summary (Line Items) */}
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Summary</Heading>
              <div className="flex items-center gap-x-3">
                <Text size="small" className="text-ui-fg-subtle">
                  Immutable order item snapshots
                </Text>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="transparent" size="small" className="p-1">
                      <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item disabled>
                      <PencilSquare className="mr-2 h-4 w-4" />
                      Edit order
                    </DropdownMenu.Item>
                    <DisabledActionHint />
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex flex-col gap-y-0 p-6">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-y-3 py-4 border-b border-ui-border-base last:border-0 last:pb-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-x-4">
                      <div className="h-10 w-8 bg-ui-bg-subtle rounded flex items-center justify-center border border-ui-border-base shrink-0 overflow-hidden">
                        <ShoppingCart className="h-4 w-4 text-ui-fg-muted" />
                      </div>
                      <div className="flex flex-col gap-y-0.5">
                        <Text
                          size="small"
                          className="font-medium text-ui-fg-base"
                        >
                          {item.product?.title ?? "Unknown product"}
                        </Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {item.variant?.title ?? "Unknown variant"}
                        </Text>
                        {item.variant?.sku && (
                          <Text
                            size="xsmall"
                            className="text-ui-fg-muted mt-1 font-mono"
                          >
                            {item.variant.sku}
                          </Text>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-x-6 text-ui-fg-muted">
                      <Text size="small">
                        {formatAdminCurrency(
                          item.lineSubtotalAmount,
                          order.totals.currencyCode,
                        )}
                      </Text>
                      <Text size="small">{item.quantity}x</Text>
                      <StatusBadge color="green">
                        Allocated
                      </StatusBadge>
                      <Text
                        size="small"
                        className="font-medium text-ui-fg-base w-16 text-right"
                      >
                        {formatAdminCurrency(
                          item.lineSubtotalAmount,
                          order.totals.currencyCode,
                        )}
                      </Text>
                    </div>
                  </div>

                  {/* Production Ticket (Customization) */}
                  {item.customization?.values.length ? (
                    <div className="ml-12 mt-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-ui-border-base">
                        <Text
                          size="xsmall"
                          className="font-medium text-ui-fg-base uppercase tracking-wider"
                        >
                          Production Ticket
                        </Text>
                        <StatusBadge
                          color={getBadgeColor(item.productionStatus)}
                        >
                          {formatStatusLabel(item.productionStatus)}
                        </StatusBadge>
                      </div>
                      <div className="flex flex-col gap-y-1.5">
                        {item.customization.values.map((entry) => (
                          <div key={entry.fieldId} className="flex gap-x-2">
                            <Text
                              size="xsmall"
                              className="font-medium text-ui-fg-subtle w-24 shrink-0"
                            >
                              {entry.label}
                            </Text>
                            <Text
                              size="xsmall"
                              className="text-ui-fg-base break-words font-medium"
                            >
                              {entry.valueSummary}
                            </Text>
                          </div>
                        ))}
                      </div>
                      {item.customization.preview ? (
                        <div className="mt-3 border-t border-ui-border-base pt-3">
                          <Button
                            variant="secondary"
                            size="small"
                            onClick={() => setPreviewItem(item)}
                          >
                            Preview
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {!item.customization?.values.length ? (
                    <div className="ml-12 mt-1 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col gap-y-0.5">
                          <Text
                            size="xsmall"
                            className="font-medium uppercase tracking-wider text-ui-fg-base"
                          >
                            Production Ticket
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            Plain item snapshot; no customization review is required.
                          </Text>
                        </div>
                        <StatusBadge color={getBadgeColor(item.productionStatus)}>
                          {formatStatusLabel(item.productionStatus)}
                        </StatusBadge>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-ui-border-base flex flex-col gap-y-3">
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Item Subtotal
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  {formatAdminCurrency(
                    order.totals.subtotalAmount,
                    order.totals.currencyCode,
                  )}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text
                  size="small"
                  className="text-ui-fg-subtle flex items-center gap-x-1"
                >
                  Shipping Subtotal <span className="text-ui-fg-muted">›</span>
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  Included in manual follow-up
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="small" className="text-ui-fg-subtle">
                  Tax Total
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  Included in manual follow-up
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-base">
                  Order Total
                </Text>
                <Text size="small" className="font-medium text-ui-fg-base">
                  {formatAdminCurrency(
                    order.totals.totalAmount,
                    order.totals.currencyCode,
                  )}
                </Text>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-ui-border-base border-dashed">
                <Text size="small" className="text-ui-fg-subtle">
                  Paid Total
                </Text>
                <Text size="small" className="text-ui-fg-base">
                  {formatAdminCurrency(paidAmount, order.totals.currencyCode)}
                </Text>
              </div>
              <div className="flex items-center justify-between">
                <Text size="small" className="font-medium text-ui-fg-base">
                  Outstanding amount
                </Text>
                <Text size="small" className="font-medium text-ui-fg-base">
                  {formatAdminCurrency(
                    outstandingAmount,
                    order.totals.currencyCode,
                  )}
                </Text>
              </div>
            </div>
          </Container>

          {/* Payments */}
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Payments</Heading>
              <div className="flex items-center gap-x-3">
                <StatusBadge color={getBadgeColor(order.paymentStatus)}>
                  {formatStatusLabel(order.paymentStatus)}
                </StatusBadge>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="transparent" size="small" className="p-1">
                      <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item
                      disabled={order.paymentStatus === "paid" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ paymentStatus: "paid" }, "Payment marked as paid", "payment-paid")}
                    >
                      Mark as paid
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={order.paymentStatus === "failed" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ paymentStatus: "failed" }, "Payment marked as failed", "payment-failed")}
                    >
                      Mark as failed
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={order.paymentStatus === "refunded" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ paymentStatus: "refunded" }, "Payment marked as refunded", "payment-refunded")}
                    >
                      Refund payment
                    </DropdownMenu.Item>
                    <ActionHint>
                      Manual payment state is tracked on the order record.
                    </ActionHint>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-y-0.5">
                  <Text size="small" className="text-ui-fg-base">
                    #PAY_DEFAULT
                  </Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {formatAdminDate(order.createdAt)}
                  </Text>
                </div>
                <div className="flex items-center gap-x-6">
                  <Text size="small" className="text-ui-fg-subtle">
                    {formatStatusLabel(order.paymentMethod)}
                  </Text>
                  <StatusBadge color={getBadgeColor(order.paymentStatus)}>
                    {formatStatusLabel(order.paymentStatus)}
                  </StatusBadge>
                  <Text
                    size="small"
                    className="text-ui-fg-base w-16 text-right"
                  >
                    {formatAdminCurrency(
                      order.totals.totalAmount,
                      order.totals.currencyCode,
                    )}
                  </Text>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                <div className="flex items-center gap-x-2 text-ui-fg-subtle">
                  <ArrowPath className="h-4 w-4" />
                  <Text size="small">{getPaymentNotice(order)}</Text>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  disabled={!hasPendingPayment || Boolean(updatingAction)}
                  isLoading={updatingAction === "payment-paid-inline"}
                  onClick={() => void updateOrderStatus({ paymentStatus: "paid" }, "Payment marked as paid", "payment-paid-inline")}
                >
                  {hasPendingPayment ? "Mark as paid" : "No payment action"}
                </Button>
              </div>

              <div className="flex flex-col gap-y-2 mt-2">
                <div className="flex items-center justify-between">
                  <Text size="small" className="text-ui-fg-subtle">
                    Total paid by customer
                  </Text>
                  <Text size="small" className="text-ui-fg-base">
                    {formatAdminCurrency(paidAmount, order.totals.currencyCode)}
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text size="small" className="font-medium text-ui-fg-base">
                    Outstanding amount
                  </Text>
                  <Text size="small" className="font-medium text-ui-fg-base">
                    {formatAdminCurrency(
                      outstandingAmount,
                      order.totals.currencyCode,
                    )}
                  </Text>
                </div>
              </div>
            </div>
          </Container>

          {/* Fulfillment */}
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">{fulfillmentTitle}</Heading>
              <div className="flex items-center gap-x-3">
                <StatusBadge color={getBadgeColor(order.fulfillmentStatus)}>
                  {formatStatusLabel(order.fulfillmentStatus)}
                </StatusBadge>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="transparent" size="small" className="p-1">
                      <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item
                      disabled={order.fulfillmentStatus === "fulfilled" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ fulfillmentStatus: "fulfilled" }, "Order marked fulfilled", "fulfillment-fulfilled")}
                    >
                      Fulfill order
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={order.fulfillmentStatus === "partially_fulfilled" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ fulfillmentStatus: "partially_fulfilled" }, "Order marked partially fulfilled", "fulfillment-partial")}
                    >
                      Mark partially fulfilled
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      disabled={order.fulfillmentStatus === "unfulfilled" || Boolean(updatingAction)}
                      onClick={() => void updateOrderStatus({ fulfillmentStatus: "unfulfilled" }, "Order marked unfulfilled", "fulfillment-unfulfilled")}
                    >
                      Mark unfulfilled
                    </DropdownMenu.Item>
                    <ActionHint>
                      Fulfillment state is tracked at order level until shipment records exist.
                    </ActionHint>
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>
            <div className="border-b border-ui-border-base px-6 py-3">
              <Text size="small" className="text-ui-fg-subtle">
                {fulfillmentNotice}
              </Text>
            </div>
            <div className="p-6">
              {order.items.map((item) => (
                <div
                  key={`unfulfilled-${item.id}`}
                  className="flex items-start justify-between gap-4 py-3 border-b border-ui-border-base last:border-0 last:pb-0 first:pt-0"
                >
                  <div className="flex items-start gap-x-4">
                    <div className="h-10 w-8 bg-ui-bg-subtle rounded flex items-center justify-center border border-ui-border-base shrink-0 overflow-hidden">
                      <ShoppingCart className="h-4 w-4 text-ui-fg-muted" />
                    </div>
                    <div className="flex flex-col gap-y-0.5">
                      <Text
                        size="small"
                        className="font-medium text-ui-fg-base"
                      >
                        {item.product?.title ?? "Unknown product"}
                      </Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        {item.variant?.title ?? "Unknown variant"}{" "}
                        <SquareTwoStack className="inline ml-1 h-3 w-3 text-ui-fg-muted" />
                      </Text>
                    </div>
                  </div>

                  <div className="flex items-center gap-x-6 text-ui-fg-muted mt-2">
                    <Text size="small">
                      {formatAdminCurrency(
                        item.lineSubtotalAmount,
                        order.totals.currencyCode,
                      )}
                    </Text>
                    <Text size="small">{item.quantity}x</Text>
                      <Text
                        size="small"
                        className="font-medium text-ui-fg-base w-16 text-right"
                      >
                        {formatAdminCurrency(
                          item.lineSubtotalAmount,
                          order.totals.currencyCode,
                        )}
                      </Text>
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </div>

        {/* Right Column - Sidebar */}
        <aside className="flex flex-col gap-y-4">
          {/* Customer */}
          <Container className="p-0">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Customer</Heading>
              <div className="flex items-center gap-x-3">
                <Text size="small" className="text-ui-fg-subtle">
                  Order address snapshot
                </Text>
                <DropdownMenu>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="transparent" size="small" className="p-1">
                      <EllipsisHorizontal className="h-5 w-5 text-ui-fg-muted" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end">
                    <DropdownMenu.Item disabled>Edit contact</DropdownMenu.Item>
                    <DropdownMenu.Item disabled>Edit shipping address</DropdownMenu.Item>
                    <DropdownMenu.Item disabled>Edit billing address</DropdownMenu.Item>
                    <DisabledActionHint />
                  </DropdownMenu.Content>
                </DropdownMenu>
              </div>
            </div>

            <div className="p-6 flex flex-col gap-y-6">
              <div className="flex items-center gap-x-3">
                <div className="h-8 w-8 rounded-full bg-ui-bg-component flex items-center justify-center border border-ui-border-base">
                  <Text size="small" className="font-medium text-ui-fg-subtle">
                    {order.customer.name.charAt(0).toUpperCase()}
                  </Text>
                </div>
                <Text size="small" className="text-ui-fg-base">
                  {order.customer.name}
                </Text>
              </div>

              <div className="flex flex-col gap-y-4">
                <div className="flex items-start justify-between">
                  <Text size="small" className="text-ui-fg-subtle font-medium">
                    Contact
                  </Text>
                  <div className="flex flex-col items-end gap-y-1">
                    <div className="flex items-center gap-x-2 group">
                      <Text size="small" className="text-ui-fg-base">
                        {order.customer.email ?? "No email"}
                      </Text>
                      <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                    </div>
                    {order.customer.phone && (
                      <div className="flex items-center gap-x-2 group">
                        <Text size="small" className="text-ui-fg-base">
                          {order.customer.phone}
                        </Text>
                        <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between">
                  <Text size="small" className="text-ui-fg-subtle font-medium">
                    Shipping address
                  </Text>
                  <div className="flex gap-x-2 group max-w-[60%]">
                    <Text size="small" className="text-ui-fg-base text-right">
                      {order.shippingAddress ? (
                        <>
                          {order.shippingAddress.recipientName}
                          <br />
                          {renderAddress(order.shippingAddress.address)}
                        </>
                      ) : (
                        renderAddress(order.primaryAddress)
                      )}
                    </Text>
                    <SquareTwoStack className="h-3 w-3 text-ui-fg-muted opacity-0 group-hover:opacity-100 cursor-pointer mt-1 shrink-0" />
                  </div>
                </div>

                <div className="flex items-start justify-between pt-4 border-t border-ui-border-base">
                  <Text size="small" className="text-ui-fg-subtle font-medium">
                    Billing address
                  </Text>
                  <Text size="small" className="text-ui-fg-muted text-right">
                    Same as shipping address
                  </Text>
                </div>
              </div>
            </div>
          </Container>

          {/* Production */}
          <Container className="p-0">
            <div className="flex items-center justify-between border-b border-ui-border-base px-6 py-4">
              <Heading level="h2">Production</Heading>
              <StatusBadge
                color={
                  hasPendingProductionReview
                    ? "orange"
                    : hasProductionReviewItems
                      ? "green"
                      : "grey"
                }
              >
                {hasPendingProductionReview
                  ? "Pending review"
                  : hasProductionReviewItems
                    ? "Ready"
                    : "No review"}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-y-3 p-6">
              <Text size="small" className="text-ui-fg-subtle">
                {productionSummary}
              </Text>
              <div className="flex flex-col divide-y divide-ui-border-base rounded-lg border border-ui-border-base">
                {order.items.map((item) => (
                  <div key={`production-${item.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0">
                      <Text size="small" className="truncate text-ui-fg-base">
                        {item.product?.title ?? "Unknown product"}
                      </Text>
                      <Text size="xsmall" className="truncate text-ui-fg-subtle">
                        {item.variant?.title ?? "Unknown variant"}
                      </Text>
                    </div>
                    <StatusBadge color={getBadgeColor(item.productionStatus)}>
                      {formatStatusLabel(item.productionStatus)}
                    </StatusBadge>
                    {item.productionStatus === "pending_review" ? (
                      <Button
                        variant="secondary"
                        size="small"
                        disabled={Boolean(updatingAction)}
                        onClick={() =>
                          void updateOrderItemProductionStatus(
                            item.id,
                            `production-ready-${item.id}`,
                          )
                        }
                      >
                        Mark ready
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Container>

          {/* Activity */}
          <Container className="p-0">
            <div className="px-6 py-4 border-b border-ui-border-base">
              <Heading level="h2">Activity</Heading>
            </div>
            <div className="p-6 flex flex-col gap-y-4">
              <div className="relative pl-6">
                <div className="absolute top-2 left-1.5 h-2 w-2 rounded-full bg-ui-fg-muted"></div>
                <div className="absolute top-4 left-2 h-full w-px bg-ui-border-base"></div>
                <div className="flex flex-col gap-y-0.5">
                  <div className="flex items-center justify-between">
                    <Text size="small" className="font-medium text-ui-fg-base">
                      {order.paymentStatus === "paid" ? "Payment marked paid" : "Awaiting manual payment"}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {formatAdminDate(order.updatedAt)}
                    </Text>
                  </div>
                  <Text size="small" className="text-ui-fg-muted">
                    {formatAdminCurrency(
                      order.totals.totalAmount,
                      order.totals.currencyCode,
                    )}
                  </Text>
                </div>
              </div>

              <div className="relative pl-6">
                <div className="absolute top-2 left-1.5 h-2 w-2 rounded-full bg-ui-fg-muted ring-2 ring-ui-bg-base"></div>
                <div className="flex flex-col gap-y-0.5">
                  <div className="flex items-center justify-between">
                    <Text size="small" className="font-medium text-ui-fg-base">
                      Order placed
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {formatAdminDate(order.createdAt)}
                    </Text>
                  </div>
                  <Text size="small" className="text-ui-fg-muted">
                    {formatAdminCurrency(
                      order.totals.totalAmount,
                      order.totals.currencyCode,
                    )}
                  </Text>
                </div>
              </div>
            </div>
          </Container>
        </aside>
      </div>
      {previewItem ? (
        <OrderCustomizationPreviewModal
          order={order}
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      ) : null}
    </div>
  );
}
