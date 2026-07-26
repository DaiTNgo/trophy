import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage } from "lucide-react";
import {
  getVisibleLayers,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  vectorPointsToSvgPathD,
  type BackgroundAsset,
  type CustomizationLayer,
  type CustomizationTemplate,
  type DynamicFontFamily,
  type VectorPoint,
} from "@trophy/customization";
import { BackgroundUpload, createId, cssShapeClip, ShapeClipPaths, FontLoader } from "./customization-template-ui";
import { VectorPointOverlay } from "./customization-template-editor-vector";
import {
  ClosedEllipsePathOverlay,
  EditorTextLayer,
  PathPointOverlay,
  ResizeHandles,
} from "./customization-template-editor-text";
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 64;

type PanState = { x: number; y: number };
export function EditorCanvas({
  template,
  selectedLayerId,
  pathEditingLayerId,
  selectedVectorPointId,
  isDrawing,
  pendingVectorPoints,
  dynamicFonts = [],
  onSelectLayer,
  onPathEditingLayerChange,
  onSelectVectorPoint,
  onUpdateLayer,
  onUploadBackground,
  onAddVectorPoint,
  onUndoVectorPoint,
  onCloseVectorShape,
  onCancelDraw,
}: {
  template: CustomizationTemplate;
  selectedLayerId: string;
  pathEditingLayerId: string;
  selectedVectorPointId: string | null;
  isDrawing: boolean;
  pendingVectorPoints: VectorPoint[];
  dynamicFonts?: import("@trophy/customization").DynamicFontFamily[];
  onSelectLayer: (layerId: string) => void;
  onPathEditingLayerChange: (layerId: string) => void;
  onSelectVectorPoint: (pointId: string) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  onUploadBackground: (background: BackgroundAsset, file?: File) => void;
  onAddVectorPoint: (point: VectorPoint) => void;
  onUndoVectorPoint: () => void;
  onCloseVectorShape: () => void;
  onCancelDraw: () => void;
}) {
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [zoomInput, setZoomInput] = useState("72");
  const [, setFontRevision] = useState(0);
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewportDrag = useRef<{ x: number; y: number; pan: PanState } | null>(null);
  const drawDragRef = useRef<{ startX: number; startY: number; startXRatio: number; startYRatio: number; moved: boolean } | null>(null);
  const [drawDragPreview, setDrawDragPreview] = useState<{ xRatio: number; yRatio: number } | null>(null);
  const background = template.background;

  const setCommittedZoom = useCallback((nextZoom: number) => {
    const clamped = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clamped);
    setZoomInput(String(Math.round(clamped * 100)));
  }, []);

  const fitToView = useCallback(() => {
    if (!background || !workspaceRef.current) return;
    const bounds = workspaceRef.current.getBoundingClientRect();
    const availableWidth = Math.max(1, bounds.width - FIT_PADDING_PX);
    const availableHeight = Math.max(1, bounds.height - FIT_PADDING_PX);
    const nextZoom = Math.min(availableWidth / background.widthPx, availableHeight / background.heightPx);
    setCommittedZoom(nextZoom);
    setPan({ x: 0, y: 0 });
  }, [background, setCommittedZoom]);

  useEffect(() => {
    if (!background) return;
    fitToView();
  }, [background?.previewUrl, background?.widthPx, background?.heightPx, fitToView]);

  useEffect(() => {
    if (typeof document === "undefined" || !document.fonts) return;

    let cancelled = false;
    const refreshMeasurements = () => {
      if (!cancelled) setFontRevision((revision) => revision + 1);
    };

    void document.fonts.ready.then(refreshMeasurements);
    document.fonts.addEventListener("loadingdone", refreshMeasurements);
    return () => {
      cancelled = true;
      document.fonts.removeEventListener("loadingdone", refreshMeasurements);
    };
  }, [dynamicFonts]);

  if (!background) {
    return (
      <main className="flex items-center justify-center bg-ui-bg-subtle p-8">
        <label className="flex h-full min-h-[420px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ui-border-base bg-ui-bg-base text-ui-fg-muted">
          <FileImage className="mb-3 size-8" />
          Upload background image
          <BackgroundUpload onUpload={onUploadBackground} hidden />
        </label>
      </main>
    );
  }
  function commitZoomInput() {
    const parsed = Number.parseFloat(zoomInput.replace("%", ""));
    if (!Number.isFinite(parsed)) {
      setZoomInput(String(Math.round(zoom * 100)));
      return;
    }
    setCommittedZoom(parsed / 100);
  }

  function startViewportPan(event: React.PointerEvent) {
    viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveViewportPan(event: React.PointerEvent) {
    if (!viewportDrag.current) return;
    setPan({
      x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
      y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
    });
  }

  return (
    <main className="flex min-h-0 flex-col bg-ui-bg-subtle">
      <div className="flex h-12 items-center justify-between border-b border-ui-border-base bg-ui-bg-base px-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCommittedZoom(zoom - ZOOM_STEP)} className="rounded border border-ui-border-base px-2 py-1 text-sm">-</button>
          <input
            aria-label="Canvas zoom percentage"
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
            className="h-8 w-16 rounded-md border border-ui-border-base bg-ui-bg-base px-2 text-right text-sm"
          />
          <span className="text-xs text-ui-fg-muted">%</span>
          <button type="button" onClick={() => setCommittedZoom(zoom + ZOOM_STEP)} className="rounded border border-ui-border-base px-2 py-1 text-sm">+</button>
          <button type="button" onClick={fitToView} className="rounded border border-ui-border-base px-2 py-1 text-sm">Fit</button>
        </div>
      </div>
      <ShapeClipPaths layers={template.layers} />
      <FontLoader layers={template.layers} dynamicFonts={dynamicFonts} />
      <div
        ref={workspaceRef}
        className="relative min-h-0 flex-1 overflow-hidden cursor-grab active:cursor-grabbing"
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) startViewportPan(event);
        }}
        onPointerMove={moveViewportPan}
        onPointerUp={() => {
          viewportDrag.current = null;
        }}
        onPointerCancel={() => {
          viewportDrag.current = null;
        }}
      >
        <div
          ref={canvasRef}
          className={`absolute left-1/2 top-1/2 bg-white shadow-lg ${isDrawing ? "cursor-crosshair" : ""}`}
          style={{
            width: background.widthPx,
            height: background.heightPx,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            transformOrigin: "center",
          }}
          onPointerDown={(event) => {
            if (isDrawing) {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              const xRatio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
              const yRatio = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
              drawDragRef.current = { startX: event.clientX, startY: event.clientY, startXRatio: xRatio, startYRatio: yRatio, moved: false };
              event.currentTarget.setPointerCapture(event.pointerId);
              return;
            }
            if (event.target === event.currentTarget) {
              event.stopPropagation();
              onSelectLayer("");
              onPathEditingLayerChange("");
              onSelectVectorPoint("");
              startViewportPan(event);
            }
          }}
          onPointerMove={(event) => {
            if (isDrawing && drawDragRef.current) {
              const dx = event.clientX - drawDragRef.current.startX;
              const dy = event.clientY - drawDragRef.current.startY;
              if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                drawDragRef.current.moved = true;
                const bounds = event.currentTarget.getBoundingClientRect();
                setDrawDragPreview({
                  xRatio: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
                  yRatio: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
                });
              }
              return;
            }
          }}
          onPointerCancel={() => {
            if (isDrawing && drawDragRef.current) {
              drawDragRef.current = null;
              setDrawDragPreview(null);
            }
          }}
          onPointerUp={(event) => {
            if (isDrawing && drawDragRef.current) {
              event.preventDefault();
              const bounds = event.currentTarget.getBoundingClientRect();
              const xRatio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
              const yRatio = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
              if (drawDragRef.current.moved) {
                const dragXRatio = xRatio - drawDragRef.current.startXRatio;
                const dragYRatio = yRatio - drawDragRef.current.startYRatio;
                onAddVectorPoint({
                  id: createId("vector_point"),
                  type: "smooth",
                  xRatio: drawDragRef.current.startXRatio,
                  yRatio: drawDragRef.current.startYRatio,
                  inHandle: { xRatio: -dragXRatio * 0.5, yRatio: -dragYRatio * 0.5 },
                  outHandle: { xRatio: dragXRatio * 0.5, yRatio: dragYRatio * 0.5 },
                });
              } else {
                onAddVectorPoint({
                  id: createId("vector_point"),
                  type: "corner",
                  xRatio,
                  yRatio,
                });
              }
              drawDragRef.current = null;
              setDrawDragPreview(null);
              return;
            }
          }}
          onDoubleClick={(event) => {
            if (isDrawing) return;
            const layer = template.layers.find((entry) => entry.id === pathEditingLayerId);
            if (!layer || layer.type !== "text" || layer.text.path.type !== "custom") return;
            const bounds = event.currentTarget.getBoundingClientRect();
            const xRatio = (event.clientX - bounds.left) / bounds.width;
            const yRatio = (event.clientY - bounds.top) / bounds.height;
            const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
            const point = {
              id: createId("path_point"),
              xRatio: Math.max(0, Math.min(1, (xRatio * background.widthPx - rect.xPx) / rect.widthPx)),
              yRatio: Math.max(0, Math.min(1, (yRatio * background.heightPx - rect.yPx) / Math.max(1, layer.text.maxFontSizePt * layer.text.maxLines * 1.35))),
              inHandle: { xRatio: -0.08, yRatio: 0 },
              outHandle: { xRatio: 0.08, yRatio: 0 },
            };
            onUpdateLayer(layer.id, (current) =>
              current.type === "text" && current.text.path.type === "custom"
                ? { ...current, text: { ...current.text, path: { ...current.text.path, points: [...current.text.path.points, point] } } }
                : current,
            );
          }}
        >
          <img src={background.previewUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
          {isDrawing && pendingVectorPoints.length > 0 ? (
            <>
              <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
                <path
                  d={vectorPointsToSvgPathD(pendingVectorPoints, false)}
                  fill="rgba(0,0,0,0.08)"
                  stroke="#6366f1"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray="4 3"
                />
                {drawDragPreview && pendingVectorPoints.length > 0 ? (
                  <line
                    x1={pendingVectorPoints[pendingVectorPoints.length - 1]!.xRatio}
                    y1={pendingVectorPoints[pendingVectorPoints.length - 1]!.yRatio}
                    x2={drawDragPreview.xRatio}
                    y2={drawDragPreview.yRatio}
                    stroke="#6366f1"
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    strokeDasharray="3 2"
                  />
                ) : null}
              </svg>
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                {pendingVectorPoints.map((p) => (
                  <circle key={p.id} cx={`${p.xRatio * 100}%`} cy={`${p.yRatio * 100}%`} r="4" fill="#6366f1" />
                ))}
                {pendingVectorPoints.length >= 3 ? (
                  <circle
                    cx={`${pendingVectorPoints[0]!.xRatio * 100}%`}
                    cy={`${pendingVectorPoints[0]!.yRatio * 100}%`}
                    r="6"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="2"
                    strokeDasharray="3 2"
                    className="cursor-pointer pointer-events-auto"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onCloseVectorShape();
                    }}
                  />
                ) : null}
              </svg>
            </>
          ) : null}
          {isDrawing ? (
            <VectorDrawOverlay
              pointCount={pendingVectorPoints.length}
              onUndo={onUndoVectorPoint}
              onClose={onCloseVectorShape}
              onCancel={onCancelDraw}
            />
          ) : null}
          {getVisibleLayers(template).map((layer) => (
            <CanvasLayer
              key={layer.id}
              layer={layer}
              background={background}
              zoom={zoom}
              selected={selectedLayerId === layer.id && !isDrawing}
              pathEditing={pathEditingLayerId === layer.id}
              selectedVectorPointId={selectedVectorPointId}
              editing={!isDrawing}
              dynamicFonts={dynamicFonts}
              onSelect={() => onSelectLayer(layer.id)}
              onEditPath={() => onPathEditingLayerChange(layer.id)}
              onSelectVectorPoint={onSelectVectorPoint}
              onUpdate={(updater) => onUpdateLayer(layer.id, updater)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function VectorDrawOverlay({
  pointCount,
  onUndo,
  onClose,
  onCancel,
}: {
  pointCount: number;
  onUndo: () => void;
  onClose: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-ui-border-base bg-ui-bg-base px-4 py-2 shadow-lg">
      <span className="text-sm text-ui-fg-muted">{pointCount} point{pointCount !== 1 ? "s" : ""}</span>
      <button type="button" onClick={onUndo} disabled={pointCount === 0} className="rounded border border-ui-border-base px-3 py-1 text-sm disabled:opacity-40">Undo</button>
      <button type="button" onClick={onClose} disabled={pointCount < 3} className="rounded bg-ui-fg-interactive px-3 py-1 text-sm text-ui-fg-on-color disabled:opacity-40">Close Shape</button>
      <button type="button" onClick={onCancel} className="rounded border border-ui-border-base px-3 py-1 text-sm">Cancel</button>
    </div>
  );
}

function CanvasLayer({
  layer,
  background,
  zoom,
  selected,
  pathEditing,
  selectedVectorPointId,
  editing,
  dynamicFonts = [],
  onSelect,
  onEditPath,
  onSelectVectorPoint,
  onUpdate,
}: {
  layer: CustomizationLayer;
  background: BackgroundAsset;
  zoom: number;
  selected: boolean;
  pathEditing: boolean;
  selectedVectorPointId: string | null;
  editing: boolean;
  dynamicFonts?: DynamicFontFamily[];
  onSelect: () => void;
  onEditPath: () => void;
  onSelectVectorPoint: (pointId: string) => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
  const closedTextPath = layer.type === "text" && layer.text.path.type === "closed_ellipse";
  const textHeight = layer.type === "text" ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx;
  const h = closedTextPath ? Math.max(18, rect.heightPx) : layer.type === "text" ? textHeight : rect.heightPx;
  const top = layer.type === "text" ? layer.geometry.yRatio * background.heightPx - h / 2 : rect.yPx;
  const drag = useRef<{ x: number; y: number; xPx: number; yPx: number; widthPx: number; heightPx: number } | null>(null);
  function startDrag(event: React.PointerEvent) {
    if (!editing) return;
    onSelect();
    event.stopPropagation();
    if (layer.locked) return;
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      xPx: rect.xPx,
      yPx: top,
      widthPx: rect.widthPx,
      heightPx: h,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent) {
    if (!editing || !drag.current || layer.locked) return;
    const dx = (event.clientX - drag.current.x) / zoom;
    const dy = (event.clientY - drag.current.y) / zoom;
    const geometry = pixelRectToLayerGeometry({
      xPx: drag.current.xPx + dx,
      yPx: drag.current.yPx + dy,
      widthPx: drag.current.widthPx,
      heightPx: drag.current.heightPx,
      background,
    });
    onUpdate((current) => {
      const keepTextHeight = current.type === "text" && current.text.path.type === "closed_ellipse";
      return { ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: keepTextHeight ? geometry.heightRatio ?? 0.1 : undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } } as CustomizationLayer;
    });
  }
  return (
    <div
      className={`absolute select-none ${selected ? "ring-2 ring-ui-fg-interactive" : "ring-1 ring-teal-500/70"} ${layer.locked ? "cursor-not-allowed" : "cursor-move"}`}
      style={{
        left: rect.xPx,
        top,
        width: rect.widthPx,
        height: h,
        transform: `rotate(${layer.geometry.rotationDeg}deg)`,
        zIndex: layer.zIndex,
      }}
      onPointerDown={startDrag}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onDoubleClick={(event) => {
        if (editing && layer.type === "text" && layer.text.path.type === "custom") {
          event.stopPropagation();
          onEditPath();
        }
        if (editing && layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath) {
          event.stopPropagation();
          onEditPath();
        }
      }}
    >
      {layer.type === "text" ? (
        <EditorTextLayer layer={layer} widthPx={rect.widthPx} heightPx={h} pathEditing={editing && (pathEditing || (selected && closedTextPath))} dynamicFonts={dynamicFonts} />
      ) : layer.shape.type === "vector" && layer.shape.vectorPath ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          <path
            d={vectorPointsToSvgPathD(layer.shape.vectorPath.points, layer.shape.vectorPath.closed)}
            fill="rgba(20, 184, 166, 0.15)"
            stroke="#6366f1"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : (
        <div className="h-full w-full bg-teal-500/10" style={{ borderRadius: layer.shape.type === "circle" ? "999px" : layer.shape.type === "rounded_rectangle" ? "12%" : undefined, clipPath: cssShapeClip(layer.shape.type, layer.id) }} />
      )}
      {editing && pathEditing && layer.type === "text" && layer.text.path.type === "custom" ? (
        <PathPointOverlay
          layer={layer}
          onUpdate={onUpdate}
        />
      ) : null}
      {editing && selected && layer.type === "text" && layer.text.path.type === "closed_ellipse" ? <ClosedEllipsePathOverlay layer={layer} onUpdate={onUpdate} /> : null}
      {editing && selected && pathEditing && layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath ? (
        <VectorPointOverlay layer={layer} selectedPointId={selectedVectorPointId} onSelectPoint={onSelectVectorPoint} onUpdate={onUpdate} />
      ) : null}
      {editing && selected && !layer.locked ? <ResizeHandles layer={layer} background={background} zoom={zoom} onUpdate={onUpdate} /> : null}
    </div>
  );
}

export function handleStyle(handle: string): React.CSSProperties {
  const base: React.CSSProperties = { transform: "translate(-50%, -50%)" };
  const map: Record<string, React.CSSProperties> = {
    nw: { left: 0, top: 0 },
    n: { left: "50%", top: 0 },
    ne: { left: "100%", top: 0 },
    e: { left: "100%", top: "50%" },
    se: { left: "100%", top: "100%" },
    s: { left: "50%", top: "100%" },
    sw: { left: 0, top: "100%" },
    w: { left: 0, top: "50%" },
    left: { left: 0, top: "50%" },
    right: { left: "100%", top: "50%" },
  };
  return { ...base, ...map[handle] };
}

export function resizeRect(rect: ReturnType<typeof layerGeometryToPixels>, handle: string, dx: number, dy: number, lockRatio: boolean) {
  let xPx = rect.xPx;
  let yPx = rect.yPx;
  let widthPx = rect.widthPx;
  let heightPx = rect.heightPx;
  if (handle.includes("e") || handle === "right") widthPx += dx;
  if (handle.includes("s")) heightPx += dy;
  if (handle.includes("w") || handle === "left") {
    xPx += dx;
    widthPx -= dx;
  }
  if (handle.includes("n")) {
    yPx += dy;
    heightPx -= dy;
  }
  widthPx = Math.max(18, widthPx);
  heightPx = Math.max(18, heightPx);
  if (lockRatio && rect.widthPx > 0 && rect.heightPx > 0) {
    const ratio = rect.heightPx / rect.widthPx;
    heightPx = widthPx * ratio;
  }
  return { ...rect, xPx, yPx, widthPx, heightPx };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
