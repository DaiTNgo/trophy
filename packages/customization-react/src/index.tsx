import {
  buildDesignFromForm,
  FONT_FILES,
  getImageShapeClipartCategoryMode,
  getFontStyleCapabilities,
  getUsableFontOptions,
  getOrderedFormFields,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  normalizeFontStyle,
  resolveFormat,
  resolveFontVariant,
  validateCustomizationValues,
  vectorPointsToSvgPathD,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type DynamicFontFamily,
  type ClipartFieldValue,
  type ImageShapeFieldValue,
  type ImageShapeEditorLayer,
  type RuntimeLayer,
  type TextFieldValue,
} from "@trophy/customization";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { PreviewImageShape, PreviewText } from "./preview-layers";
import { ProductCustomizationForm, CustomizationStudio } from "./customization-forms";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Crosshair,
  Fullscreen,
  ImagePlus,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type PanState = { x: number; y: number };
export type CustomizationUploadImage = (
  field: CustomizationFormField,
  file: File,
) => Promise<ImageShapeFieldValue> | ImageShapeFieldValue;
export type ResolveCustomizationFontUrl = (assetId: string) => string;
export type ResolveCustomizationStaticFontUrl = (fileName: string) => string;
export type ResolveCustomizationAssetUrl = (url: string) => string;

export function createCustomizationInteractionHandlers(onInteraction?: () => void) {
  return {
    onFocusCapture: onInteraction,
    onPointerDown: onInteraction,
  };
}

const MIN_FREE_IMAGE_SCALE = 0.02;
const MIN_PREVIEW_ZOOM = 0.05;
const MAX_PREVIEW_ZOOM = 4;
const PREVIEW_ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 56;

function quoteFontFamily(fontId: string) {
  return `"${fontId.replace(/["\\]/g, "\\$&")}"`;
}

