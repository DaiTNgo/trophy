import {
  buildDesignFromForm,
  resolveFontVariant,
  type CustomizationFormValues,
  type CustomizationFormField,
  type CustomizationTemplate,
  type DynamicFontFamily,
  type ImageShapeFieldValue,
} from "@trophy/customization";
import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Crosshair, Fullscreen,
  Minus, Plus, RotateCcw, X,
} from "lucide-react";
import { PreviewImageShape, PreviewText } from "./preview-layers";
import { CanvasAction, CustomizationWatermark, FontLoader } from "./preview-support";
import {
  Button,
  cn,
  FIT_PADDING_PX,
  MAX_PREVIEW_ZOOM,
  MIN_FREE_IMAGE_SCALE,
  MIN_PREVIEW_ZOOM,
  PREVIEW_ZOOM_STEP,
  useBrowserTextMeasure,
  ShapeClipPaths,
  type PanState,
  type ResolveCustomizationAssetUrl,
  type ResolveCustomizationFontUrl,
  type ResolveCustomizationStaticFontUrl,
} from "./index";

export function ProductCustomizationPreview({
  template,
  values,
  dynamicFonts = [],
  selectedVariantId,
  watermark = false,
  readOnly = false,
  className,
  resolveAssetUrl,
  resolveFontUrl,
  resolveStaticFontUrl,
  onImageValueChange,
  onFullscreenChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
  watermark?: boolean;
  readOnly?: boolean;
  className?: string;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
  onImageValueChange?: (fieldId: string, value: ImageShapeFieldValue) => void;
  onFullscreenChange?: (open: boolean) => void;
}) {
  const fontPreviewIds = useMemo(
    () =>
      Array.from(
        new Set(
          template.layers.flatMap((layer) => {
            if (layer.type !== "text") return [];
            const { fontPolicy } = layer.text;
            const families =
              fontPolicy.mode === "fixed"
                ? [fontPolicy.fontId]
                : [
                    fontPolicy.defaultFontId,
                    ...fontPolicy.options.map((option) => option.value),
                  ];
            return families
              .map((fontFamily) =>
                resolveFontVariant(fontFamily, false, false, dynamicFonts),
              )
              .filter(Boolean);
          }),
        ),
      ),
    [dynamicFonts, template.layers],
  );
  const { measureText, fontRevision } = useBrowserTextMeasure(fontPreviewIds);
  const design = useMemo(
    () =>
      buildDesignFromForm({
        template,
        values,
        designId: "storefront_product_preview",
        measureText,
        dynamicFonts,
      }),
    [dynamicFonts, fontRevision, measureText, template, values],
  );

  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const setFullscreen = useCallback(
    (open: boolean) => {
      onFullscreenChange?.(open);
      setIsFullscreen(open);
    },
    [onFullscreenChange],
  );
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportDrag = useRef<{ x: number; y: number; pan: PanState } | null>(
    null,
  );
  const activePointers = useRef<Map<number, { x: number; y: number }>>(
    new Map(),
  );
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchZoom = useRef(zoom);
  const scale = zoom;
  const fieldsByLayerId = new Map(
    template.formFields.map((field) => [field.layerId, field]),
  );
  const editableImageFields = useMemo(() => {
    return template.formFields
      .map((field) => {
        const value = values[field.id];
        if (!value || typeof value !== "object" || !("assetId" in value))
          return null;
        const layer = template.layers.find(
          (entry) => entry.id === field.layerId,
        );
        if (!layer || layer.type !== "image_shape") return null;
        return { field, value };
      })
      .filter(
        (
          entry,
        ): entry is {
          field: CustomizationFormField;
          value: ImageShapeFieldValue;
        } => entry !== null,
      );
  }, [template.formFields, template.layers, values]);
  const [selectedImageFieldId, setSelectedImageFieldId] = useState("");
  const selectedImageField =
    editableImageFields.find(
      (entry) => entry.field.id === selectedImageFieldId,
    ) ?? null;
  const isCanvasPanMode = readOnly || !selectedImageField;

  useEffect(() => {
    if (
      !selectedImageFieldId ||
      editableImageFields.some(
        (entry) => entry.field.id === selectedImageFieldId,
      )
    ) {
      return;
    }
    setSelectedImageFieldId("");
  }, [editableImageFields, selectedImageFieldId]);

  const setCommittedZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(
      MAX_PREVIEW_ZOOM,
      Math.max(MIN_PREVIEW_ZOOM, nextZoom),
    );
    setZoom(clamped);
  }, []);

  const fitToView = useCallback(() => {
    if (!viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const availableWidth = Math.max(1, bounds.width - FIT_PADDING_PX);
    const availableHeight = Math.max(1, bounds.height - FIT_PADDING_PX);
    setCommittedZoom(
      Math.min(availableWidth / width, availableHeight / height),
    );
    setPan({ x: 0, y: 0 });
  }, [height, setCommittedZoom, width]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    if (readOnly && selectedImageFieldId) setSelectedImageFieldId("");
  }, [readOnly, selectedImageFieldId]);

  useEffect(() => {
    if (!isFullscreen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  function updateImageValue(fieldId: string, value: ImageShapeFieldValue) {
    onImageValueChange?.(fieldId, value);
  }

  function adjustSelectedImage(
    patch: Partial<
      Pick<
        ImageShapeFieldValue,
        "cropScale" | "cropXRatio" | "cropYRatio" | "cropRotationDeg"
      >
    >,
  ) {
    if (!selectedImageField) return;
    updateImageValue(selectedImageField.field.id, {
      ...selectedImageField.value,
      ...patch,
    });
  }

  function startCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    const shouldPanCanvas =
      readOnly || !selectedImageField || event.target === event.currentTarget;
    if (!shouldPanCanvas) return;
    if (
      !readOnly &&
      event.target === event.currentTarget &&
      selectedImageField
    ) {
      setSelectedImageFieldId("");
    }
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (activePointers.current.size === 1) {
      viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
    } else if (activePointers.current.size === 2) {
      const points = Array.from(activePointers.current.values());
      initialPinchDist.current = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      initialPinchZoom.current = zoom;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isCanvasPanMode) return;
    if (activePointers.current.has(event.pointerId)) {
      activePointers.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (
      activePointers.current.size === 2 &&
      initialPinchDist.current !== null
    ) {
      const points = Array.from(activePointers.current.values());
      const dist = Math.hypot(
        points[0].x - points[1].x,
        points[0].y - points[1].y,
      );
      setCommittedZoom(
        initialPinchZoom.current * (dist / initialPinchDist.current),
      );
    } else if (activePointers.current.size === 1 && viewportDrag.current) {
      setPan({
        x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
        y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
      });
    }
  }

  function finishCanvasPan(event: ReactPointerEvent<HTMLDivElement>) {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) initialPinchDist.current = null;
    if (activePointers.current.size === 1) {
      const point = Array.from(activePointers.current.values())[0];
      viewportDrag.current = { x: point.x, y: point.y, pan };
    } else if (activePointers.current.size === 0) {
      viewportDrag.current = null;
    }
  }

  const previewFrame = (
    <div
      className={cn(
        "relative mx-auto flex h-[min(72vh,740px)] min-h-[520px] w-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low",
        className,
        isFullscreen && "h-full min-h-0 max-h-full w-full max-w-none rounded-none",
      )}
      data-selected-variant-id={selectedVariantId ?? ""}
      data-preview-background-url={background?.previewUrl ?? ""}
    >
      <FontLoader
        layers={design.layers}
        fontIds={fontPreviewIds}
        dynamicFonts={dynamicFonts}
        resolveFontUrl={resolveFontUrl}
        resolveStaticFontUrl={resolveStaticFontUrl}
      />
      <ShapeClipPaths layers={design.layers} />
      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(90deg,rgba(28,27,27,0.035)_1px,transparent_1px),linear-gradient(rgba(28,27,27,0.035)_1px,transparent_1px)] bg-[size:28px_28px] ${
          isCanvasPanMode ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ touchAction: isCanvasPanMode ? "none" : "auto" }}
        onPointerDown={startCanvasPan}
        onPointerMove={moveCanvasPan}
        onPointerUp={finishCanvasPan}
        onPointerCancel={finishCanvasPan}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            backgroundColor: "white",
            boxShadow: "0 18px 70px rgba(28,27,27,0.16)",
            width: width * scale,
            height: height * scale,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
          }}
          onPointerDown={(event) => {
            if (readOnly) return;
            if (event.target === event.currentTarget)
              setSelectedImageFieldId("");
          }}
          onPointerMove={() => {
            if (readOnly) return;
          }}
          onPointerUp={() => {
            if (readOnly) return;
          }}
          onPointerCancel={() => {
            if (readOnly) return;
          }}
        >
          {background ? (
            <img
              src={
                resolveAssetUrl?.(background.previewUrl) ??
                background.previewUrl
              }
              alt=""
              data-preview-background-image=""
              draggable={false}
              style={{
                position: "absolute",
                inset: 0,
                height: "100%",
                width: "100%",
                pointerEvents: "none",
                userSelect: "none",
                objectFit: "fill",
              }}
            />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#f5f5f5",
                fontSize: "14px",
                color: "#717171",
              }}
            >
              Variant image unavailable
            </div>
          )}
          {[...design.layers]
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((layer) => {
              if (layer.type === "text") {
                return (
                  <PreviewText
                    key={layer.id}
                    layer={layer}
                    width={width}
                    height={height}
                    scale={scale}
                  />
                );
              }
              const field = fieldsByLayerId.get(layer.layerId);
              const fieldValue = field ? values[field.id] : null;
              const uploadValue =
                fieldValue &&
                typeof fieldValue === "object" &&
                "assetId" in fieldValue
                  ? fieldValue
                  : null;
              return (
                <PreviewImageShape
                  key={layer.id}
                  layer={layer}
                  width={width}
                  height={height}
                  scale={scale}
                  interactive={!readOnly}
                  resolveAssetUrl={resolveAssetUrl}
                  value={uploadValue}
                  onChange={
                    field && uploadValue && onImageValueChange
                      ? (nextValue) => updateImageValue(field.id, nextValue)
                      : undefined
                  }
                  selected={Boolean(
                    field && selectedImageField?.field.id === field.id,
                  )}
                  onSelect={
                    !readOnly && field && uploadValue
                      ? () => setSelectedImageFieldId(field.id)
                      : undefined
                  }
                />
              );
            })}
          {watermark ? <CustomizationWatermark /> : null}
        </div>
        {!readOnly && selectedImageField ? (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex items-end justify-between gap-3 sm:inset-x-4 sm:bottom-4">
            <div className="pointer-events-auto flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto rounded-md border border-outline-variant bg-white/95 p-1 shadow-lg backdrop-blur">
              <CanvasAction
                label="Zoom out image"
                onClick={() =>
                  adjustSelectedImage({
                    cropScale: Math.max(
                      MIN_FREE_IMAGE_SCALE,
                      (selectedImageField.value.cropScale ?? 1) / 1.1,
                    ),
                  })
                }
              >
                <Minus className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Zoom in image"
                onClick={() =>
                  adjustSelectedImage({
                    cropScale: (selectedImageField.value.cropScale ?? 1) * 1.1,
                  })
                }
              >
                <Plus className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Move image left"
                onClick={() =>
                  adjustSelectedImage({
                    cropXRatio:
                      (selectedImageField.value.cropXRatio ?? 0) - 0.05,
                  })
                }
              >
                <ArrowLeft className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Move image right"
                onClick={() =>
                  adjustSelectedImage({
                    cropXRatio:
                      (selectedImageField.value.cropXRatio ?? 0) + 0.05,
                  })
                }
              >
                <ArrowRight className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Move image up"
                onClick={() =>
                  adjustSelectedImage({
                    cropYRatio:
                      (selectedImageField.value.cropYRatio ?? 0) - 0.05,
                  })
                }
              >
                <ArrowUp className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Move image down"
                onClick={() =>
                  adjustSelectedImage({
                    cropYRatio:
                      (selectedImageField.value.cropYRatio ?? 0) + 0.05,
                  })
                }
              >
                <ArrowDown className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Reset image"
                onClick={() =>
                  adjustSelectedImage({
                    cropScale: 1,
                    cropXRatio: 0,
                    cropYRatio: 0,
                    cropRotationDeg: 0,
                  })
                }
              >
                <RotateCcw className="size-3.5" />
              </CanvasAction>
            </div>
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-outline-variant bg-white/95 p-1 shadow-lg backdrop-blur">
              <CanvasAction
                label="Open fullscreen preview"
                onClick={() => setFullscreen(true)}
              >
                <Fullscreen className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Zoom out"
                onClick={() => setCommittedZoom(zoom - PREVIEW_ZOOM_STEP)}
              >
                <Minus className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Zoom in"
                onClick={() => setCommittedZoom(zoom + PREVIEW_ZOOM_STEP)}
              >
                <Plus className="size-3.5" />
              </CanvasAction>
              <CanvasAction label="Fit canvas" onClick={fitToView}>
                <Crosshair className="size-3.5" />
              </CanvasAction>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-20 flex justify-end sm:inset-x-4 sm:bottom-4">
            <div className="pointer-events-auto flex items-center gap-1.5 rounded-md border border-outline-variant bg-white/95 p-1 shadow-lg backdrop-blur">
              <CanvasAction
                label="Open fullscreen preview"
                onClick={() => setFullscreen(true)}
              >
                <Fullscreen className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Zoom out"
                onClick={() => setCommittedZoom(zoom - PREVIEW_ZOOM_STEP)}
              >
                <Minus className="size-3.5" />
              </CanvasAction>
              <CanvasAction
                label="Zoom in"
                onClick={() => setCommittedZoom(zoom + PREVIEW_ZOOM_STEP)}
              >
                <Plus className="size-3.5" />
              </CanvasAction>
              <CanvasAction label="Fit canvas" onClick={fitToView}>
                <Crosshair className="size-3.5" />
              </CanvasAction>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isFullscreen) {
    return previewFrame;
  }

  const fullscreenOverlay = (
    <div className="fixed inset-0 z-[2147483647] bg-black/70 p-0 backdrop-blur-sm">
      <div className="absolute right-4 top-4 z-[121]">
        <Button
          variant="outline"
          size="icon"
          className="border-white/20 bg-white/95 text-on-surface shadow-lg"
          aria-label="Close fullscreen preview"
          title="Close fullscreen preview"
          onClick={() => setFullscreen(false)}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex h-full w-full items-center justify-center">
        {previewFrame}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return fullscreenOverlay;
  }

  return createPortal(fullscreenOverlay, document.body);
}
