import {
  buildDesignFromForm,
  FONT_FILES,
  getImageShapeClipartCategoryMode,
  getOrderedFormFields,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
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
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ImagePlus,
  Maximize2,
  Minus,
  MousePointer2,
  Plus,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

type PreviewMode = "edit" | "view";
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type PanState = { x: number; y: number };
export type CustomizationUploadImage = (
  field: CustomizationFormField,
  file: File,
) => Promise<ImageShapeFieldValue> | ImageShapeFieldValue;
export type ResolveCustomizationFontUrl = (assetId: string) => string;
export type ResolveCustomizationStaticFontUrl = (fileName: string) => string;
export type ResolveCustomizationAssetUrl = (url: string) => string;

const MIN_FREE_IMAGE_SCALE = 0.02;
const MIN_PREVIEW_ZOOM = 0.05;
const MAX_PREVIEW_ZOOM = 4;
const PREVIEW_ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 56;

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/20 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground shadow hover:bg-accent/90",
        outline: "border border-outline bg-white text-on-surface shadow-sm hover:border-accent hover:bg-accent/10",
        ghost: "text-on-surface hover:bg-surface-container-low",
        destructive: "bg-destructive text-white shadow-sm hover:bg-destructive/90",
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

function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

function freeImageScale(value?: number) {
  return Math.max(MIN_FREE_IMAGE_SCALE, Number.isFinite(value) ? value! : 1);
}

function freeCropOffset(value?: number) {
  return Number.isFinite(value) ? value! : 0;
}

function getFreeImageRect({
  sourceWidthPx,
  sourceHeightPx,
  frameWidthPx,
  frameHeightPx,
  cropScale,
  cropXRatio,
  cropYRatio,
}: {
  sourceWidthPx: number;
  sourceHeightPx: number;
  frameWidthPx: number;
  frameHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
}) {
  const safeSourceWidth = Math.max(1, sourceWidthPx);
  const safeSourceHeight = Math.max(1, sourceHeightPx);
  const safeFrameWidth = Math.max(1, frameWidthPx);
  const safeFrameHeight = Math.max(1, frameHeightPx);
  const baseCoverScale = Math.max(safeFrameWidth / safeSourceWidth, safeFrameHeight / safeSourceHeight);
  const scale = freeImageScale(cropScale);
  const widthPx = safeSourceWidth * baseCoverScale * scale;
  const heightPx = safeSourceHeight * baseCoverScale * scale;
  const centerXPx = safeFrameWidth / 2 + freeCropOffset(cropXRatio) * safeFrameWidth;
  const centerYPx = safeFrameHeight / 2 + freeCropOffset(cropYRatio) * safeFrameHeight;

  return {
    xPx: centerXPx - widthPx / 2,
    yPx: centerYPx - heightPx / 2,
    centerXPx,
    centerYPx,
    widthPx,
    heightPx,
    cropScale: scale,
    cropXRatio: freeCropOffset(cropXRatio),
    cropYRatio: freeCropOffset(cropYRatio),
  };
}

export function ProductCustomizationPreview({
  template,
  values,
  dynamicFonts = [],
  selectedVariantId,
  readOnly = false,
  resolveAssetUrl,
  resolveFontUrl,
  resolveStaticFontUrl,
  onImageValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
  readOnly?: boolean;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
  onImageValueChange?: (fieldId: string, value: ImageShapeFieldValue) => void;
}) {
  const design = useMemo(
    () => buildDesignFromForm({ template, values, designId: "storefront_product_preview", dynamicFonts }),
    [dynamicFonts, template, values],
  );

  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const [mode, setMode] = useState<PreviewMode>(readOnly ? "view" : "edit");
  const [zoom, setZoom] = useState(0.72);
  const [zoomInput, setZoomInput] = useState("72");
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportDrag = useRef<{ x: number; y: number; pan: PanState } | null>(null);
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchZoom = useRef(zoom);
  const scale = zoom;
  const fieldsByLayerId = new Map(template.formFields.map((field) => [field.layerId, field]));
  const editableImageFields = useMemo(() => {
    return template.formFields
      .map((field) => {
        const value = values[field.id];
        if (!value || typeof value !== "object" || !("assetId" in value)) return null;
        const layer = template.layers.find((entry) => entry.id === field.layerId);
        if (!layer || layer.type !== "image_shape") return null;
        return { field, value };
      })
      .filter((entry): entry is { field: CustomizationFormField; value: ImageShapeFieldValue } => entry !== null);
  }, [template.formFields, template.layers, values]);
  const [selectedImageFieldId, setSelectedImageFieldId] = useState("");
  const selectedImageField =
    editableImageFields.find((entry) => entry.field.id === selectedImageFieldId) ?? null;

  useEffect(() => {
    if (!selectedImageFieldId || editableImageFields.some((entry) => entry.field.id === selectedImageFieldId)) {
      return;
    }
    setSelectedImageFieldId("");
  }, [editableImageFields, selectedImageFieldId]);

  const setCommittedZoom = useCallback((nextZoom: number) => {
    const clamped = Math.min(MAX_PREVIEW_ZOOM, Math.max(MIN_PREVIEW_ZOOM, nextZoom));
    setZoom(clamped);
    setZoomInput(String(Math.round(clamped * 100)));
  }, []);

  const fitToView = useCallback(() => {
    if (!viewportRef.current) return;
    const bounds = viewportRef.current.getBoundingClientRect();
    const availableWidth = Math.max(1, bounds.width - FIT_PADDING_PX);
    const availableHeight = Math.max(1, bounds.height - FIT_PADDING_PX);
    setCommittedZoom(Math.min(availableWidth / width, availableHeight / height));
    setPan({ x: 0, y: 0 });
  }, [height, setCommittedZoom, width]);

  useEffect(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    if (readOnly && mode !== "view") {
      setMode("view");
      setSelectedImageFieldId("");
    }
  }, [mode, readOnly]);

  function commitZoomInput() {
    const parsed = Number.parseFloat(zoomInput.replace("%", ""));
    if (!Number.isFinite(parsed)) {
      setZoomInput(String(Math.round(zoom * 100)));
      return;
    }
    setCommittedZoom(parsed / 100);
  }

  function updateImageValue(fieldId: string, value: ImageShapeFieldValue) {
    onImageValueChange?.(fieldId, value);
  }

  function adjustSelectedImage(
    patch: Partial<Pick<ImageShapeFieldValue, "cropScale" | "cropXRatio" | "cropYRatio" | "cropRotationDeg">>,
  ) {
    if (!selectedImageField) return;
    updateImageValue(selectedImageField.field.id, { ...selectedImageField.value, ...patch });
  }

  return (
    <div
      className="relative mx-auto flex h-[min(72vh,740px)] min-h-[520px] w-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low"
      data-selected-variant-id={selectedVariantId ?? ""}
      data-preview-background-url={background?.previewUrl ?? ""}
    >
      <FontLoader
        layers={design.layers}
        dynamicFonts={dynamicFonts}
        resolveFontUrl={resolveFontUrl}
        resolveStaticFontUrl={resolveStaticFontUrl}
      />
      <ShapeClipPaths layers={design.layers} />
      <div className="flex h-14 shrink-0 items-center gap-3 border-b border-outline-variant bg-white/95 px-3 shadow-sm backdrop-blur sm:px-4">
        {!readOnly ? (
          <div className="inline-flex rounded-md border border-outline bg-surface-container-low p-0.5">
            {(["edit", "view"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => setMode(entry)}
                className={`inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-bold uppercase tracking-[0.08em] transition ${
                  mode === entry
                    ? "bg-white text-on-surface shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <MousePointer2 className="size-3.5" />
                {entry}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          <CanvasAction label="Zoom out" onClick={() => setCommittedZoom(zoom - PREVIEW_ZOOM_STEP)}>
            <Minus className="size-3.5" />
          </CanvasAction>
          <label className="flex h-8 items-center rounded-md border border-outline bg-white px-2">
            <input
              aria-label="Preview zoom percentage"
              value={zoomInput}
              onChange={(event) => setZoomInput(event.target.value)}
              onBlur={commitZoomInput}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setZoomInput(String(Math.round(zoom * 100)));
                  event.currentTarget.blur();
                }
              }}
              className="w-10 bg-transparent text-right text-xs font-bold text-on-surface outline-none"
            />
            <span className="text-[11px] text-on-surface-variant">%</span>
          </label>
          <CanvasAction label="Zoom in" onClick={() => setCommittedZoom(zoom + PREVIEW_ZOOM_STEP)}>
            <Plus className="size-3.5" />
          </CanvasAction>
          <CanvasAction label="Fit canvas" onClick={fitToView}>
            <Maximize2 className="size-3.5" />
          </CanvasAction>
        </div>
        <span className="ml-auto hidden text-xs text-on-surface-variant md:inline">
          {readOnly ? "Read-only order preview" : mode === "edit" ? "Click an uploaded image to crop" : "Drag canvas to pan"}
        </span>
      </div>
      <div className="sticky top-0 z-20 flex h-[76px] shrink-0 items-center border-b border-outline-variant bg-surface-container-low/95 px-3 shadow-sm backdrop-blur sm:px-4">
        {!readOnly && mode === "edit" && selectedImageField ? (
          <div className="flex min-w-0 items-center gap-3">
            <div className="min-w-0 rounded-md border border-outline-variant bg-white px-3 py-2">
              <p className="max-w-48 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant">
                {selectedImageField.field.label}
              </p>
            </div>
            <div className="flex min-w-0 gap-1.5 overflow-x-auto py-1">
              <CanvasAction label="Zoom out image" onClick={() => adjustSelectedImage({ cropScale: Math.max(MIN_FREE_IMAGE_SCALE, (selectedImageField.value.cropScale ?? 1) / 1.1) })}><Minus className="size-3.5" /></CanvasAction>
              <CanvasAction label="Zoom in image" onClick={() => adjustSelectedImage({ cropScale: (selectedImageField.value.cropScale ?? 1) * 1.1 })}><Plus className="size-3.5" /></CanvasAction>
              <CanvasAction label="Rotate image left" onClick={() => adjustSelectedImage({ cropRotationDeg: (selectedImageField.value.cropRotationDeg ?? 0) - 5 })}><RotateCcw className="size-3.5" /></CanvasAction>
              <CanvasAction label="Rotate image right" onClick={() => adjustSelectedImage({ cropRotationDeg: (selectedImageField.value.cropRotationDeg ?? 0) + 5 })}><RotateCw className="size-3.5" /></CanvasAction>
              <CanvasAction label="Move image left" onClick={() => adjustSelectedImage({ cropXRatio: (selectedImageField.value.cropXRatio ?? 0) - 0.05 })}><ArrowLeft className="size-3.5" /></CanvasAction>
              <CanvasAction label="Move image right" onClick={() => adjustSelectedImage({ cropXRatio: (selectedImageField.value.cropXRatio ?? 0) + 0.05 })}><ArrowRight className="size-3.5" /></CanvasAction>
              <CanvasAction label="Move image up" onClick={() => adjustSelectedImage({ cropYRatio: (selectedImageField.value.cropYRatio ?? 0) - 0.05 })}><ArrowUp className="size-3.5" /></CanvasAction>
              <CanvasAction label="Move image down" onClick={() => adjustSelectedImage({ cropYRatio: (selectedImageField.value.cropYRatio ?? 0) + 0.05 })}><ArrowDown className="size-3.5" /></CanvasAction>
              <CanvasAction label="Reset image" onClick={() => adjustSelectedImage({ cropScale: 1, cropXRatio: 0, cropYRatio: 0, cropRotationDeg: 0 })}><RotateCcw className="size-3.5" /></CanvasAction>
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center text-sm font-medium text-on-surface-variant">
            {readOnly ? "This preview uses the customer's submitted values and cannot be edited." : mode === "edit" ? "Select an uploaded image to show crop actions." : "Canvas actions are available in Edit mode."}
          </div>
        )}
      </div>
      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden bg-[linear-gradient(90deg,rgba(28,27,27,0.035)_1px,transparent_1px),linear-gradient(rgba(28,27,27,0.035)_1px,transparent_1px)] bg-[size:28px_28px] ${
          mode === "view" ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        style={{ touchAction: mode === "view" ? "none" : "auto" }}
        onPointerDown={(event) => {
          if (mode !== "view") return;
          activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (activePointers.current.size === 1) {
            viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
          } else if (activePointers.current.size === 2) {
            const points = Array.from(activePointers.current.values());
            initialPinchDist.current = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            initialPinchZoom.current = zoom;
          }
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (mode !== "view") return;
          if (activePointers.current.has(event.pointerId)) {
            activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          }

          if (activePointers.current.size === 2 && initialPinchDist.current !== null) {
            const points = Array.from(activePointers.current.values());
            const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            setCommittedZoom(initialPinchZoom.current * (dist / initialPinchDist.current));
          } else if (activePointers.current.size === 1 && viewportDrag.current) {
            setPan({
              x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
              y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
            });
          }
        }}
        onPointerUp={(event) => {
          activePointers.current.delete(event.pointerId);
          if (activePointers.current.size < 2) initialPinchDist.current = null;
          if (activePointers.current.size === 1) {
            const point = Array.from(activePointers.current.values())[0];
            viewportDrag.current = { x: point.x, y: point.y, pan };
          } else if (activePointers.current.size === 0) {
            viewportDrag.current = null;
          }
        }}
        onPointerCancel={(event) => {
          activePointers.current.delete(event.pointerId);
          if (activePointers.current.size < 2) initialPinchDist.current = null;
          if (activePointers.current.size === 0) viewportDrag.current = null;
        }}
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
            if (mode === "edit" && event.target === event.currentTarget) setSelectedImageFieldId("");
          }}
        >
          {background ? (
            <img
              src={resolveAssetUrl?.(background.previewUrl) ?? background.previewUrl}
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
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f5f5f5", fontSize: "14px", color: "#717171" }}>
              Variant image unavailable
            </div>
          )}
          {[...design.layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
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
            const uploadValue = fieldValue && typeof fieldValue === "object" && "assetId" in fieldValue
              ? fieldValue
              : null;
            return (
              <PreviewImageShape
                key={layer.id}
                layer={layer}
                width={width}
                height={height}
                scale={scale}
                mode={mode}
                resolveAssetUrl={resolveAssetUrl}
                value={uploadValue}
                onChange={field && uploadValue && onImageValueChange
                  ? (nextValue) => updateImageValue(field.id, nextValue)
                  : undefined}
                selected={Boolean(field && selectedImageField?.field.id === field.id)}
                onSelect={!readOnly && field && uploadValue ? () => setSelectedImageFieldId(field.id) : undefined}
              />
            );
          })}
        </div>
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
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function ProductCustomizationForm({
  template,
  values,
  dynamicFonts = [],
  message,
  resolveAssetUrl,
  onMessageChange,
  onUploadImage,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  message?: string;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onMessageChange?: (message: string) => void;
  onUploadImage?: CustomizationUploadImage;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  const [uploadingFieldId, setUploadingFieldId] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const activeMessage = message ?? internalMessage;
  const validation = useMemo(
    () => validateCustomizationValues({ template, values }),
    [template, values],
  );

  function setMessage(nextMessage: string) {
    setInternalMessage(nextMessage);
    onMessageChange?.(nextMessage);
  }

  async function uploadImage(field: CustomizationFormField, file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage("Use a PNG or JPEG image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image exceeds the 20 MB limit.");
      return;
    }
    if (!onUploadImage) {
      setMessage("Image upload is not configured.");
      return;
    }

    setUploadingFieldId(field.id);
    try {
      const value = await onUploadImage(field, file);
      onValueChange(field.id, value);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingFieldId("");
    }
  }

  const orderedFields = getOrderedFormFields(template);

  return (
      <div className="divide-y divide-outline-variant">
      {activeMessage ? (
        <p className="px-0 py-3 text-sm text-destructive">{activeMessage}</p>
      ) : null}
      {orderedFields.map((field, index) => {
        const layer = template.layers.find((entry) => entry.id === field.layerId);
        if (!layer) return null;
        return (
          <FormField
            key={field.id}
            field={field}
            layer={layer}
            stepNumber={index + 1}
            value={values[field.id]}
            issue={validation.issues.find((issue) => issue.fieldId === field.id)?.message}
            uploading={uploadingFieldId === field.id}
            dynamicFonts={dynamicFonts}
            resolveAssetUrl={resolveAssetUrl}
            onChange={(value) => {
              onValueChange(field.id, value);
              setMessage("");
            }}
            onUpload={(file) => uploadImage(field, file)}
          />
        );
      })}
    </div>
  );
}

export function CustomizationStudio({
  template,
  values,
  dynamicFonts = [],
  selectedVariantId,
  message,
  resolveAssetUrl,
  resolveFontUrl,
  resolveStaticFontUrl,
  onMessageChange,
  onUploadImage,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
  message?: string;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
  onMessageChange?: (message: string) => void;
  onUploadImage?: CustomizationUploadImage;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  return (
    <div className="grid min-h-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
      <ProductCustomizationPreview
        template={template}
        values={values}
        dynamicFonts={dynamicFonts}
        selectedVariantId={selectedVariantId}
        resolveAssetUrl={resolveAssetUrl}
        resolveFontUrl={resolveFontUrl}
        resolveStaticFontUrl={resolveStaticFontUrl}
        onImageValueChange={(fieldId, value) => onValueChange(fieldId, value)}
      />
      <aside className="min-h-0 overflow-y-auto bg-white">
        <ProductCustomizationForm
          template={template}
          values={values}
          dynamicFonts={dynamicFonts}
          message={message}
          resolveAssetUrl={resolveAssetUrl}
          onMessageChange={onMessageChange}
          onUploadImage={onUploadImage}
          onValueChange={onValueChange}
        />
      </aside>
    </div>
  );
}

export {
  ProductCustomizationPreview as CustomizationCanvas,
  ProductCustomizationForm as CustomizationForm,
};

function FontLoader({
  layers,
  dynamicFonts = [],
  resolveFontUrl,
  resolveStaticFontUrl,
}: {
  layers: RuntimeLayer[];
  dynamicFonts?: DynamicFontFamily[];
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
}) {
  const fontFamilies = Array.from(
    new Set(
      layers
        .filter((layer): layer is Extract<RuntimeLayer, { type: "text" }> => layer.type === "text" && !!layer.fontId)
        .map((layer) => layer.fontId),
    ),
  );

  return (
    <>
      {fontFamilies.flatMap((familyId) => {
        const dynamicFont = dynamicFonts.find((font) => font.id === familyId);
        if (!dynamicFont) {
          return ["regular", "bold", "italic", "bold-italic"].map((weight) => {
            const variantId = `${familyId}-${weight}`;
            const file = FONT_FILES[variantId];
            if (!file) return null;
            return (
              <style
                key={variantId}
                dangerouslySetInnerHTML={{
                  __html: `
                    @font-face {
                      font-family: '${variantId}';
                      src: url('${resolveStaticFontUrl?.(file) ?? `/fonts/${file}`}') format('truetype');
                    }
                  `,
                }}
              />
            );
          });
        }

        return [
          dynamicFont.regularAssetId,
          dynamicFont.boldAssetId,
          dynamicFont.italicAssetId,
          dynamicFont.boldItalicAssetId,
        ]
          .filter((assetId): assetId is string => Boolean(assetId))
          .map((assetId) => (
            <style
              key={assetId}
              dangerouslySetInnerHTML={{
                __html: `
                  @font-face {
                    font-family: '${assetId}';
                    src: url('${resolveFontUrl?.(assetId) ?? assetId}') format('truetype');
                  }
                `,
              }}
            />
          ));
      })}
    </>
  );
}

function PreviewText({
  layer,
  width,
  height,
  scale,
}: {
  layer: Extract<RuntimeLayer, { type: "text" }>;
  width: number;
  height: number;
  scale: number;
}) {
  const closedTextPath = layer.path.type === "closed_ellipse";
  const layerWidthPx = layer.geometry.widthRatio * width;
  const layerHeightPx = closedTextPath
    ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height)
    : layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const left = (layer.geometry.xRatio * width - layerWidthPx / 2) * scale;
  const top = (layer.geometry.yRatio * height - layerHeightPx / 2) * scale;

  if (layer.path.type !== "straight") {
    const pathId = `storefront_product_text_path_${layer.id}`;
    const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
    const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
    const pathAttrs = getTextPathRenderAttributes({
      path: layer.path,
      align: layer.align,
      widthPx: layerWidthPx,
      heightPx: layerHeightPx,
      textWidthPx,
      charCount: layer.text.length,
      wordCount,
    });
    const renderPath =
      pathAttrs.pathStartAngleDeg != null
        ? { ...layer.path, startAngleDeg: pathAttrs.pathStartAngleDeg }
        : layer.path;
    const pathD = getTextPathSvgD({ path: renderPath, widthPx: layerWidthPx, heightPx: layerHeightPx });

    return (
      <svg
        className="absolute overflow-visible"
        style={{
          left,
          top,
          width: layerWidthPx * scale,
          height: layerHeightPx * scale,
          transform: `rotate(${layer.geometry.rotationDeg}deg)`,
          transformOrigin: "center",
        }}
        viewBox={`0 0 ${layerWidthPx} ${layerHeightPx}`}
      >
        <defs>
          <path id={pathId} d={pathD} />
        </defs>
        <text
          fontSize={layer.fontSizePt}
          fontFamily={layer.fontId}
          fontWeight={layer.isBold ? 700 : 400}
          fontStyle={layer.isItalic ? "italic" : "normal"}
          fill={layer.color}
          textAnchor={pathAttrs.textAnchor}
          dominantBaseline="middle"
          textLength={pathAttrs.textLength}
          lengthAdjust={pathAttrs.lengthAdjust}
          wordSpacing={pathAttrs.wordSpacingPx ?? 0}
        >
          <textPath href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
            {pathAttrs.dy ? <tspan dy={pathAttrs.dy}>{layer.text}</tspan> : layer.text}
          </textPath>
        </text>
      </svg>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        overflow: "hidden",
        whiteSpace: "pre-line",
        left: layer.geometry.xRatio * width * scale,
        top: layer.geometry.yRatio * height * scale,
        width: layerWidthPx * scale,
        color: layer.color,
        fontSize: layer.fontSizePt * scale,
        lineHeight: 1.35,
        fontFamily: layer.fontId,
        fontWeight: layer.isBold ? 700 : 400,
        fontStyle: layer.isItalic ? "italic" : "normal",
        textAlign: layer.align === "justified" ? "justify" : layer.align,
        transform: `translate(-50%, -50%) rotate(${layer.geometry.rotationDeg}deg)`,
      }}
    >
      {layer.text}
    </div>
  );
}

function PreviewImageShape({
  layer,
  width,
  height,
  scale,
  mode,
  resolveAssetUrl,
  value,
  onChange,
  selected,
  onSelect,
}: {
  layer: Extract<RuntimeLayer, { type: "image_shape" }>;
  width: number;
  height: number;
  scale: number;
  mode: PreviewMode;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  value?: ImageShapeFieldValue | null;
  onChange?: (value: ImageShapeFieldValue) => void;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: width, heightPx: height } });
  const imageRect = getFreeImageRect({
    sourceWidthPx: value?.sourceWidthPx ?? layer.sourceWidthPx,
    sourceHeightPx: value?.sourceHeightPx ?? layer.sourceHeightPx,
    frameWidthPx: rect.widthPx,
    frameHeightPx: rect.heightPx,
    cropScale: value?.cropScale ?? layer.cropScale,
    cropXRatio: value?.cropXRatio ?? layer.cropXRatio,
    cropYRatio: value?.cropYRatio ?? layer.cropYRatio,
  });
  const editable = Boolean(value && onChange);
  const clipPath = cssShapeClip(layer.shape.type, layer.id);

  function updateFromImageRect(next: { centerXPx: number; centerYPx: number; widthPx: number }) {
    if (!value || !onChange) return;
    onChange({
      ...value,
      cropScale: Math.max(MIN_FREE_IMAGE_SCALE, (next.widthPx / imageRect.widthPx) * imageRect.cropScale),
      cropXRatio: (next.centerXPx - rect.widthPx / 2) / Math.max(1, rect.widthPx),
      cropYRatio: (next.centerYPx - rect.heightPx / 2) / Math.max(1, rect.heightPx),
    });
  }

  function startResize(event: ReactPointerEvent<HTMLButtonElement>, corner: ResizeCorner) {
    if (!editable || !value) return;
    event.preventDefault();
    event.stopPropagation();
    onSelect?.();

    const startX = event.clientX;
    const startY = event.clientY;
    const left = imageRect.xPx;
    const top = imageRect.yPx;
    const right = imageRect.xPx + imageRect.widthPx;
    const bottom = imageRect.yPx + imageRect.heightPx;
    const fixed = {
      x: corner === "nw" || corner === "sw" ? right : left,
      y: corner === "nw" || corner === "ne" ? bottom : top,
    };
    const moving = {
      x: corner === "nw" || corner === "sw" ? left : right,
      y: corner === "nw" || corner === "ne" ? top : bottom,
    };
    const vector = { x: moving.x - fixed.x, y: moving.y - fixed.y };
    const vectorLengthSq = Math.max(1, vector.x * vector.x + vector.y * vector.y);
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(pointer: PointerEvent) {
      const dx = (pointer.clientX - startX) / scale;
      const dy = (pointer.clientY - startY) / scale;
      const nextVector = { x: moving.x + dx - fixed.x, y: moving.y + dy - fixed.y };
      const nextScale = Math.max(MIN_FREE_IMAGE_SCALE, (nextVector.x * vector.x + nextVector.y * vector.y) / vectorLengthSq);
      updateFromImageRect({
        centerXPx: fixed.x + (vector.x * nextScale) / 2,
        centerYPx: fixed.y + (vector.y * nextScale) / 2,
        widthPx: imageRect.widthPx * nextScale,
      });
    }

    function stop() {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    }

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  }

  return (
    <div
      style={{
        position: "absolute",
        left: rect.xPx * scale,
        top: rect.yPx * scale,
        width: rect.widthPx * scale,
        height: rect.heightPx * scale,
        transform: `rotate(${layer.geometry.rotationDeg}deg)`,
        pointerEvents: mode === "edit" ? "auto" : "none",
        touchAction: "none",
      }}
      onWheel={(event) => {
        if (mode !== "edit" || !editable || !value) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect?.();
        const nextCropScale = Math.max(MIN_FREE_IMAGE_SCALE, imageRect.cropScale * (event.deltaY < 0 ? 1.06 : 1 / 1.06));
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerXPx = (event.clientX - bounds.left) / scale;
        const pointerYPx = (event.clientY - bounds.top) / scale;
        const scaleRatio = nextCropScale / imageRect.cropScale;
        updateFromImageRect({
          centerXPx: pointerXPx - (pointerXPx - imageRect.centerXPx) * scaleRatio,
          centerYPx: pointerYPx - (pointerYPx - imageRect.centerYPx) * scaleRatio,
          widthPx: imageRect.widthPx * scaleRatio,
        });
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          cursor: editable && mode === "edit" ? "move" : "default",
          clipPath 
        }}
      onPointerDown={(event) => {
          if (mode !== "edit" || !value || !onChange) return;
        onSelect?.();
        const startValue = value;
        const updateImage = onChange;
        event.preventDefault();
          event.stopPropagation();
        const startX = event.clientX;
        const startY = event.clientY;
          const startCropX = imageRect.cropXRatio;
          const startCropY = imageRect.cropYRatio;
        event.currentTarget.setPointerCapture(event.pointerId);

        function move(pointer: PointerEvent) {
          const dx = (pointer.clientX - startX) / scale;
          const dy = (pointer.clientY - startY) / scale;
          updateImage({
            ...startValue,
              cropScale: imageRect.cropScale,
              cropXRatio: startCropX + dx / Math.max(1, rect.widthPx),
              cropYRatio: startCropY + dy / Math.max(1, rect.heightPx),
          });
        }

        function stop() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        }

        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
      >
        <img
          src={resolveAssetUrl?.(value?.previewUrl ?? layer.previewUrl) ?? value?.previewUrl ?? layer.previewUrl}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            pointerEvents: "none",
            maxWidth: "none",
            userSelect: "none",
            left: imageRect.xPx * scale,
            top: imageRect.yPx * scale,
            width: imageRect.widthPx * scale,
            height: imageRect.heightPx * scale,
            transform: `rotate(${value?.cropRotationDeg ?? layer.cropRotationDeg}deg)`,
            transformOrigin: "center",
          }}
        />
      </div>
      {selected && editable && mode === "edit" ? (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize image ${corner}`}
              className="absolute z-10 flex size-10 items-center justify-center md:size-6"
              style={{
                left: (corner === "nw" || corner === "sw" ? imageRect.xPx : imageRect.xPx + imageRect.widthPx) * scale,
                top: (corner === "nw" || corner === "ne" ? imageRect.yPx : imageRect.yPx + imageRect.heightPx) * scale,
                transform: "translate(-50%, -50%)",
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                touchAction: "none",
              }}
              onPointerDown={(event) => startResize(event, corner)}
            >
              <span className="size-4 rounded-full border-2 border-white bg-primary shadow-[0_2px_10px_rgba(28,27,27,0.22)] md:size-3" />
            </button>
          ))}
          <div
            className="pointer-events-none absolute border-2 border-primary/80"
            style={{
              left: imageRect.xPx * scale,
              top: imageRect.yPx * scale,
              width: imageRect.widthPx * scale,
              height: imageRect.heightPx * scale,
            }}
          />
          <div className="pointer-events-none absolute inset-0 border border-primary/45" />
        </>
      ) : null}
    </div>
  );
}