function useBrowserTextMeasure(fontIds: string[]) {
  const [fontRevision, setFontRevision] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const measureText = useCallback(
    (text: string, fontSizePt: number, fontId: string) => {
      if (typeof document === "undefined") {
        return text.length * fontSizePt * 0.55;
      }

      canvasRef.current ??= document.createElement("canvas");
      const context = canvasRef.current.getContext("2d");
      if (!context) return text.length * fontSizePt * 0.55;

      context.font = `${fontSizePt}px ${quoteFontFamily(fontId)}`;
      return context.measureText(text).width;
    },
    [],
  );

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;

    let cancelled = false;
    const refreshMeasurements = () => {
      if (!cancelled) setFontRevision((revision) => revision + 1);
    };
    const loadFonts = async () => {
      await Promise.all(
        fontIds.map((fontId) =>
          document.fonts.load(`16px ${quoteFontFamily(fontId)}`, "Aa"),
        ),
      );
      refreshMeasurements();
    };

    void loadFonts();
    document.fonts.addEventListener("loadingdone", refreshMeasurements);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", refreshMeasurements);
    };
  }, [fontIds]);

  return { measureText, fontRevision };
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow hover:bg-accent/90",
        outline:
          "border border-outline bg-white text-on-surface shadow-sm hover:border-accent hover:bg-accent/10",
        ghost: "text-on-surface hover:bg-surface-container-low",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}







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
          onPointerMove={(event) => {
            if (readOnly) return;
          }}
          onPointerUp={(event) => {
            if (readOnly) return;
          }}
          onPointerCancel={(event) => {
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

const WATERMARK_LABELS = Array.from({ length: 36 }, (_, index) => index);

function CustomizationWatermark() {
  return (
    <div
      aria-hidden="true"
      data-preview-watermark="phùng thị"
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none"
      style={{
        opacity: 0.16,
        mixBlendMode: "difference",
      }}
    >
      <div
        className="absolute inset-[-35%] grid grid-cols-6 content-center gap-x-16 gap-y-16"
        style={{ transform: "rotate(-24deg)" }}
      >
        {WATERMARK_LABELS.map((index) => (
          <span
            key={index}
            className="whitespace-nowrap text-sm font-semibold tracking-[0.16em] text-white sm:text-base"
          >
            phùng thị
          </span>
        ))}
      </div>
    </div>
  );
}

function CanvasAction({
  label,
  children,
  onClick,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="icon"
      title={label}
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}





export {
  ProductCustomizationForm,
  CustomizationStudio,
  ProductCustomizationPreview as CustomizationCanvas,
  ProductCustomizationForm as CustomizationForm,
};

function FontLoader({
  layers,
  fontIds: additionalFontIds = [],
  dynamicFonts = [],
  resolveFontUrl,
  resolveStaticFontUrl,
}: {
  layers: RuntimeLayer[];
  fontIds?: string[];
  dynamicFonts?: DynamicFontFamily[];
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
}) {
  const fontIds = Array.from(
    new Set(
      layers
        .filter(
          (layer): layer is Extract<RuntimeLayer, { type: "text" }> =>
            layer.type === "text" && !!layer.fontId,
        )
        .map((layer) => layer.fontId)
        .concat(additionalFontIds),
    ),
  );
  const dynamicFontAssetIds = new Set(
    dynamicFonts
      .flatMap((font) => [
        font.regularAssetId,
        font.boldAssetId,
        font.italicAssetId,
        font.boldItalicAssetId,
      ])
      .filter((assetId): assetId is string => Boolean(assetId)),
  );

  return (
    <>
      {fontIds.map((fontId) => {
        if (dynamicFontAssetIds.has(fontId)) {
          return (
            <style
              key={fontId}
              dangerouslySetInnerHTML={{
                __html: `
                  @font-face {
                    font-family: '${fontId}';
                    src: url('${resolveFontUrl?.(fontId) ?? fontId}') format('truetype');
                  }
                `,
              }}
            />
          );
        }

        const file = FONT_FILES[fontId];
        if (!file) return null;
        return (
          <style
            key={fontId}
            dangerouslySetInnerHTML={{
              __html: `
                @font-face {
                  font-family: '${fontId}';
                  src: url('${resolveStaticFontUrl?.(file) ?? `/fonts/${file}`}') format('truetype');
                }
              `,
            }}
          />
        );
      })}
    </>
  );
}





export function FormField({
  field,
  layer,
  stepNumber,
  value,
  issue,
  uploading,
  dynamicFonts = [],
  resolveAssetUrl,
  onChange,
  onUpload,
}: {
  field: CustomizationFormField;
  layer: CustomizationLayer;
  stepNumber: number;
  value: CustomizationFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  dynamicFonts?: DynamicFontFamily[];
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => void;
}) {
  const imageLayer =
    layer.type === "image_shape" ? (layer as ImageShapeEditorLayer) : null;
  return (
    <section className="py-4">
      {/* Step header */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          STEP {stepNumber}
          {field.helpText ? (
            <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-on-surface-variant">
              {field.helpText}
            </span>
          ) : null}
        </p>
        <label className="mt-0.5 block text-sm font-semibold text-on-surface">
          {field.label}
          {field.required ? (
            <span className="ml-1 text-destructive" aria-hidden>
              *
            </span>
          ) : null}
        </label>
      </div>
      {layer.type === "text" ? (
        <TextField
          field={field}
          layer={layer}
          value={value}
          dynamicFonts={dynamicFonts}
          onChange={onChange}
        />
      ) : (
        <ImageField
          layer={imageLayer}
          value={value}
          uploading={uploading}
          resolveAssetUrl={resolveAssetUrl}
          onChange={onChange}
          onUpload={onUpload}
        />
      )}
      {issue ? (
        <p className="mt-2 text-xs font-medium text-destructive">{issue}</p>
      ) : null}
    </section>
  );
}

function TextField({
  field,
  layer,
  value,
  dynamicFonts = [],
  onChange,
}: {
  field: CustomizationFormField;
  layer: Extract<CustomizationLayer, { type: "text" }>;
  value: CustomizationFieldValue | undefined;
  dynamicFonts?: DynamicFontFamily[];
  onChange: (value: TextFieldValue) => void;
}) {
  const textValue = value && "text" in value ? value : { text: "" };
  const pathText = layer.text.path.type !== "straight";
  const fontPolicy = layer.text.fontPolicy;
  const availableFontOptions =
    fontPolicy.mode === "shopper_selectable"
      ? getUsableFontOptions(fontPolicy.options, dynamicFonts)
      : [];
  const selectedFontId =
    fontPolicy.mode === "shopper_selectable"
      ? (availableFontOptions.find(
          (option) => option.value === textValue.fontId,
        )?.value ??
        availableFontOptions[0]?.value ??
        fontPolicy.defaultFontId)
      : fontPolicy.fontId;
  const selectedFontCapabilities = getFontStyleCapabilities(
    selectedFontId,
    dynamicFonts,
  );
  const requestedFormat = resolveFormat(layer.text.formatPolicy, textValue);
  const normalizedStyle = normalizeFontStyle({
    fontFamily: selectedFontId,
    isBold: requestedFormat.isBold,
    isItalic: requestedFormat.isItalic,
    dynamicFonts,
  });

  useEffect(() => {
    if (
      textValue.fontId === selectedFontId &&
      textValue.isBold === normalizedStyle.isBold &&
      textValue.isItalic === normalizedStyle.isItalic
    ) {
      return;
    }
    onChange({ ...textValue, fontId: selectedFontId, ...normalizedStyle });
  }, [
    normalizedStyle.isBold,
    normalizedStyle.isItalic,
    onChange,
    selectedFontId,
    textValue,
  ]);

  return (
    <div className="space-y-4">
      <style>{`
        .trophy-customization-text-input::selection {
          color: #ffffff;
          background-color: #288ab6;
        }
        .trophy-customization-text-input::-moz-selection {
          color: #ffffff;
          background-color: #288ab6;
        }
      `}</style>
      <input
        type="text"
        value={pathText ? textValue.text : textValue.text.replace(/\n/g, " ")}
        placeholder={
          field.placeholder ??
          "Letter limit varies, refer to preview to confirm your text is correct"
        }
        onChange={(event) =>
          onChange({
            ...textValue,
            text: event.target.value,
          })
        }
        className="trophy-customization-text-input h-10 w-full rounded border border-outline bg-white px-3 text-sm text-on-surface outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
      {layer.text.colorPolicy.mode === "shopper_selectable"
        ? (() => {
            const colorPolicy = layer.text.colorPolicy;
            return (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                  Text Color
                </p>
                <div className="flex flex-wrap gap-2">
                  {colorPolicy.options.map((option) => {
                    const selected =
                      (textValue.color ?? colorPolicy.defaultColor) ===
                      option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        onClick={() =>
                          onChange({ ...textValue, color: option.value })
                        }
                        className={`size-8 rounded-full border-2 transition ${
                          selected
                            ? "border-accent ring-2 ring-accent/40 ring-offset-1"
                            : "border-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.18)] hover:ring-2 hover:ring-accent/30"
                        }`}
                        style={{ backgroundColor: option.value }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })()
        : null}
      {fontPolicy.mode === "shopper_selectable" &&
      availableFontOptions.length > 1 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Font
          </p>
          <div className="flex flex-wrap gap-2">
            {availableFontOptions.map((option) => {
              const selected = selectedFontId === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  onClick={() => {
                    const nextStyle = normalizeFontStyle({
                      fontFamily: option.value,
                      isBold: normalizedStyle.isBold,
                      isItalic: normalizedStyle.isItalic,
                      dynamicFonts,
                    });
                    onChange({
                      ...textValue,
                      fontId: option.value,
                      ...nextStyle,
                    });
                  }}
                  className={`flex h-9 items-center justify-center rounded border px-3 text-sm transition ${
                    selected
                      ? "border-accent bg-accent/10 text-accent font-semibold"
                      : "border-outline bg-white text-on-surface hover:border-accent"
                  }`}
                  style={{
                    fontFamily: resolveFontVariant(
                      option.value,
                      false,
                      false,
                      dynamicFonts,
                    ),
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {layer.text.formatPolicy.mode === "shopper_selectable" &&
      (selectedFontCapabilities.bold || selectedFontCapabilities.italic) ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Format
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedFontCapabilities.bold ? (
              <button
                type="button"
                aria-pressed={normalizedStyle.isBold}
                onClick={() => {
                  const nextBold = !normalizedStyle.isBold;
                  const nextStyle = normalizeFontStyle({
                    fontFamily: selectedFontId,
                    isBold: nextBold,
                    isItalic: normalizedStyle.isItalic,
                    dynamicFonts,
                  });
                  onChange({
                    ...textValue,
                    fontId: selectedFontId,
                    ...nextStyle,
                  });
                }}
                className={`flex h-9 w-9 items-center justify-center rounded border text-sm font-bold transition ${
                  normalizedStyle.isBold
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-white text-on-surface hover:border-accent"
                }`}
              >
                B
              </button>
            ) : null}
            {selectedFontCapabilities.italic ? (
              <button
                type="button"
                aria-pressed={normalizedStyle.isItalic}
                onClick={() => {
                  const nextItalic = !normalizedStyle.isItalic;
                  const nextStyle = normalizeFontStyle({
                    fontFamily: selectedFontId,
                    isBold: normalizedStyle.isBold,
                    isItalic: nextItalic,
                    dynamicFonts,
                  });
                  onChange({
                    ...textValue,
                    fontId: selectedFontId,
                    ...nextStyle,
                  });
                }}
                className={`flex h-9 w-9 items-center justify-center rounded border text-sm italic transition ${
                  normalizedStyle.isItalic
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-outline bg-white text-on-surface hover:border-accent"
                }`}
              >
                I
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ImageField({
  layer,
  value,
  uploading,
  resolveAssetUrl,
  onChange,
  onUpload,
}: {
  layer: ImageShapeEditorLayer | null;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onChange: (value: ImageShapeFieldValue | ClipartFieldValue | null) => void;
  onUpload: (file: File) => void;
}) {
  const sourcePolicy = layer?.sourcePolicy ?? "upload_only";
  const clipartCategoryMode = layer
    ? getImageShapeClipartCategoryMode(layer)
    : "fixed";
  const uploaded =
    value && typeof value === "object" && "assetId" in value ? value : null;
  const clipartValue =
    value &&
    typeof value === "object" &&
    "source" in value &&
    value.source === "clipart"
      ? value
      : null;
  const scopedClipartCategories = !layer
    ? []
    : clipartCategoryMode === "allow_list"
      ? (layer.allowedClipartCategories ?? [])
      : layer.clipartCategory
        ? [layer.clipartCategory]
        : [];
  const initialCategoryId =
    clipartValue?.categoryId ??
    (clipartCategoryMode === "fixed"
      ? layer?.clipartCategory?.id
      : scopedClipartCategories[0]?.id) ??
    "";
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(initialCategoryId);
  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (clipartCategoryMode === "fixed") {
        return layer?.clipartCategory?.id ?? "";
      }
      const allowedIds = new Set(
        scopedClipartCategories.map((category) => category.id),
      );
      if (current && allowedIds.has(current)) {
        return current;
      }
      if (clipartValue?.categoryId && allowedIds.has(clipartValue.categoryId)) {
        return clipartValue.categoryId;
      }
      return scopedClipartCategories[0]?.id ?? "";
    });
  }, [
    clipartCategoryMode,
    layer?.clipartCategory?.id,
    clipartValue?.categoryId,
    layer?.id,
    scopedClipartCategories,
  ]);
  const scopedCategoryIds = new Set(
    scopedClipartCategories.map((category) => category.id),
  );
  const activeCategoryId =
    clipartCategoryMode === "fixed"
      ? (layer?.clipartCategory?.id ?? "")
      : selectedCategoryId || scopedClipartCategories[0]?.id || "";
  const availableClipartAssets = (layer?.clipartAssets ?? []).filter(
    (asset) => {
      if (!asset.active || !scopedCategoryIds.has(asset.categoryId))
        return false;
      if (!activeCategoryId) return true;
      return asset.categoryId === activeCategoryId;
    },
  );
  const currentSource =
    sourcePolicy === "clipart_category_only"
      ? "clipart"
      : clipartValue
        ? "clipart"
        : "upload";

  const uploadSection = (
    <div className="space-y-2.5">
      {!uploaded ? (
        <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded border border-dashed border-outline bg-white px-4 text-sm text-on-surface-variant transition hover:border-accent hover:text-accent">
          <ImagePlus className="size-4" />
          {uploading ? "Uploading..." : "Choose PNG or JPEG"}
          <input
            type="file"
            accept="image/png,image/jpeg"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
            className="sr-only"
          />
        </label>
      ) : (
        <div className="flex items-center gap-3">
          <img
            src={resolveAssetUrl?.(uploaded.previewUrl) ?? uploaded.previewUrl}
            alt=""
            className="h-14 w-14 shrink-0 rounded object-cover"
          />
          <div className="flex flex-1 items-center gap-2">
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded border border-outline bg-white px-3 text-xs font-semibold text-on-surface transition hover:border-accent">
              <RotateCw className="size-3" />
              Replace
              <input
                type="file"
                accept="image/png,image/jpeg"
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onUpload(file);
                  event.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <button
              type="button"
              aria-label="Remove image"
              onClick={() => onChange(null)}
              className="flex h-8 items-center gap-1.5 rounded border border-outline bg-white px-3 text-xs font-semibold text-destructive transition hover:border-destructive"
            >
              <X className="size-3" />
              Remove
            </button>
          </div>
        </div>
      )}
      {uploaded ? (
        <p className="text-[11px] leading-snug text-on-surface-variant">
          Click the image on the preview to move and position it.
        </p>
      ) : null}
    </div>
  );

  const clipartSection = (
    <div className="space-y-3">
      {clipartCategoryMode === "allow_list" &&
      scopedClipartCategories.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
            Category
          </p>
          <select
            value={activeCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="h-9 w-full rounded border border-outline bg-white px-3 text-sm text-on-surface outline-none focus:border-accent"
          >
            {scopedClipartCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : clipartCategoryMode === "fixed" && layer?.clipartCategory?.name ? (
        <p className="text-xs font-semibold text-on-surface-variant">
          {layer.clipartCategory.name}
        </p>
      ) : null}
      {/* Dense 6-col icon grid */}
      <div className="grid grid-cols-6 gap-1.5">
        {availableClipartAssets.map((clipart) => {
          const selected =
            clipartValue &&
            "clipartAssetId" in clipartValue &&
            clipartValue.clipartAssetId === clipart.id;
          return (
            <button
              key={clipart.id}
              type="button"
              title={clipart.name}
              onClick={() =>
                onChange({
                  source: "clipart",
                  clipartAssetId: clipart.id,
                  clipartAssetName: clipart.name,
                  sourceAssetId: clipart.sourceAssetId,
                  previewUrl: clipart.previewUrl,
                  mimeType: clipart.mimeType,
                  sourceWidthPx: clipart.sourceWidthPx,
                  sourceHeightPx: clipart.sourceHeightPx,
                  categoryId: clipart.categoryId,
                })
              }
              className={`flex aspect-square items-center justify-center rounded border p-1 transition ${
                selected
                  ? "border-accent bg-accent/10 ring-1 ring-accent"
                  : "border-outline-variant bg-white hover:border-accent hover:bg-accent/5"
              }`}
            >
              <img
                src={
                  resolveAssetUrl?.(clipart.previewUrl) ?? clipart.previewUrl
                }
                alt={clipart.name}
                className="h-10 w-10 object-contain"
              />
            </button>
          );
        })}
      </div>
      {clipartValue ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive"
        >
          <X className="size-3.5" />
          Clear selection
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {sourcePolicy === "upload_only" ? uploadSection : null}
      {sourcePolicy === "clipart_category_only" ? clipartSection : null}
      {sourcePolicy === "upload_or_clipart_category" &&
      layer?.presentation === "source_select" ? (
        <>
          <div className="flex gap-1 rounded border border-outline bg-surface-container p-0.5">
            <button
              type="button"
              onClick={() => {
                if (availableClipartAssets[0]) {
                  const clipart = availableClipartAssets[0];
                  if (clipartCategoryMode === "allow_list") {
                    setSelectedCategoryId(clipart.categoryId);
                  }
                  onChange({
                    source: "clipart",
                    clipartAssetId: clipart.id,
                    clipartAssetName: clipart.name,
                    sourceAssetId: clipart.sourceAssetId,
                    previewUrl: clipart.previewUrl,
                    mimeType: clipart.mimeType,
                    sourceWidthPx: clipart.sourceWidthPx,
                    sourceHeightPx: clipart.sourceHeightPx,
                    categoryId: clipart.categoryId,
                  });
                }
              }}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition ${
                currentSource === "clipart"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Clipart
            </button>
            <button
              type="button"
              onClick={() => onChange(uploaded ?? null)}
              className={`flex-1 rounded py-1.5 text-xs font-semibold transition ${
                currentSource === "upload"
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Upload image
            </button>
          </div>
          {currentSource === "clipart" ? clipartSection : uploadSection}
        </>
      ) : null}
      {sourcePolicy === "upload_or_clipart_category" &&
      layer?.presentation === "side_by_side" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
              Clipart
            </p>
            {clipartSection}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
              Upload image
            </p>
            {uploadSection}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function cssShapeClip(shape: string, layerId?: string) {
  if (shape === "circle") return "ellipse(50% 50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") {
    return "polygon(50.00% 0.00%, 62.93% 32.20%, 97.55% 34.55%, 70.92% 56.80%, 79.39% 90.45%, 50.00% 72.00%, 20.61% 90.45%, 29.08% 56.80%, 2.45% 34.55%, 37.07% 32.20%)";
  }
  if (shape === "heart") return "url(#clip-shape-heart)";
  if (shape === "vector" && layerId) return `url(#clip-vector-${layerId})`;
  return "inset(0)";
}

function ShapeClipPaths({ layers }: { layers?: RuntimeLayer[] }) {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <clipPath id="clip-shape-heart" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.85 C 0.1 0.55 0 0.25 0.25 0.12 C 0.4 0 0.5 0.16 0.5 0.28 C 0.5 0.16 0.6 0 0.75 0.12 C 1 0.25 0.9 0.55 0.5 0.85 Z" />
        </clipPath>
        {layers?.map((layer) => {
          if (
            layer.type === "image_shape" &&
            layer.shape.type === "vector" &&
            layer.shape.vectorPath
          ) {
            return (
              <clipPath
                key={layer.id}
                id={`clip-vector-${layer.id}`}
                clipPathUnits="objectBoundingBox"
              >
                <path
                  d={vectorPointsToSvgPathD(
                    layer.shape.vectorPath.points,
                    layer.shape.vectorPath.closed,
                  )}
                />
              </clipPath>
            );
          }
          return null;
        })}
      </defs>
    </svg>
  );
}
