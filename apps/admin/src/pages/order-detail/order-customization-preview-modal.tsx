import { useMemo, useState } from "react";
import { zipSync } from "fflate";
import { Button, Container, FocusModal, Heading, Text } from "@medusajs/ui";
import { ProductCustomizationPreview, useBrowserTextMeasure } from "@trophy/customization-react";
import {
  buildDesignFromForm,
  DEFAULT_FONT_FAMILY_OPTIONS,
  FONT_FILES,
  resolveFont,
  resolveFontVariant,
  resolveLocalizedInput,
  type DynamicFontFamily,
} from "@trophy/customization";

import { useBrandAssets } from "../../hooks/use-brand-assets";
import type { AdminOrderDetail } from "../../lib/orders-client";
import { exportRasterPreviewClientSide, rasterExportExtension, type RasterExportFormat } from "../../lib/raster-export";
import { buildOrderItemCustomizationTemplate, fetchUploadBytes, fontVariantLabel, formatCanvasPosition, getUploadedImageEntries, textPathLabel, sanitizeFilenamePart } from "./order-customization-preview-utils";
import type { OrderDetailItem } from "./order-detail-utils";
import { BACKEND_URL } from "../../lib/fetch";
















export function OrderCustomizationPreviewModal({
  order,
  item,
  isUpdating,
  onMarkItemReady,
  onMarkItemPendingReview,
  onClose,
}: {
  order: AdminOrderDetail;
  item: OrderDetailItem;
  isUpdating: boolean;
  onMarkItemReady: (itemId: number, actionId: string) => Promise<void>;
  onMarkItemPendingReview: (itemId: number, actionId: string) => Promise<void>;
  onClose: () => void;
}) {
  const template = buildOrderItemCustomizationTemplate(order, item);
  const preview = item.customization?.preview;
  const { fonts } = useBrandAssets();
  const dynamicFonts = useMemo<DynamicFontFamily[]>(
    () =>
      fonts.map((font) => ({
        id: font.id,
        name: font.name,
        regularAssetId: font.regularAssetId ?? null,
        boldAssetId: font.boldAssetId ?? null,
        italicAssetId: font.italicAssetId ?? null,
        boldItalicAssetId: font.boldItalicAssetId ?? null,
      })),
    [fonts],
  );
  // Derive all font variant IDs that need @font-face rules for measurement.
  // Mirrors the font-ID resolution in ProductCustomizationPreview.
  const fontPreviewIds = useMemo(() => {
    if (!template) return [];
    return Array.from(
      new Set(
        [
          ...template.layers.flatMap((layer) => {
            if (layer.type !== "text") return [];
            const { fontPolicy } = layer.text;
            const families =
              fontPolicy.mode === "fixed"
                ? [fontPolicy.fontId]
                : [
                    fontPolicy.defaultFontId,
                    ...fontPolicy.options.map((opt) => opt.value),
                  ];
            return families.flatMap((f) => [
              resolveFontVariant(f, false, false, dynamicFonts),
              resolveFontVariant(f, true, false, dynamicFonts),
              resolveFontVariant(f, false, true, dynamicFonts),
              resolveFontVariant(f, true, true, dynamicFonts),
            ]);
          }),
          ...dynamicFonts.flatMap((font) => [
            font.regularAssetId,
            font.boldAssetId,
            font.italicAssetId,
            font.boldItalicAssetId,
          ]),
        ].filter(Boolean) as string[],
      ),
    );
  }, [dynamicFonts, template]);
  const { measureText } = useBrowserTextMeasure(fontPreviewIds);
  const productionTextSpecs = useMemo(() => {
    if (!template || !preview) return [];

    const fontNames = new Map<string, string>();
    for (const font of DEFAULT_FONT_FAMILY_OPTIONS) {
      fontNames.set(font.value, resolveLocalizedInput(font.label));
    }
    for (const font of dynamicFonts) {
      fontNames.set(font.id, font.name);
    }
    const design = buildDesignFromForm({
      template,
      values: preview.values,
      designId: `order_${order.id}_item_${item.id}_production`,
      measureText,
      dynamicFonts,
    });

    return design.layers
      .filter((layer) => layer.type === "text")
      .map((layer) => {
        const sourceLayer = template.layers.find(
          (entry) => entry.id === layer.layerId,
        );
        const field = template.formFields.find(
          (entry) => entry.layerId === layer.layerId,
        );
        const fieldValue = field ? preview.values[field.id] : null;
        const fontFamilyId =
          sourceLayer?.type === "text"
            ? resolveFont(
              sourceLayer.text.fontPolicy,
              fieldValue &&
                typeof fieldValue === "object" &&
                "text" in fieldValue
                ? fieldValue.fontId
                : undefined,
            )
            : layer.fontId;
        const canvasWidth = template.background?.widthPx ?? 900;
        const canvasHeight = template.background?.heightPx ?? 900;

        return {
          id: layer.id,
          name: sourceLayer?.name ?? resolveLocalizedInput(field?.label) ?? layer.id,
          fieldLabel: field ? resolveLocalizedInput(field.label) : null,
          text: layer.text,
          fontName: fontNames.get(fontFamilyId) ?? fontFamilyId,
          variant: fontVariantLabel(layer.isBold, layer.isItalic),
          color: layer.color,
          isBold: layer.isBold,
          isItalic: layer.isItalic,
          align: layer.align,
          fontSizePt: layer.fontSizePt,
          path: textPathLabel(layer.path.type),
          rotationDeg: layer.geometry.rotationDeg,
          position: `${formatCanvasPosition(layer.geometry.xRatio, canvasWidth)} × ${formatCanvasPosition(layer.geometry.yRatio, canvasHeight)}`,
          size: `${formatCanvasPosition(layer.geometry.widthRatio, canvasWidth)} × ${formatCanvasPosition(layer.geometry.heightRatio ?? layer.geometry.widthRatio, canvasHeight)}`,
        };
      });
  }, [dynamicFonts, measureText, item.id, order.id, preview, template]);
  const uploadedImages = getUploadedImageEntries(item);
  const [isDownloadingUploads, setIsDownloadingUploads] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [isExportingPreview, setIsExportingPreview] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState("");
  const orderDesign = useMemo(() => {
    if (!template || !preview) return null;
    return buildDesignFromForm({
      template,
      values: preview.values,
      designId: `order_${order.id}_item_${item.id}_preview`,
      measureText,
      dynamicFonts,
    });
  }, [dynamicFonts, measureText, item.id, order.id, preview, template]);

  async function exportPdf() {
    if (!template || !orderDesign) return;
    setIsExportingPdf(true);
    setExportError("");
    try {
      const { exportVectorPdfClientSide } = await import("../../lib/pdf-export");
      const blob = await exportVectorPdfClientSide(template, orderDesign, null);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${sanitizeFilenamePart(order.orderNumber)}-item-${item.id}-production.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Failed to export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  // oxlint-disable-next-line no-unused-vars
  // @ts-ignore
  async function exportPreviewImage(format: RasterExportFormat) {
    if (!template || !orderDesign) return;
    setIsExportingPreview(true);
    setExportError("");
    try {
      const blob = await exportRasterPreviewClientSide(template, orderDesign, {
        format,
        resolveFontUrl: (fontId) => FONT_FILES[fontId]
          ? `${BACKEND_URL}/fonts/${FONT_FILES[fontId]}`
          : `${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${fontId}`,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${sanitizeFilenamePart(order.orderNumber)}-item-${item.id}-preview.${rasterExportExtension(blob.type)}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Failed to export preview image.");
    } finally {
      setIsExportingPreview(false);
    }
  }

  async function downloadUploadedImages() {
    setIsDownloadingUploads(true);
    setDownloadError("");

    try {
      const zipFiles: Record<string, Uint8Array> = {};
      for (const [index, upload] of uploadedImages.entries()) {
        const contentUrl = `${BACKEND_URL}/api/assets/customizations/${upload.assetId}/content`;
        const { bytes, extension } = await fetchUploadBytes(contentUrl);
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

  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <FocusModal
      open={Boolean(item)}
      onOpenChange={(open) => {
        if (!open && !isFullscreen) onClose();
      }}
    >
      <FocusModal.Content
        onPointerDownOutside={(event) => {
          if (isFullscreen) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          if (isFullscreen) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (isFullscreen) event.preventDefault();
        }}
      >
        <FocusModal.Header>
          <div className="flex flex-1 items-center justify-between gap-x-2">
            <FocusModal.Title asChild>
              <Heading level="h2">Customization preview</Heading>
            </FocusModal.Title>
            <FocusModal.Description className="sr-only">
              Read-only preview of the frozen order customization snapshot.
            </FocusModal.Description>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="small"
                disabled={!template || !preview || isExportingPdf || isExportingPreview}
                isLoading={isExportingPdf}
                onClick={() => void exportPdf()}
              >
                Export PDF
              </Button>
              {/*<Button
                variant="secondary"
                size="small"
                disabled={!template || !preview || isExportingPdf || isExportingPreview}
                isLoading={isExportingPreview}
                onClick={() => void exportPreviewImage("image/webp")}
              >
                Export WebP
              </Button>
              <Button
                variant="secondary"
                size="small"
                disabled={!template || !preview || isExportingPdf || isExportingPreview}
                onClick={() => void exportPreviewImage("image/png")}
              >
                Export PNG
              </Button>*/}
              {item.productionStatus === "pending_review" ? (
                <Button
                  variant="primary"
                  size="small"
                  disabled={isUpdating}
                  onClick={() =>
                    void onMarkItemReady(item.id, `production-ready-${item.id}`)
                  }
                >
                  Mark ready
                </Button>
              ) : item.productionStatus === "ready" ? (
                <Button
                  variant="secondary"
                  size="small"
                  disabled={isUpdating}
                  onClick={() =>
                    void onMarkItemPendingReview(
                      item.id,
                      `production-pending-${item.id}`,
                    )
                  }
                >
                  Mark pending
                </Button>
              ) : null}
            </div>
          </div>
        </FocusModal.Header>
        <FocusModal.Body className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 xl:overflow-hidden">
          <div className="flex flex-col gap-y-1">
            <Heading level="h1">Customization preview</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {item.product?.title ?? "Unknown product"} ·{" "}
              {item.variant?.title ?? "Unknown variant"}
            </Text>
          </div>
          {exportError ? (
            <Text size="small" className="text-ui-fg-error">
              {exportError}
            </Text>
          ) : null}

          {template && preview ? (
            <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="min-h-[560px] overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle">
                <ProductCustomizationPreview
                  template={template}
                  values={preview.values}
                  dynamicFonts={dynamicFonts}
                  readOnly
                  selectedVariantId={item.variant?.id ?? null}
                  onFullscreenChange={setIsFullscreen}
                  resolveFontUrl={(assetId) =>
                    `${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${assetId}`
                  }
                  resolveStaticFontUrl={(fileName) =>
                    `${BACKEND_URL}/fonts/${fileName}`
                  }
                />
              </div>
              <aside className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base bg-ui-bg-base p-5 xl:min-h-0 xl:overflow-y-auto">
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
                <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
                  <div className="flex flex-col gap-y-1">
                    <Heading level="h2">Production specification</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                      Resolved from the frozen order snapshot, including fixed
                      template settings.
                    </Text>
                  </div>
                  {productionTextSpecs.length ? (
                    <div className="flex flex-col gap-y-3">
                      {productionTextSpecs.map((spec) => (
                        <div
                          key={spec.id}
                          className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3"
                        >
                          <div className="flex flex-col gap-y-1">
                            <Text
                              size="small"
                              className="font-medium text-ui-fg-base"
                            >
                              {spec.name}
                            </Text>
                            {spec.fieldLabel &&
                              spec.fieldLabel !== spec.name ? (
                              <Text size="xsmall" className="text-ui-fg-subtle">
                                Field: {spec.fieldLabel}
                              </Text>
                            ) : null}
                          </div>
                          <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 text-small">
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Text
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="break-words text-ui-fg-base"
                            >
                              {spec.text}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Font
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="break-words text-ui-fg-base"
                            >
                              {spec.fontName} · {spec.variant}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Color
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="flex items-center gap-x-2 text-ui-fg-base"
                            >
                              <span
                                className="size-3 shrink-0 rounded-full border border-ui-border-base"
                                style={{ backgroundColor: spec.color }}
                              />
                              {spec.color.toUpperCase()}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Style
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              Bold: {spec.isBold ? "Yes" : "No"} · Italic:{" "}
                              {spec.isItalic ? "Yes" : "No"}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Alignment
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="capitalize text-ui-fg-base"
                            >
                              {spec.align}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Type size
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              {spec.fontSizePt} pt
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Text path
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              {spec.path}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Rotation
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              {spec.rotationDeg}°
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Position
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              {spec.position}
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-subtle"
                            >
                              Print area
                            </Text>
                            <Text
                              as="div"
                              size="small"
                              className="text-ui-fg-base"
                            >
                              {spec.size}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Text size="small" className="text-ui-fg-subtle">
                      No visible text layers are included in this customization.
                    </Text>
                  )}
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