function FormField({
  field,
  layer,
  stepNumber,
  value,
  issue,
  uploading,
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
  const imageLayer = layer.type === "image_shape" ? (layer as ImageShapeEditorLayer) : null;
  return (
    <section className="py-4">
      {/* Step header */}
      <div className="mb-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">
          STEP {stepNumber}{field.helpText ? (
            <span className="ml-2 text-[11px] font-normal normal-case tracking-normal text-on-surface-variant">{field.helpText}</span>
          ) : null}
        </p>
        <label className="mt-0.5 block text-sm font-semibold text-on-surface">
          {field.label}{field.required ? (
            <span className="ml-1 text-destructive" aria-hidden>*</span>
          ) : null}
        </label>
      </div>
      {layer.type === "text" ? (
        <TextField field={field} layer={layer} value={value} onChange={onChange} />
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
      {issue ? <p className="mt-2 text-xs font-medium text-destructive">{issue}</p> : null}
    </section>
  );
}

function TextField({
  field,
  layer,
  value,
  onChange,
}: {
  field: CustomizationFormField;
  layer: Extract<CustomizationLayer, { type: "text" }>;
  value: CustomizationFieldValue | undefined;
  onChange: (value: TextFieldValue) => void;
}) {
  const textValue = value && "text" in value ? value : { text: "" };
  const pathText = layer.text.path.type !== "straight";

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={pathText ? textValue.text : textValue.text.replace(/\n/g, " ")}
        placeholder={field.placeholder ?? "Letter limit varies, refer to preview to confirm your text is correct"}
        onChange={(event) =>
          onChange({
            ...textValue,
            text: event.target.value,
          })
        }
        className="h-10 w-full rounded border border-outline bg-white px-3 text-sm text-on-surface outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
      {layer.text.colorPolicy.mode === "shopper_selectable" ? (
        (() => {
          const colorPolicy = layer.text.colorPolicy;
          return (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">
                Text Color
              </p>
              <div className="flex flex-wrap gap-2">
                {colorPolicy.options.map((option) => {
                  const selected = (textValue.color ?? colorPolicy.defaultColor) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      title={option.label}
                      onClick={() => onChange({ ...textValue, color: option.value })}
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
      ) : null}
      {layer.text.fontPolicy.mode === "shopper_selectable" ? (
        (() => {
          const fontPolicy = layer.text.fontPolicy;
          return (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Font</p>
              <div className="flex flex-wrap gap-2">
                {fontPolicy.options.map((option) => {
                  const selected = (textValue.fontId ?? fontPolicy.defaultFontId) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      title={option.label}
                      onClick={() => onChange({ ...textValue, fontId: option.value })}
                      className={`flex h-9 items-center justify-center rounded border px-3 text-sm transition ${
                        selected
                          ? "border-accent bg-accent/10 text-accent font-semibold"
                          : "border-outline bg-white text-on-surface hover:border-accent"
                      }`}
                      style={{ fontFamily: option.value }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()
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
  const clipartCategoryMode = layer ? getImageShapeClipartCategoryMode(layer) : "fixed";
  const uploaded = value && typeof value === "object" && "assetId" in value ? value : null;
  const clipartValue =
    value && typeof value === "object" && "source" in value && value.source === "clipart" ? value : null;
  const scopedClipartCategories =
    !layer
      ? []
      : clipartCategoryMode === "allow_list"
        ? (layer.allowedClipartCategories ?? [])
        : layer.clipartCategory
          ? [layer.clipartCategory]
          : [];
  const initialCategoryId =
    clipartValue?.categoryId ??
    (clipartCategoryMode === "fixed" ? layer?.clipartCategory?.id : scopedClipartCategories[0]?.id) ??
    "";
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (clipartCategoryMode === "fixed") {
        return layer?.clipartCategory?.id ?? "";
      }
      const allowedIds = new Set(scopedClipartCategories.map((category) => category.id));
      if (current && allowedIds.has(current)) {
        return current;
      }
      if (clipartValue?.categoryId && allowedIds.has(clipartValue.categoryId)) {
        return clipartValue.categoryId;
      }
      return scopedClipartCategories[0]?.id ?? "";
    });
  }, [clipartCategoryMode, layer?.clipartCategory?.id, clipartValue?.categoryId, layer?.id, scopedClipartCategories]);
  const scopedCategoryIds = new Set(scopedClipartCategories.map((category) => category.id));
  const activeCategoryId =
    clipartCategoryMode === "fixed"
      ? layer?.clipartCategory?.id ?? ""
      : selectedCategoryId || scopedClipartCategories[0]?.id || "";
  const availableClipartAssets = (layer?.clipartAssets ?? []).filter((asset) => {
    if (!asset.active || !scopedCategoryIds.has(asset.categoryId)) return false;
    if (!activeCategoryId) return true;
    return asset.categoryId === activeCategoryId;
  });
  const currentSource =
    sourcePolicy === "clipart_category_only" ? "clipart" : clipartValue ? "clipart" : "upload";

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
      {clipartCategoryMode === "allow_list" && scopedClipartCategories.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Category</p>
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
        <p className="text-xs font-semibold text-on-surface-variant">{layer.clipartCategory.name}</p>
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
                src={resolveAssetUrl?.(clipart.previewUrl) ?? clipart.previewUrl}
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
      {sourcePolicy === "upload_or_clipart_category" && layer?.presentation === "source_select" ? (
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
      {sourcePolicy === "upload_or_clipart_category" && layer?.presentation === "side_by_side" ? (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Clipart</p>
            {clipartSection}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-on-surface-variant">Upload image</p>
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
          if (layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath) {
            return (
              <clipPath key={layer.id} id={`clip-vector-${layer.id}`} clipPathUnits="objectBoundingBox">
                <path d={vectorPointsToSvgPathD(layer.shape.vectorPath.points, layer.shape.vectorPath.closed)} />
              </clipPath>
            );
          }
          return null;
        })}
      </defs>
    </svg>
  );
}
