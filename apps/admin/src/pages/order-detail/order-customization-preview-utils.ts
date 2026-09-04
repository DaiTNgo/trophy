import { type CustomizationTemplate } from "@trophy/customization";
import type { AdminOrderDetail } from "../../lib/orders-client";
import { backendFetch } from "../../lib/fetch";
import type { OrderDetailItem } from "./order-detail-utils";

export function buildOrderItemCustomizationTemplate(
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

export function sanitizeFilenamePart(value: string) {
  return (
    value
      .trim()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "upload"
  );
}

export function extensionFromContentType(contentType: string) {
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  if (contentType.includes("pdf")) return "pdf";
  return "bin";
}

export function getUploadedImageEntries(item: OrderDetailItem) {
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
        assetId: value.assetId,
      };
    })
    .filter(
      (
        entry,
      ): entry is { fieldId: string; label: string; previewUrl: string; assetId: string } =>
        entry !== null,
    );
}

export function fontVariantLabel(isBold: boolean, isItalic: boolean) {
  if (isBold && isItalic) return "Bold italic";
  if (isBold) return "Bold";
  if (isItalic) return "Italic";
  return "Regular";
}

export function textPathLabel(type: string) {
  return (
    {
      straight: "Straight",
      arc_up: "Arc up",
      arc_down: "Arc down",
      circle_top: "Circle top",
      circle_bottom: "Circle bottom",
      closed_ellipse: "Closed ellipse",
      custom: "Custom path",
    }[type] ?? type
  );
}

export function formatCanvasPosition(value: number, canvasSize: number) {
  return `${Math.round(value * canvasSize)} px`;
}

export async function fetchUploadBytes(previewUrl: string) {
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

