import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  buildDesignFromForm,
  getOrderedFormFields,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeFieldValue,
  type RuntimeImageShapeLayer,
  type RuntimeTextLayer,
  type TextFieldValue,
} from "@trophy/customization";
import { createId, cssShapeClip, fileToBackground, Select } from "./customization-template-ui";

type PreviewChange = (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | null) => void;
type PreviewMode = "edit" | "view";
type ResizeCorner = "nw" | "ne" | "sw" | "se";
type PanState = { x: number; y: number };

const MIN_FREE_IMAGE_SCALE = 0.02;
const MIN_PREVIEW_ZOOM = 0.05;
const MAX_PREVIEW_ZOOM = 4;
const PREVIEW_ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 64;

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

export function PreviewDialog({
  template,
  values,
  onChange,
  onClose,
  onReset,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  onChange: PreviewChange;
  onClose: () => void;
  onReset: () => void;
}) {
  const design = useMemo(() => buildDesignFromForm({ template, values, designId: "admin_preview" }), [template, values]);

  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 p-3 md:p-8">
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(260px,40vh)] overflow-hidden rounded-xl bg-ui-bg-base shadow-xl md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-none">
        <div className="flex min-h-0 flex-col bg-ui-bg-subtle">
          <PreviewCanvas
            template={template}
            design={design}
            values={values}
            onChange={onChange}
          />
        </div>
        <aside className="overflow-y-auto border-l border-ui-border-base p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">
              Close
            </button>
          </div>
          <button type="button" onClick={onReset} className="mb-4 inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <RotateCcw className="size-4" /> Reset preview data
          </button>
          <div className="space-y-4">
            {getOrderedFormFields(template).map((field) => {
              const layer = template.layers.find((entry) => entry.id === field.layerId);
              if (!layer) return null;
              return (
                <PreviewField
                  key={field.id}
                  field={field}
                  layer={layer}
                  value={values[field.id]}
                  onChange={(value) => onChange(field.id, value)}
                />
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewCanvas({
  template,
  design,
  values,
  onChange,
}: {
  template: CustomizationTemplate;
  design: ReturnType<typeof buildDesignFromForm>;
  values: CustomizationFormValues;
  onChange: PreviewChange;
}) {
  const [mode, setMode] = useState<PreviewMode>("edit");
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [zoom, setZoom] = useState(0.72);
  const [zoomInput, setZoomInput] = useState("72");
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const viewportDrag = useRef<{ x: number; y: number; pan: PanState } | null>(null);
  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const scale = zoom;
  const fieldsByLayerId = new Map(template.formFields.map((field) => [field.layerId, field]));
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

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ui-border-base bg-ui-bg-base px-4 py-3">
        <div className="inline-flex rounded-md border border-ui-border-base bg-ui-bg-subtle p-0.5">
          {(["edit", "view"] as const).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setMode(entry)}
              className={`rounded px-3 py-1 text-sm font-medium capitalize ${mode === entry ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted"}`}
            >
              {entry}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCommittedZoom(zoom - PREVIEW_ZOOM_STEP)} className="rounded border border-ui-border-base px-2 py-1 text-sm">-</button>
          <div className="flex items-center rounded border border-ui-border-base bg-ui-bg-base px-2 py-1">
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
              className="w-12 bg-transparent text-right text-sm outline-none"
            />
            <span className="text-xs text-ui-fg-muted">%</span>
          </div>
          <button type="button" onClick={() => setCommittedZoom(zoom + PREVIEW_ZOOM_STEP)} className="rounded border border-ui-border-base px-2 py-1 text-sm">+</button>
          <button type="button" onClick={fitToView} className="rounded border border-ui-border-base px-2 py-1 text-sm">Fit</button>
        </div>
        <span className="text-xs text-ui-fg-muted">{mode === "edit" ? "Tap an image to edit crop" : "Drag to pan canvas"}</span>
      </div>
      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden ${mode === "view" ? "cursor-grab active:cursor-grabbing" : ""}`}
        onPointerDown={(event) => {
          if (mode !== "view") return;
          viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (mode !== "view" || !viewportDrag.current) return;
          setPan({
            x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
            y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
          });
        }}
        onPointerUp={() => {
          viewportDrag.current = null;
        }}
        onPointerCancel={() => {
          viewportDrag.current = null;
        }}
      >
        <div
          className="absolute left-1/2 top-1/2 bg-white shadow"
          style={{
            width: width * scale,
            height: height * scale,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
          }}
          onPointerDown={(event) => {
            if (mode === "edit" && event.target === event.currentTarget) setSelectedFieldId("");
          }}
        >
          {background ? <img src={background.previewUrl} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill" /> : null}
          {[...design.layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
            if (layer.type === "text") {
              return <PreviewTextLayer key={layer.id} layer={layer} width={width} height={height} scale={scale} />;
            }

            const field = fieldsByLayerId.get(layer.layerId);
            const value = field ? values[field.id] : null;
            const imageValue = value && typeof value === "object" && "assetId" in value ? value as ImageShapeFieldValue : null;
            if (!field || !imageValue) return null;

            return (
              <PreviewImageShapeLayer
                key={layer.id}
                layer={layer}
                fieldId={field.id}
                value={imageValue}
                width={width}
                height={height}
                scale={scale}
                mode={mode}
                selected={selectedFieldId === field.id}
                onSelect={() => setSelectedFieldId(field.id)}
                onChange={onChange}
              />
            );
          })}
        </div>
      </div>
    </>
  );
}

function PreviewTextLayer({
  layer,
  width,
  height,
  scale,
}: {
  layer: RuntimeTextLayer;
  width: number;
  height: number;
  scale: number;
}) {
  const textHeight = layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const closedTextPath = layer.path.type === "closed_ellipse";
  const h = closedTextPath ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height) : textHeight;
  const left = (layer.geometry.xRatio * width - layer.geometry.widthRatio * width / 2) * scale;
  const top = (layer.geometry.yRatio * height - h / 2) * scale;
  const w = layer.geometry.widthRatio * width;

  if (layer.path.type === "straight") {
    return (
      <div
        className="pointer-events-none absolute select-none overflow-hidden"
        style={{ left, top, width: w * scale, height: textHeight * scale, color: layer.color, fontSize: layer.fontSizePt * scale, textAlign: layer.align === "justified" ? "justify" : layer.align }}
      >
        {layer.text}
      </div>
    );
  }

  const pathId = `preview_text_path_${layer.id}`;
  const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
  const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
  const pathAttrs = getTextPathRenderAttributes({ path: layer.path, align: layer.align, widthPx: w, heightPx: h, textWidthPx, charCount: layer.text.length, wordCount });
  const renderPath = pathAttrs.pathStartAngleDeg != null
    ? { ...layer.path, startAngleDeg: pathAttrs.pathStartAngleDeg }
    : layer.path;
  const pathD = getTextPathSvgD({ path: renderPath, widthPx: w, heightPx: h });

  return (
    <svg className="pointer-events-none absolute select-none overflow-visible" style={{ left, top, width: w * scale, height: h * scale }} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <path id={pathId} d={pathD} />
      </defs>
      <text fontSize={layer.fontSizePt} fill={layer.color} textAnchor={pathAttrs.textAnchor} dominantBaseline="middle" textLength={pathAttrs.textLength} lengthAdjust={pathAttrs.lengthAdjust} wordSpacing={pathAttrs.wordSpacingPx ?? 0}>
        <textPath href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
          {pathAttrs.dy ? <tspan dy={pathAttrs.dy}>{layer.text}</tspan> : layer.text}
        </textPath>
      </text>
    </svg>
  );
}

function PreviewImageShapeLayer({
  layer,
  fieldId,
  value,
  width,
  height,
  scale,
  mode,
  selected,
  onSelect,
  onChange,
}: {
  layer: RuntimeImageShapeLayer;
  fieldId: string;
  value: ImageShapeFieldValue;
  width: number;
  height: number;
  scale: number;
  mode: PreviewMode;
  selected: boolean;
  onSelect: () => void;
  onChange: PreviewChange;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: width, heightPx: height } });
  const imageRect = getFreeImageRect({
    sourceWidthPx: value.sourceWidthPx,
    sourceHeightPx: value.sourceHeightPx,
    frameWidthPx: rect.widthPx,
    frameHeightPx: rect.heightPx,
    cropScale: value.cropScale,
    cropXRatio: value.cropXRatio,
    cropYRatio: value.cropYRatio,
  });
  const clipPath = cssShapeClip(layer.shape.type, layer.shape.type === "vector" ? layer.shape.vectorPath : undefined);

  function updateFromImageRect(next: { centerXPx: number; centerYPx: number; widthPx: number }) {
    onChange(fieldId, {
      ...value,
      cropScale: Math.max(MIN_FREE_IMAGE_SCALE, next.widthPx / imageRect.widthPx * imageRect.cropScale),
      cropXRatio: (next.centerXPx - rect.widthPx / 2) / rect.widthPx,
      cropYRatio: (next.centerYPx - rect.heightPx / 2) / rect.heightPx,
    });
  }

  function startResize(event: React.PointerEvent<HTMLButtonElement>, corner: ResizeCorner) {
    event.preventDefault();
    event.stopPropagation();
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
      const nextWidthPx = imageRect.widthPx * nextScale;
      const nextCenterXPx = fixed.x + vector.x * nextScale / 2;
      const nextCenterYPx = fixed.y + vector.y * nextScale / 2;
      updateFromImageRect({ centerXPx: nextCenterXPx, centerYPx: nextCenterYPx, widthPx: nextWidthPx });
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
        pointerEvents: mode === "edit" ? "auto" : "none",
        touchAction: "none",
      }}
      onWheel={(event) => {
        if (mode !== "edit") return;
        event.preventDefault();
        event.stopPropagation();
        onSelect();
        const nextCropScale = Math.max(MIN_FREE_IMAGE_SCALE, imageRect.cropScale * (event.deltaY < 0 ? 1.06 : 1 / 1.06));
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerXPx = (event.clientX - bounds.left) / scale;
        const pointerYPx = (event.clientY - bounds.top) / scale;
        const scaleRatio = nextCropScale / imageRect.cropScale;
        const nextCenterXPx = pointerXPx - (pointerXPx - imageRect.centerXPx) * scaleRatio;
        const nextCenterYPx = pointerYPx - (pointerYPx - imageRect.centerYPx) * scaleRatio;
        updateFromImageRect({
          centerXPx: nextCenterXPx,
          centerYPx: nextCenterYPx,
          widthPx: imageRect.widthPx * scaleRatio,
        });
      }}
    >
      <div
        className="absolute inset-0 cursor-move overflow-hidden"
        style={{ clipPath }}
        onPointerDown={(event) => {
          if (mode !== "edit") return;
          event.preventDefault();
          event.stopPropagation();
          onSelect();
          const startX = event.clientX;
          const startY = event.clientY;
          const startCropX = imageRect.cropXRatio;
          const startCropY = imageRect.cropYRatio;
          event.currentTarget.setPointerCapture(event.pointerId);

          function move(pointer: PointerEvent) {
            const dx = (pointer.clientX - startX) / scale;
            const dy = (pointer.clientY - startY) / scale;
            onChange(fieldId, {
              ...value,
              cropScale: imageRect.cropScale,
              cropXRatio: startCropX + dx / rect.widthPx,
              cropYRatio: startCropY + dy / rect.heightPx,
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
          src={value.previewUrl}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={{
            left: imageRect.xPx * scale,
            top: imageRect.yPx * scale,
            width: imageRect.widthPx * scale,
            height: imageRect.heightPx * scale,
          }}
        />
      </div>
      {selected && mode === "edit" ? (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize image ${corner}`}
              className="absolute size-4 rounded-full border border-ui-bg-base bg-ui-fg-interactive shadow md:size-3"
              style={{
                left: (corner === "nw" || corner === "sw" ? imageRect.xPx : imageRect.xPx + imageRect.widthPx) * scale,
                top: (corner === "nw" || corner === "ne" ? imageRect.yPx : imageRect.yPx + imageRect.heightPx) * scale,
                transform: "translate(-50%, -50%)",
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              }}
              onPointerDown={(event) => startResize(event, corner)}
            />
          ))}
          <div
            className="pointer-events-none absolute border border-ui-fg-interactive/70"
            style={{
              left: imageRect.xPx * scale,
              top: imageRect.yPx * scale,
              width: imageRect.widthPx * scale,
              height: imageRect.heightPx * scale,
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function PreviewField({
  field,
  layer,
  value,
  onChange,
}: {
  field: CustomizationFormField;
  layer: CustomizationLayer;
  value: unknown;
  onChange: (value: TextFieldValue | ImageShapeFieldValue | null) => void;
}) {
  if (layer.type === "text") {
    const textValue = value && typeof value === "object" && "text" in value ? value as TextFieldValue : { text: "" };
    const pathText = layer.text.path.type !== "straight";
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
        <textarea
          value={textValue.text}
          placeholder={field.placeholder}
          onChange={(event) => onChange({ ...textValue, text: pathText ? event.target.value.replace(/\s*\n+\s*/g, " ") : event.target.value })}
          className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm"
          rows={pathText ? 1 : layer.text.maxLines}
        />
        {layer.text.colorPolicy.mode === "shopper_selectable" ? (
          <Select
            label="Color"
            value={textValue.color ?? layer.text.colorPolicy.defaultColor}
            options={layer.text.colorPolicy.options.map((option) => option.value)}
            onChange={(color) => onChange({ ...textValue, color })}
          />
        ) : null}
        {layer.text.fontPolicy.mode === "shopper_selectable" ? (
          <Select
            label="Font"
            value={textValue.fontId ?? layer.text.fontPolicy.defaultFontId}
            options={layer.text.fontPolicy.options.map((option) => option.value)}
            onChange={(fontId) => onChange({ ...textValue, fontId })}
          />
        ) : null}
      </div>
    );
  }

  const imageValue = value && typeof value === "object" && "assetId" in value ? value as ImageShapeFieldValue : null;
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          void fileToBackground(file).then((asset) =>
            onChange({
              assetId: createId("local_asset"),
              previewUrl: asset.previewUrl,
              sourceWidthPx: asset.widthPx,
              sourceHeightPx: asset.heightPx,
              cropScale: 1,
              cropXRatio: 0,
              cropYRatio: 0,
            }),
          );
        }}
      />
      {imageValue ? (
        <button type="button" onClick={() => onChange({ ...imageValue, cropScale: 1, cropXRatio: 0, cropYRatio: 0 })} className="rounded border border-ui-border-base px-3 py-2 text-sm">
          Reset crop
        </button>
      ) : null}
    </div>
  );
}
