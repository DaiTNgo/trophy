import {
  buildDesignFromForm,
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

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

type PreviewMode = "edit" | "view";
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type PanState = { x: number; y: number };

const MIN_FREE_IMAGE_SCALE = 0.02;
const MIN_PREVIEW_ZOOM = 0.05;
const MAX_PREVIEW_ZOOM = 4;
const PREVIEW_ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 56;

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
  onImageValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
  onImageValueChange?: (fieldId: string, value: ImageShapeFieldValue) => void;
}) {
  const design = useMemo(
    () => buildDesignFromForm({ template, values, designId: "storefront_product_preview", dynamicFonts }),
    [dynamicFonts, template, values],
  );

  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const [mode, setMode] = useState<PreviewMode>("edit");
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
      className="relative mx-auto flex h-[min(72vh,740px)] min-h-[520px] w-full flex-col overflow-hidden rounded-lg border border-outline-variant bg-[#f5f2ec]"
      data-selected-variant-id={selectedVariantId ?? ""}
      data-preview-background-url={background?.previewUrl ?? ""}
    >
      <FontLoader layers={design.layers} dynamicFonts={dynamicFonts} />
      <ShapeClipPaths layers={design.layers} />
      <div
        className="flex flex-wrap items-center gap-3 border-b border-outline-variant bg-white/95 px-3 py-3 shadow-sm backdrop-blur sm:px-4"
      >
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
        {mode === "edit" && selectedImageField ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 rounded-md border border-outline-variant bg-surface-container-low px-2 py-1.5">
            <span className="max-w-36 truncate px-1 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              {selectedImageField.field.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
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
          {mode === "edit" ? "Click an uploaded image to crop" : "Drag canvas to pan"}
        </span>
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
          className="absolute left-1/2 top-1/2 bg-white shadow-[0_18px_70px_rgba(28,27,27,0.16)]"
          style={{
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
              src={background.previewUrl}
              alt=""
              data-preview-background-image=""
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container text-sm text-on-surface-variant">
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
                value={uploadValue}
                onChange={field && uploadValue && onImageValueChange
                  ? (nextValue) => updateImageValue(field.id, nextValue)
                  : undefined}
                selected={Boolean(field && selectedImageField?.field.id === field.id)}
                onSelect={field && uploadValue ? () => setSelectedImageFieldId(field.id) : undefined}
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
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center rounded-md border border-outline bg-white px-2 text-xs font-bold text-on-surface transition hover:border-primary hover:bg-primary-fixed/30"
    >
      {children}
    </button>
  );
}

export function ProductCustomizationForm({
  template,
  values,
  dynamicFonts = [],
  message,
  uploadingFieldId,
  onUploadingFieldIdChange,
  onMessageChange,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  message: string;
  uploadingFieldId: string;
  onUploadingFieldIdChange: (fieldId: string) => void;
  onMessageChange: (message: string) => void;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  const validation = useMemo(
    () => validateCustomizationValues({ template, values }),
    [template, values],
  );

  async function uploadImage(field: CustomizationFormField, file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      onMessageChange("Use a PNG or JPEG image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onMessageChange("Image exceeds the 20 MB limit.");
      return;
    }

    onUploadingFieldIdChange(field.id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/storefront/customizations/assets`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Upload-Token": getUploadToken() },
        body: file,
      });
      const payload = (await response.json()) as {
        asset?: { id: string; widthPx: number; heightPx: number; contentUrl: string };
        error?: string;
      };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? "Upload failed.");
      onValueChange(field.id, {
        assetId: payload.asset.id,
        previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
        sourceWidthPx: payload.asset.widthPx,
        sourceHeightPx: payload.asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        cropRotationDeg: 0,
      });
      onMessageChange("");
    } catch (error) {
      onMessageChange(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      onUploadingFieldIdChange("");
    }
  }

  return (
    <div className="space-y-5">
      {message ? (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          {message}
        </p>
      ) : null}
      {!validation.valid ? (
        <div className="space-y-2 rounded-lg bg-white px-4 py-3">
          {validation.issues.map((issue) => (
            <p key={`${issue.fieldId}-${issue.code}`} className="text-sm text-destructive">
              {issue.message}
            </p>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-white px-4 py-3 text-sm text-on-surface-variant">
          Preview updates on the selected variant image. Layer placement stays fixed to the same canvas.
        </p>
      )}
      <div className="space-y-4">
        {getOrderedFormFields(template).map((field) => {
          const layer = template.layers.find((entry) => entry.id === field.layerId);
          if (!layer) return null;
          return (
            <FormField
              key={field.id}
              field={field}
              layer={layer}
              value={values[field.id]}
              issue={validation.issues.find((issue) => issue.fieldId === field.id)?.message}
              uploading={uploadingFieldId === field.id}
              dynamicFonts={dynamicFonts}
              onChange={(value) => {
                onValueChange(field.id, value);
                onMessageChange("");
              }}
              onUpload={(file) => uploadImage(field, file)}
            />
          );
        })}
      </div>
    </div>
  );
}

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

function FontLoader({
  layers,
  dynamicFonts = [],
}: {
  layers: RuntimeLayer[];
  dynamicFonts?: DynamicFontFamily[];
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
        if (!dynamicFont) return [];

        return [
          dynamicFont.regularAssetId,
          dynamicFont.boldAssetId,
          dynamicFont.italicAssetId,
          dynamicFont.boldItalicAssetId,
        ]
          .filter(Boolean)
          .map((assetId) => (
            <style
              key={assetId}
              dangerouslySetInnerHTML={{
                __html: `
                  @font-face {
                    font-family: '${assetId}';
                    src: url('${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${assetId}') format('truetype');
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
        }}
        viewBox={`0 0 ${layerWidthPx} ${layerHeightPx}`}
      >
        <defs>
          <path id={pathId} d={pathD} />
        </defs>
        <text
          fontSize={layer.fontSizePt}
          fontFamily={layer.fontId}
          fontWeight={layer.isBold ? "bold" : "normal"}
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
      className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden whitespace-pre-line text-center font-semibold"
      style={{
        left: layer.geometry.xRatio * width * scale,
        top: layer.geometry.yRatio * height * scale,
        width: layerWidthPx * scale,
        color: layer.color,
        fontSize: layer.fontSizePt * scale,
        fontFamily: layer.fontId,
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
      className="absolute"
      style={{
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
        className={`absolute inset-0 overflow-hidden ${editable && mode === "edit" ? "cursor-move" : ""}`}
        style={{ clipPath }}
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
          src={value?.previewUrl ?? layer.previewUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
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
  value,
  issue,
  uploading,
  onChange,
  onUpload,
}: {
  field: CustomizationFormField;
  layer: CustomizationLayer;
  value: CustomizationFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  dynamicFonts?: DynamicFontFamily[];
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => void;
}) {
  const imageLayer = layer.type === "image_shape" ? (layer as ImageShapeEditorLayer) : null;
  const kind = layer.type === "text" ? "Text" : "Image";
  return (
    <section className="rounded-xl border border-outline-variant bg-white p-4 shadow-[0_4px_18px_rgba(28,27,27,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="block truncate text-sm font-bold text-on-surface">
            {field.label}
          </label>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
            {kind}
          </p>
        </div>
        {field.required ? (
          <span className="shrink-0 rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-on-primary-fixed">
            Required
          </span>
        ) : null}
      </div>
      {layer.type === "text" ? (
        <TextField field={field} layer={layer} value={value} onChange={onChange} />
      ) : (
        <ImageField layer={imageLayer} value={value} uploading={uploading} onChange={onChange} onUpload={onUpload} />
      )}
      {field.helpText ? <p className="mt-2 text-xs text-on-surface-variant">{field.helpText}</p> : null}
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
    <div className="space-y-3">
      <textarea
        rows={pathText ? 1 : layer.text.maxLines}
        value={textValue.text}
        placeholder={field.placeholder}
        onChange={(event) =>
          onChange({
            ...textValue,
            text: pathText ? event.target.value.replace(/\s*\n+\s*/g, " ") : event.target.value,
          })
        }
        className="w-full resize-none rounded-lg border border-outline bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
      {layer.text.colorPolicy.mode === "shopper_selectable" ? (
        (() => {
          const colorPolicy = layer.text.colorPolicy;
          return (
            <div className="rounded-lg bg-surface-container-low p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
                Color
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
                      className={`size-9 rounded-full border shadow-sm transition ${
                        selected ? "border-primary ring-2 ring-primary/30" : "border-outline"
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
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">
          Font
          <select
            value={textValue.fontId ?? layer.text.fontPolicy.defaultFontId}
            onChange={(event) => onChange({ ...textValue, fontId: event.target.value })}
            className="mt-2 w-full rounded-lg border border-outline bg-background px-4 py-3 text-sm font-normal normal-case tracking-normal text-on-surface"
          >
            {layer.text.fontPolicy.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function ImageField({
  layer,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  layer: ImageShapeEditorLayer | null;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
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
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-outline bg-surface-container-low px-4 py-4 text-sm font-semibold text-on-surface transition hover:border-primary hover:bg-primary-fixed/20">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white text-primary shadow-sm">
          <ImagePlus className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block">{uploading ? "Uploading..." : uploaded ? "Replace image" : "Choose PNG or JPEG"}</span>
          <span className="mt-0.5 block text-xs font-normal text-on-surface-variant">Up to 20 MB</span>
        </span>
        {uploaded ? <img src={uploaded.previewUrl} alt="" className="size-14 shrink-0 rounded-md border border-outline object-cover" /> : null}
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
      {uploaded ? (
        <div className="rounded-lg bg-surface-container-low px-4 py-3">
          <p className="mb-2 text-xs text-on-surface-variant">
            Select the image on the preview to adjust crop.
          </p>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
          >
            <X className="size-3.5" />
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );

  const clipartSection = (
    <div className="space-y-3">
      {clipartCategoryMode === "fixed" && layer?.clipartCategory?.name ? (
        <p className="rounded-lg bg-surface-container-low px-3 py-2 text-xs text-on-surface-variant">Category: {layer.clipartCategory.name}</p>
      ) : null}
      {clipartCategoryMode === "allow_list" && scopedClipartCategories.length > 0 ? (
        <label className="block text-xs font-semibold text-on-surface-variant">
          Category
          <select
            value={activeCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-outline bg-background px-4 py-3 text-sm text-on-surface"
          >
            {scopedClipartCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {availableClipartAssets.map((clipart) => {
          const selected =
            clipartValue &&
            "clipartAssetId" in clipartValue &&
            clipartValue.clipartAssetId === clipart.id;
          return (
            <button
              key={clipart.id}
              type="button"
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
              className={`min-h-[108px] rounded-lg border bg-background p-2 transition hover:border-primary ${
                selected ? "border-primary ring-2 ring-primary/20" : "border-outline"
              }`}
            >
              <img src={clipart.previewUrl} alt={clipart.name} className="mx-auto h-16 w-16 object-contain" />
              <span className="mt-2 block truncate text-xs">{clipart.name}</span>
            </button>
          );
        })}
      </div>
      {clipartValue ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-destructive"
        >
          <X className="size-3.5" />
          Clear clipart
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
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-container-low p-1">
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
              className={`rounded-md px-4 py-3 text-sm font-semibold transition ${currentSource === "clipart" ? "bg-primary text-white shadow-sm" : "bg-white text-on-surface hover:bg-primary-fixed/30"}`}
            >
              Clipart
            </button>
            <button
              type="button"
              onClick={() => onChange(uploaded ?? null)}
              className={`rounded-md px-4 py-3 text-sm font-semibold transition ${currentSource === "upload" ? "bg-primary text-white shadow-sm" : "bg-white text-on-surface hover:bg-primary-fixed/30"}`}
            >
              Upload image
            </button>
          </div>
          {currentSource === "clipart" ? clipartSection : uploadSection}
        </>
      ) : null}
      {sourcePolicy === "upload_or_clipart_category" && layer?.presentation === "side_by_side" ? (
        <div className="grid gap-4">
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">Clipart</p>
            {clipartSection}
          </div>
          <div className="rounded-lg bg-surface-container-low p-3">
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">Upload image</p>
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
