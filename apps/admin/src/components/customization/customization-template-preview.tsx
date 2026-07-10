import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, ImagePlus, Minus, Plus, RotateCcw } from "lucide-react";
import {
  buildDesignFromForm,
  getImageShapeClipartCategoryMode,
  getOrderedFormFields,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ClipartFieldValue,
  type ImageShapeFieldValue,
  type ImageShapeEditorLayer,
  type RuntimeImageShapeLayer,
  type RuntimeTextLayer,
  type TextFieldValue,
} from "@trophy/customization";
import { Label, Select } from "@medusajs/ui";
import { createId, cssShapeClip, fileToBackground, FontLoader, ShapeClipPaths } from "./customization-template-ui";
import { exportVectorPdfClientSide } from "../../lib/pdf-export";
import { useBrandAssets } from "../../hooks/use-brand-assets";
import { normalizeContentUrl } from "../../lib/product-assets-client";
import { MediaPreview } from "../ui/media-preview";

type PreviewChange = (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null) => void;
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

let measureSpan: HTMLSpanElement | null = null;
function measureTextDOM(text: string, fontSizePt: number, fontId: string): number {
  if (typeof window === "undefined" || !document.body) return text.length * fontSizePt * 0.55;
  if (!measureSpan) {
    measureSpan = document.createElement("span");
    measureSpan.style.position = "absolute";
    measureSpan.style.visibility = "hidden";
    measureSpan.style.whiteSpace = "pre";
    measureSpan.style.pointerEvents = "none";
    document.body.appendChild(measureSpan);
  }
  measureSpan.style.fontFamily = `"${fontId}", sans-serif`;
  measureSpan.style.fontSize = `${fontSizePt}px`;
  measureSpan.textContent = text;
  return measureSpan.getBoundingClientRect().width;
}

