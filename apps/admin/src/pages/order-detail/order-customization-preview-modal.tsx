import { useState } from "react";
import { zipSync } from "fflate";
import { Button, Container, FocusModal, Heading, Text } from "@medusajs/ui";
import { ProductCustomizationPreview } from "@trophy/customization-react";
import type { CustomizationTemplate } from "@trophy/customization";

import type { AdminOrderDetail } from "../../lib/orders-client";
import { backendFetch } from "../../lib/fetch";
import type { OrderDetailItem } from "./order-detail-utils";

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
          widthPx:
            preview.templateSnapshot.canvasWidthPx ??
            item.background.widthPx ??
            900,
          heightPx:
            preview.templateSnapshot.canvasHeightPx ??
            item.background.heightPx ??
            900,
        }
      : null,
    layers: preview.templateSnapshot.layers,
    formFields: preview.templateSnapshot.formFields,
  };
}

function sanitizeFilenamePart(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "upload"
  );
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
    item.customization?.values.map((entry) => [entry.fieldId, entry.label]) ??
      [],
  );

  return Object.entries(values)
    .map(([fieldId, value]) => {
      if (
        !value ||
        typeof value !== "object" ||
        !("assetId" in value) ||
        "clipartAssetId" in value
      ) {
        return null;
      }

      return {
        fieldId,
        label: labelsByFieldId.get(fieldId) ?? fieldId,
        previewUrl: value.previewUrl,
      };
    })
    .filter(
      (
        entry,
      ): entry is { fieldId: string; label: string; previewUrl: string } =>
        entry !== null,
    );
}

async function fetchUploadBytes(previewUrl: string) {
  const url = previewUrl;
  const response =
    url.startsWith("blob:") || url.startsWith("data:")
      ? await fetch(url)
      : await backendFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download upload (${response.status})`);
  }

  const blob = await response.blob();
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    extension: extensionFromContentType(
      blob.type || response.headers.get("content-type") || "",
    ),
  };
}

export function OrderCustomizationPreviewModal({
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
      setDownloadError(
        error instanceof Error
          ? error.message
          : "Failed to download uploaded images.",
      );
    } finally {
      setIsDownloadingUploads(false);
    }
  }

  return (
    <FocusModal
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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
              <Button variant="secondary" size="small">
                Close
              </Button>
            </FocusModal.Close>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-y-1">
            <Heading level="h1">Customization preview</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {item.product?.title ?? "Unknown product"} ·{" "}
              {item.variant?.title ?? "Unknown variant"}
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
                  resolveFontUrl={(assetId) =>
                    `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/api/admin/brand-assets/fonts/file/${assetId}`
                  }
                  resolveStaticFontUrl={(fileName) =>
                    `${import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787"}/fonts/${fileName}`
                  }
                />
              </div>
              <aside className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5">
                <div className="flex flex-col gap-y-1">
                  <Heading level="h2">Submitted values</Heading>
                  <Text size="small" className="text-ui-fg-subtle">
                    Values are frozen from the customer order and cannot be
                    edited here.
                  </Text>
                </div>
                <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-y-1">
                      <Text
                        size="small"
                        className="font-medium text-ui-fg-base"
                      >
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
                    <div
                      key={entry.fieldId}
                      className="flex flex-col gap-y-1 py-3 first:pt-0 last:pb-0"
                    >
                      <Text
                        size="small"
                        className="font-medium text-ui-fg-subtle"
                      >
                        {entry.label}
                      </Text>
                      <Text
                        size="small"
                        className="break-words text-ui-fg-base"
                      >
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
                This order item does not have enough customization data to
                render a preview.
              </Text>
            </Container>
          )}
        </FocusModal.Body>
      </FocusModal.Content>
    </FocusModal>
  );
}
