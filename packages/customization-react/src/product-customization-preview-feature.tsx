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
import { X } from "lucide-react";
import { PreviewImageShape, PreviewText } from "./preview-layers";
import { CustomizationWatermark, FontLoader } from "./preview-support";
import { PreviewToolbar } from "./preview-toolbar";
import {
  Button,
  cn,
  FIT_PADDING_PX,
  MAX_PREVIEW_ZOOM,
  MIN_PREVIEW_ZOOM,
  useBrowserTextMeasure,
  ShapeClipPaths,
  type PanState,
  type ResolveCustomizationAssetUrl,
  type ResolveCustomizationFontUrl,
  type ResolveCustomizationStaticFontUrl,
} from "./index";

const EMPTY_DYNAMIC_FONTS: DynamicFontFamily[] = [];

export function ProductCustomizationPreview({
  template,
  values,
  dynamicFonts = EMPTY_DYNAMIC_FONTS,
  selectedVariantId,
  watermark = false,
  readOnly = false,
  className,
  viewportClassName,
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
  viewportClassName?: string;
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
          [
            ...template.layers.flatMap((layer) => {
              if (layer.type !== "text") return [];
              const { fontPolicy } = layer.text;
              const families =
                fontPolicy.mode === "fixed"
                  ? [fontPolicy.fontId]
                  : [
                      fontPolicy.defaultFontId,
                      ...fontPolicy.options.map((option) => option.value),
                    ];
              return families.flatMap((fontFamily) => [
                resolveFontVariant(fontFamily, false, false, dynamicFonts),
                resolveFontVariant(fontFamily, true, false, dynamicFonts),
                resolveFontVariant(fontFamily, false, true, dynamicFonts),
                resolveFontVariant(fontFamily, true, true, dynamicFonts),
              ]);
            }),
            ...Object.values(values).flatMap((val) => {
              if (
                val &&
                typeof val === "object" &&
                "fontId" in val &&
                typeof val.fontId === "string" &&
                val.fontId
              ) {
                return [
                  resolveFontVariant(val.fontId, false, false, dynamicFonts),
                  resolveFontVariant(val.fontId, true, false, dynamicFonts),
                  resolveFontVariant(val.fontId, false, true, dynamicFonts),
                  resolveFontVariant(val.fontId, true, true, dynamicFonts),
                ];
              }
              return [];
            }),
            ...dynamicFonts.flatMap((font) => [
              font.regularAssetId,
              font.boldAssetId,
              font.italicAssetId,
              font.boldItalicAssetId,
            ]),
          ].filter(Boolean) as string[],
        ),
      ),
    [dynamicFonts, template.layers, values],
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
  }, [fitToView, isFullscreen]);

  useEffect(() => {
    if (readOnly && selectedImageFieldId) setSelectedImageFieldId("");
  }, [readOnly, selectedImageFieldId]);

  useEffect(() => {
    if (!isFullscreen || typeof document === "undefined") return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        setFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [isFullscreen, setFullscreen]);

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
        isFullscreen &&
          "h-full min-h-0 max-h-full w-full max-w-none rounded-none",
      )}
      data-selected-variant-id={selectedVariantId ?? ""}
      data-preview-background-url={background?.previewUrl ?? ""}
    >
      <FontLoader
        fontIds={fontPreviewIds}
        dynamicFonts={dynamicFonts}
        resolveFontUrl={resolveFontUrl}
        resolveStaticFontUrl={resolveStaticFontUrl}
      />
      <ShapeClipPaths layers={design.layers} />
      <div
        ref={viewportRef}
        className={cn(
          "relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(90deg,rgba(28,27,27,0.035)_1px,transparent_1px),linear-gradient(rgba(28,27,27,0.035)_1px,transparent_1px)] bg-[size:28px_28px]",
          isCanvasPanMode && "cursor-grab active:cursor-grabbing",
          viewportClassName,
        )}
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
        <PreviewToolbar
          selectedImageValue={
            !readOnly && selectedImageField ? selectedImageField.value : null
          }
          zoom={zoom}
          onImageAdjust={adjustSelectedImage}
          onFullscreen={() => setFullscreen(true)}
          onZoomChange={setCommittedZoom}
          onFit={fitToView}
        />
      </div>
    </div>
  );

  if (!isFullscreen) {
    return previewFrame;
  }

  const fullscreenOverlay = (
    <div
      className="fixed inset-0 z-[2147483647] pointer-events-auto bg-black/70 p-0 backdrop-blur-sm"
      style={{ pointerEvents: "auto" }}
      data-customization-fullscreen-overlay=""
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="absolute right-4 top-4 z-[121] pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="border-white/20 bg-white/95 text-on-surface shadow-lg pointer-events-auto cursor-pointer"
          style={{ pointerEvents: "auto" }}
          aria-label="Close fullscreen preview"
          title="Close fullscreen preview"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen(false);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div
        className="flex h-full w-full items-center justify-center pointer-events-auto"
        style={{ pointerEvents: "auto" }}
      >
        {previewFrame}
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return fullscreenOverlay;
  }

  return createPortal(fullscreenOverlay, document.body);
}