export function PreviewDialog({
  template,
  values,
  onChange,
  onClose,
  onReset,
  pendingPdfFile,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  onChange: PreviewChange;
  onClose: () => void;
  onReset: () => void;
  pendingPdfFile?: File | null;
}) {
  const design = useMemo(() => buildDesignFromForm({ template, values, designId: "admin_preview", measureText: measureTextDOM }), [template, values]);
  const [isExporting, setIsExporting] = useState(false);

  async function exportPdf() {
    setIsExporting(true);
    try {
      const blob = await exportVectorPdfClientSide(template, design, pendingPdfFile ?? null);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${design.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  }

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
          <div className="mb-4 flex flex-wrap gap-2">
            <button type="button" onClick={onReset} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
              <RotateCcw className="size-4" /> Reset data
            </button>
            <button type="button" onClick={exportPdf} disabled={isExporting} className="inline-flex items-center gap-2 rounded border px-3 py-2 text-sm disabled:opacity-50">
              <Download className="size-4" /> {isExporting ? "Exporting..." : "Export PDF"}
            </button>
          </div>
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
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialPinchDist = useRef<number | null>(null);
  const initialPinchZoom = useRef<number>(zoom);

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
      <ShapeClipPaths layers={template.layers} />
      <div
        ref={viewportRef}
        className={`relative min-h-0 flex-1 overflow-hidden ${mode === "view" ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ touchAction: mode === "view" ? "none" : "auto" }}
        onPointerDown={(event) => {
          if (mode !== "view") return;
          activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (activePointers.current.size === 1) {
            viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
          } else if (activePointers.current.size === 2) {
            const pts = Array.from(activePointers.current.values());
            initialPinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
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
            const pts = Array.from(activePointers.current.values());
            const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const scaleFactor = dist / initialPinchDist.current;
            setCommittedZoom(initialPinchZoom.current * scaleFactor);
          } else if (activePointers.current.size === 1 && viewportDrag.current) {
            setPan({
              x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
              y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
            });
          }
        }}
        onPointerUp={(event) => {
          activePointers.current.delete(event.pointerId);
          if (activePointers.current.size < 2) {
            initialPinchDist.current = null;
          }
          if (activePointers.current.size === 1) {
            const pt = Array.from(activePointers.current.values())[0];
            viewportDrag.current = { x: pt.x, y: pt.y, pan };
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
        <FontLoader layers={design.layers} />
        <div
          id="preview-design-container"
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
          {background ? <img src={normalizeContentUrl(background.previewUrl)} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill" /> : null}
          {[...design.layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
            if (layer.type === "text") {
              return <PreviewTextLayer key={layer.id} layer={layer} width={width} height={height} scale={scale} />;
            }

            const field = fieldsByLayerId.get(layer.layerId);
            const value = field ? values[field.id] : null;
            const uploadValue = value && typeof value === "object" && "assetId" in value ? value as ImageShapeFieldValue : null;
            const clipartValue = value && typeof value === "object" && "source" in value && value.source === "clipart" ? value as ClipartFieldValue : null;
            const derivedValue: ImageShapeFieldValue | null =
              uploadValue ??
              (layer.contentSource === "clipart"
                ? {
                    source: "upload",
                    assetId: layer.assetId,
                    previewUrl: layer.previewUrl,
                    sourceWidthPx: layer.sourceWidthPx,
                    sourceHeightPx: layer.sourceHeightPx,
                    cropScale: layer.cropScale,
                    cropXRatio: layer.cropXRatio,
                    cropYRatio: layer.cropYRatio,
                  }
                : clipartValue
                  ? {
                      source: "upload",
                      assetId: clipartValue.sourceAssetId,
                      previewUrl: clipartValue.previewUrl,
                      sourceWidthPx: clipartValue.sourceWidthPx ?? width,
                      sourceHeightPx: clipartValue.sourceHeightPx ?? height,
                      cropScale: 1,
                      cropXRatio: 0,
                      cropYRatio: 0,
                    }
                  : null);
            if (!derivedValue) return null;

            return (
              <PreviewImageShapeLayer
                key={layer.id}
                layer={layer}
                fieldId={field?.id ?? ""}
                value={derivedValue}
                width={width}
                height={height}
                scale={scale}
                mode={mode}
                selected={field ? selectedFieldId === field.id : false}
                onSelect={() => {
                  if (field) setSelectedFieldId(field.id);
                }}
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
        className="pointer-events-none absolute select-none overflow-visible"
        style={{ left, top, width: w * scale, height: textHeight * scale, lineHeight: 1.35, color: layer.color, fontSize: layer.fontSizePt * scale, fontFamily: layer.fontId, textAlign: layer.align === "justified" ? "justify" : layer.align, whiteSpace: "pre-wrap" }}
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
      <text 
        fontSize={layer.fontSizePt} 
        fontFamily={layer.fontId} 
        fontWeight={layer.isBold ? "bold" : "normal"} 
        fontStyle={layer.isItalic ? "italic" : "normal"} 
        fill={layer.color} textAnchor={pathAttrs.textAnchor} dominantBaseline="middle" textLength={pathAttrs.textLength} lengthAdjust={pathAttrs.lengthAdjust} wordSpacing={pathAttrs.wordSpacingPx ?? 0}
      >
        <textPath id={`export-textpath-${layer.id}`} href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
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
  const clipPath = cssShapeClip(layer.shape.type, layer.id);

  function updateFromImageRect(next: { centerXPx: number; centerYPx: number; widthPx: number }) {
    if (!fieldId) return;
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
          if (!fieldId) return;
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
          src={normalizeContentUrl(value.previewUrl)}
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
              className="absolute flex size-10 items-center justify-center md:size-6"
              style={{
                left: (corner === "nw" || corner === "sw" ? imageRect.xPx : imageRect.xPx + imageRect.widthPx) * scale,
                top: (corner === "nw" || corner === "ne" ? imageRect.yPx : imageRect.yPx + imageRect.heightPx) * scale,
                transform: "translate(-50%, -50%)",
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
                touchAction: "none",
              }}
              onPointerDown={(event) => startResize(event, corner)}
            >
              <span className="size-4 rounded-full border border-ui-bg-base bg-ui-fg-interactive shadow md:size-3" />
            </button>
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
  onChange: (value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null) => void;
}) {
  if (layer.type === "text") {
    const textValue = value && typeof value === "object" && "text" in value ? value as TextFieldValue : { text: "" };
    const pathText = layer.text.path.type !== "straight";
    return (
      <FieldShell field={field} kind="Text">
        <textarea
          value={textValue.text}
          placeholder={field.placeholder}
          onChange={(event) => onChange({ ...textValue, text: pathText ? event.target.value.replace(/\s*\n+\s*/g, " ") : event.target.value })}
          className="min-h-11 w-full resize-none rounded-lg border border-ui-border-strong bg-ui-bg-field px-3 py-2.5 text-sm text-ui-fg-base outline-none transition focus:border-ui-fg-interactive focus:ring-2 focus:ring-ui-fg-interactive/10"
          rows={pathText ? 1 : layer.text.maxLines}
        />
        {layer.text.colorPolicy.mode === "shopper_selectable" ? (
          (() => {
            const policy = layer.text.colorPolicy as Extract<typeof layer.text.colorPolicy, { mode: "shopper_selectable" }>;
            const currentColor = textValue.color ?? policy.defaultColor;
            const isPreset = policy.options.some((o) => o.value === currentColor);
            
            return (
              <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
                <label className="mb-2 block text-xs font-medium text-ui-fg-muted">Color</label>
                <div className="flex flex-wrap items-center gap-2">
                  {policy.options.map((option, index) => {
                    const isSelected = currentColor === option.value;
                    return (
                      <button
                        key={index}
                        type="button"
                        title={option.label || option.value}
                        className={`size-8 rounded-full border shadow-sm transition-transform ${
                          isSelected ? "ring-2 ring-ui-fg-interactive ring-offset-1" : "border-ui-border-base hover:scale-110"
                        }`}
                        style={{ backgroundColor: option.value }}
                        onClick={() => onChange({ ...textValue, color: option.value })}
                      />
                    );
                  })}
                  {policy.allowCustomColor ? (
                    <div className="ml-1 flex items-center gap-2 border-l border-ui-border-base pl-3">
                      <div className="relative group" title="Pick custom color">
                        <input
                          type="color"
                          value={currentColor}
                          onChange={(e) => onChange({ ...textValue, color: e.target.value })}
                          className="absolute inset-0 size-8 cursor-pointer opacity-0 z-10"
                        />
                        <div 
                          className={`size-8 rounded-full border shadow-sm transition-transform group-hover:scale-110 ${
                            !isPreset
                              ? "ring-2 ring-ui-fg-interactive ring-offset-1 border-transparent"
                              : "border-ui-border-base border-dashed bg-ui-bg-subtle"
                          }`}
                          style={{ 
                            backgroundColor: !isPreset ? currentColor : "transparent"
                          }}
                        >
                          {isPreset && (
                            <div className="flex size-full items-center justify-center pointer-events-none">
                              <span className="text-xl leading-none font-medium text-ui-fg-muted mb-0.5">+</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })()
        ) : null}
        {layer.text.fontPolicy.mode === "shopper_selectable" ? (
          <div className="space-y-1.5 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <Label size="small" weight="plus" className="text-ui-fg-subtle">Font</Label>
            <Select value={textValue.fontId ?? layer.text.fontPolicy.defaultFontId} onValueChange={(fontId) => onChange({ ...textValue, fontId })}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {layer.text.fontPolicy.options.map((option) => (
                  <Select.Item key={option.value} value={option.value}>{option.label ?? option.value}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        ) : null}
        {layer.text.formatPolicy.mode === "shopper_selectable" ? (
          <div key="format-toolbar" className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <label className="mb-2 block text-xs font-medium text-ui-fg-muted">Format</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange({ ...textValue, isBold: !(textValue.isBold ?? (layer.text.formatPolicy as any).defaultBold) })}
                className={`flex size-8 items-center justify-center rounded border font-bold transition-colors ${
                  (textValue.isBold ?? (layer.text.formatPolicy as any).defaultBold) ? "bg-ui-bg-interactive text-ui-fg-on-inverted" : "bg-ui-bg-base hover:bg-ui-bg-subtle"
                }`}
              >
                B
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...textValue, isItalic: !(textValue.isItalic ?? (layer.text.formatPolicy as any).defaultItalic) })}
                className={`flex size-8 items-center justify-center rounded border italic transition-colors ${
                  (textValue.isItalic ?? (layer.text.formatPolicy as any).defaultItalic) ? "bg-ui-bg-interactive text-ui-fg-on-inverted" : "bg-ui-bg-base hover:bg-ui-bg-subtle"
                }`}
              >
                I
              </button>
            </div>
          </div>
        ) : null}
        {layer.text.alignPolicy.mode === "shopper_selectable" ? (
          <div className="space-y-1.5 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <Label size="small" weight="plus" className="text-ui-fg-subtle">Alignment</Label>
            <Select value={textValue.align ?? (layer.text.alignPolicy as any).defaultAlign} onValueChange={(align) => onChange({ ...textValue, align: align as import("@trophy/customization").TextAlign })}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="left">Left</Select.Item>
                <Select.Item value="center">Center</Select.Item>
                <Select.Item value="right">Right</Select.Item>
                <Select.Item value="justified">Justified</Select.Item>
              </Select.Content>
            </Select>
          </div>
        ) : null}
      </FieldShell>
    );
  }

  const typedLayer = layer as ImageShapeEditorLayer;
  const sourcePolicy = typedLayer.sourcePolicy ?? "upload_only";
  const clipartCategoryMode = getImageShapeClipartCategoryMode(typedLayer);
  const uploadValue = value && typeof value === "object" && "assetId" in value ? value as ImageShapeFieldValue : null;
  const clipartValue = value && typeof value === "object" && "source" in value && value.source === "clipart" ? value as ClipartFieldValue : null;
  const {
    clipartAssets: globalClipartAssets,
    clipartCategories: globalClipartCategories,
  } = useBrandAssets();
  const activeClipartCategoriesById = new Map(
    globalClipartCategories
      .filter((category) => category.active)
      .map((category) => [category.id, { id: category.id, name: category.name }] as const),
  );
  const scopedClipartCategories =
    clipartCategoryMode === "allow_list"
      ? (typedLayer.allowedClipartCategories ?? [])
          .map((category) => activeClipartCategoriesById.get(category.id))
          .filter((category): category is { id: string; name: string } => !!category)
      : typedLayer.clipartCategory
        ? [activeClipartCategoriesById.get(typedLayer.clipartCategory.id) ?? typedLayer.clipartCategory].filter(
            (category): category is { id: string; name: string } => !!category,
          )
        : [];
  const initialCategoryId =
    clipartValue?.categoryId ??
    (clipartCategoryMode === "fixed" ? typedLayer.clipartCategory?.id : scopedClipartCategories[0]?.id) ??
    "";
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialCategoryId);
  useEffect(() => {
    setSelectedCategoryId((current) => {
      if (clipartCategoryMode === "fixed") {
        return typedLayer.clipartCategory?.id ?? "";
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
  }, [clipartCategoryMode, typedLayer.clipartCategory?.id, clipartValue?.categoryId, layer.id, scopedClipartCategories]);
  const currentSource =
    sourcePolicy === "upload_or_clipart_category"
      ? clipartValue
        ? "clipart"
        : "upload"
      : sourcePolicy === "clipart_category_only"
        ? "clipart"
        : "upload";
  const scopedCategoryIds = new Set(scopedClipartCategories.map((category) => category.id));
  const clipartAssets = typedLayer.clipartAssets ?? globalClipartAssets;
  const activeCategoryId =
    clipartCategoryMode === "fixed"
      ? typedLayer.clipartCategory?.id ?? ""
      : scopedCategoryIds.has(selectedCategoryId)
        ? selectedCategoryId
        : scopedClipartCategories[0]?.id || "";
  const clipartOptions = clipartAssets.filter((asset) => {
    if (!asset.active || !scopedCategoryIds.has(asset.categoryId)) return false;
    if (!activeCategoryId) return true;
    return asset.categoryId === activeCategoryId;
  });
  const selectedClipartAsset = clipartValue
    ? clipartAssets.find((asset) => asset.id === clipartValue.clipartAssetId) ??
      globalClipartAssets.find((asset) => asset.id === clipartValue.clipartAssetId)
    : null;

  const uploadControls = (
    <div className="space-y-3">
      <label className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-ui-border-strong bg-ui-bg-subtle p-3 transition hover:border-ui-fg-interactive hover:bg-ui-bg-base">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-ui-border-base bg-ui-bg-base text-ui-fg-muted group-hover:text-ui-fg-interactive">
          <ImagePlus className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-ui-fg-base">
            {uploadValue ? "Change image" : "Upload image"}
          </span>
          <span className="mt-0.5 block text-xs text-ui-fg-muted">PNG, JPG, or WebP</span>
        </span>
        {uploadValue ? (
          <img
            src={normalizeContentUrl(uploadValue.previewUrl)}
            alt=""
            className="size-12 shrink-0 rounded-md border border-ui-border-base object-cover"
          />
        ) : null}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            void fileToBackground(file).then((asset) =>
              onChange({
                source: "upload",
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
      </label>
      {uploadValue ? (
        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onChange({ ...uploadValue, cropScale: Math.max(MIN_FREE_IMAGE_SCALE, (uploadValue.cropScale ?? 1) / 1.1) })} className="inline-flex items-center justify-center gap-1 rounded-lg border border-ui-border-base bg-ui-bg-base px-2 py-2 text-xs font-medium text-ui-fg-base">
            <Minus className="size-3.5" /> Zoom
          </button>
          <button type="button" onClick={() => onChange({ ...uploadValue, cropScale: (uploadValue.cropScale ?? 1) * 1.1 })} className="inline-flex items-center justify-center gap-1 rounded-lg border border-ui-border-base bg-ui-bg-base px-2 py-2 text-xs font-medium text-ui-fg-base">
            <Plus className="size-3.5" /> Zoom
          </button>
          <button type="button" onClick={() => onChange({ ...uploadValue, cropScale: 1, cropXRatio: 0, cropYRatio: 0 })} className="inline-flex items-center justify-center gap-1 rounded-lg border border-ui-border-base bg-ui-bg-base px-2 py-2 text-xs font-medium text-ui-fg-base">
            <RotateCcw className="size-3.5" /> Reset
          </button>
        </div>
      ) : null}
    </div>
  );

  const clipartControls = (
    <div className="space-y-3">
      {clipartCategoryMode === "fixed" && typedLayer.clipartCategory?.name ? (
        <TextLabel value={`Category: ${typedLayer.clipartCategory.name}`} />
      ) : null}
      {clipartCategoryMode === "allow_list" && scopedClipartCategories.length > 0 ? (
        <div className="space-y-1.5">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Category</Label>
          <select
            value={activeCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className="w-full rounded-lg border border-ui-border-strong bg-ui-bg-field px-3 py-2.5 text-sm text-ui-fg-base outline-none transition focus:border-ui-fg-interactive focus:ring-2 focus:ring-ui-fg-interactive/10"
          >
            {!activeCategoryId ? <option value="">Select category</option> : null}
            {scopedClipartCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        {clipartOptions.map((asset) => {
          const selected = selectedClipartAsset?.id === asset.id;
          return (
            <button
              key={asset.id}
              type="button"
              onClick={() =>
                onChange({
                  source: "clipart",
                  clipartAssetId: asset.id,
                  clipartAssetName: asset.name,
                  sourceAssetId: asset.sourceAssetId,
                  previewUrl: asset.previewUrl,
                  mimeType: asset.mimeType,
                  sourceWidthPx: asset.sourceWidthPx,
                  sourceHeightPx: asset.sourceHeightPx,
                  categoryId: asset.categoryId,
                })
              }
              className={`flex min-h-[104px] flex-col items-center justify-center gap-2 rounded-lg border bg-ui-bg-base p-2 text-left transition hover:border-ui-fg-interactive ${
                selected ? "border-ui-fg-interactive ring-2 ring-ui-fg-interactive/15" : "border-ui-border-base"
              }`}
            >
              <MediaPreview
                src={asset.previewUrl}
                mimeType={asset.mimeType}
                alt={asset.name}
                className="h-12 w-12 object-contain"
              />
              <span className="w-full truncate text-xs">{asset.name}</span>
            </button>
          );
        })}
      </div>
      {!clipartOptions.length ? <p className="text-xs text-ui-fg-muted">No active clipart options available for this layer.</p> : null}
    </div>
  );

  return (
    <FieldShell field={field} kind="Image">
      {sourcePolicy === "upload_or_clipart_category" && typedLayer.presentation === "source_select" ? (
        <div className="space-y-1.5">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Source</Label>
          <Select value={currentSource} onValueChange={(nextSource) => {
            if (nextSource === "clipart" && clipartOptions[0]) {
              const first = clipartOptions[0];
              if (clipartCategoryMode === "allow_list") {
                setSelectedCategoryId(first.categoryId);
              }
              onChange({
                source: "clipart",
                clipartAssetId: first.id,
                clipartAssetName: first.name,
                sourceAssetId: first.sourceAssetId,
                previewUrl: first.previewUrl,
                mimeType: first.mimeType,
                sourceWidthPx: first.sourceWidthPx,
                sourceHeightPx: first.sourceHeightPx,
                categoryId: first.categoryId,
              });
            } else if (nextSource === "upload") {
              onChange(uploadValue ?? null);
            }
          }}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="clipart">Clipart</Select.Item>
              <Select.Item value="upload">Upload image</Select.Item>
            </Select.Content>
          </Select>
        </div>
      ) : null}
      {sourcePolicy === "clipart_category_only" ? clipartControls : null}
      {sourcePolicy === "upload_only" ? uploadControls : null}
      {sourcePolicy === "upload_or_clipart_category" && typedLayer.presentation === "source_select"
        ? currentSource === "clipart"
          ? clipartControls
          : uploadControls
        : null}
      {sourcePolicy === "upload_or_clipart_category" && typedLayer.presentation === "side_by_side" ? (
        <div className="grid gap-3">
          <div className="space-y-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <p className="text-xs font-medium text-ui-fg-muted">Clipart</p>
            {clipartControls}
          </div>
          <div className="space-y-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
            <p className="text-xs font-medium text-ui-fg-muted">Upload image</p>
            {uploadControls}
          </div>
        </div>
      ) : null}
    </FieldShell>
  );
}

function TextLabel({ value }: { value: string }) {
  return <p className="rounded-lg border border-ui-border-base bg-ui-bg-subtle px-3 py-2 text-xs text-ui-fg-muted">{value}</p>;
}

function FieldShell({
  field,
  kind,
  children,
}: {
  field: CustomizationFormField;
  kind: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-ui-border-base bg-ui-bg-base p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label className="block truncate text-sm font-semibold text-ui-fg-base">
            {field.label}
          </label>
          <p className="mt-0.5 text-xs text-ui-fg-muted">{kind}</p>
        </div>
        {field.required ? (
          <span className="shrink-0 rounded-full border border-ui-border-base bg-ui-bg-subtle px-2 py-0.5 text-[11px] font-medium text-ui-fg-muted">
            Required
          </span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
