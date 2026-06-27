import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage } from "lucide-react";
import {
  getVisibleLayers,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  vectorPointsToSvgPathD,
  type BackgroundAsset,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeEditorLayer,
  type TextEditorLayer,
  type VectorPoint,
} from "@trophy/customization";
import { BackgroundUpload, createId, cssShapeClip, ShapeClipPaths, FontLoader } from "./customization-template-ui";

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const FIT_PADDING_PX = 64;

type CanvasMode = "edit" | "view";
type PanState = { x: number; y: number };

export function EditorCanvas({
  template,
  selectedLayerId,
  pathEditingLayerId,
  isDrawing,
  pendingVectorPoints,
  onSelectLayer,
  onPathEditingLayerChange,
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
  isDrawing: boolean;
  pendingVectorPoints: VectorPoint[];
  onSelectLayer: (layerId: string) => void;
  onPathEditingLayerChange: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  onUploadBackground: (background: BackgroundAsset, file?: File) => void;
  onAddVectorPoint: (point: VectorPoint) => void;
  onUndoVectorPoint: () => void;
  onCloseVectorShape: () => void;
  onCancelDraw: () => void;
}) {
  const [mode, setMode] = useState<CanvasMode>("edit");
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [zoomInput, setZoomInput] = useState("72");
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
    if (mode !== "view") return;
    viewportDrag.current = { x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveViewportPan(event: React.PointerEvent) {
    if (!viewportDrag.current || mode !== "view") return;
    setPan({
      x: viewportDrag.current.pan.x + event.clientX - viewportDrag.current.x,
      y: viewportDrag.current.pan.y + event.clientY - viewportDrag.current.y,
    });
  }

  return (
    <main className="flex min-h-0 flex-col bg-ui-bg-subtle">
      <div className="flex h-12 items-center justify-between border-b border-ui-border-base bg-ui-bg-base px-4">
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
      <FontLoader layers={template.layers} />
      <div
        ref={workspaceRef}
        className={`relative min-h-0 flex-1 overflow-hidden ${mode === "view" ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
        onPointerDown={startViewportPan}
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
          className={`absolute left-1/2 top-1/2 bg-white shadow-lg ${mode === "view" ? "pointer-events-none" : ""} ${isDrawing ? "cursor-crosshair" : ""}`}
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
            if (mode === "edit" && event.target === event.currentTarget) onSelectLayer("");
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
            if (mode !== "edit") return;
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
            <svg className="pointer-events-none absolute inset-0 h-full w-full">
              <path
                d={vectorPointsToSvgPathD(pendingVectorPoints, false)}
                fill="rgba(0,0,0,0.08)"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="4 3"
              />
              {drawDragPreview && pendingVectorPoints.length > 0 ? (
                <line
                  x1={`${pendingVectorPoints[pendingVectorPoints.length - 1]!.xRatio * 100}%`}
                  y1={`${pendingVectorPoints[pendingVectorPoints.length - 1]!.yRatio * 100}%`}
                  x2={`${drawDragPreview.xRatio * 100}%`}
                  y2={`${drawDragPreview.yRatio * 100}%`}
                  stroke="#6366f1"
                  strokeWidth="1"
                  strokeDasharray="3 2"
                />
              ) : null}
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
              editing={mode === "edit" && !isDrawing}
              onSelect={() => onSelectLayer(layer.id)}
              onEditPath={() => onPathEditingLayerChange(layer.id)}
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
  editing,
  onSelect,
  onEditPath,
  onUpdate,
}: {
  layer: CustomizationLayer;
  background: BackgroundAsset;
  zoom: number;
  selected: boolean;
  pathEditing: boolean;
  editing: boolean;
  onSelect: () => void;
  onEditPath: () => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
  const closedTextPath = layer.type === "text" && layer.text.path.type === "closed_ellipse";
  const textHeight = layer.type === "text" ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx;
  const h = closedTextPath ? Math.max(18, rect.heightPx) : layer.type === "text" ? textHeight : rect.heightPx;
  const top = layer.type === "text" ? layer.geometry.yRatio * background.heightPx - h / 2 : rect.yPx;
  const drag = useRef<{ x: number; y: number; xPx: number; yPx: number; widthPx: number; heightPx: number } | null>(null);
  function startDrag(event: React.PointerEvent) {
    if (!editing || layer.locked) return;
    onSelect();
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
      }}
    >
      {layer.type === "text" ? (
        <EditorTextLayer layer={layer} widthPx={rect.widthPx} heightPx={h} pathEditing={editing && (pathEditing || (selected && closedTextPath))} />
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
      {editing && selected && layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath ? (
        <VectorPointOverlay layer={layer} onUpdate={onUpdate} />
      ) : null}
      {editing && selected && !layer.locked && !(layer.type === "image_shape" && layer.shape.type === "vector") ? <ResizeHandles layer={layer} background={background} zoom={zoom} onUpdate={onUpdate} /> : null}
    </div>
  );
}

function EditorTextLayer({
  layer,
  widthPx,
  heightPx,
  pathEditing,
}: {
  layer: TextEditorLayer;
  widthPx: number;
  heightPx: number;
  pathEditing: boolean;
}) {
  if (layer.text.path.type === "straight") {
    return (
      <div 
        className="pointer-events-none flex h-full select-none items-center justify-center overflow-hidden bg-teal-500/10 text-center text-xs font-medium text-teal-900"
        style={{ fontFamily: layer.text.fontPolicy?.mode === "fixed" ? layer.text.fontPolicy.fontId : layer.text.fontPolicy?.defaultFontId }}
      >
        {layer.text.sampleText}
      </div>
    );
  }

  const pathId = `editor_text_path_${layer.id}`;
  const textWidthPx = layer.text.sampleText.length * Math.max(8, layer.text.maxFontSizePt) * 0.55;
  const wordCount = layer.text.sampleText.trim() ? layer.text.sampleText.trim().split(/\s+/).length : 0;
  const pathAttrs = getTextPathRenderAttributes({ path: layer.text.path, align: layer.text.align, widthPx, heightPx, textWidthPx, charCount: layer.text.sampleText.length, wordCount });
  const renderPath = pathAttrs.pathStartAngleDeg != null
    ? { ...layer.text.path, startAngleDeg: pathAttrs.pathStartAngleDeg }
    : layer.text.path;
  const pathD = getTextPathSvgD({ path: renderPath, widthPx, heightPx });

  return (
    <svg className="pointer-events-none h-full w-full select-none overflow-visible bg-teal-500/10" viewBox={`0 0 ${widthPx} ${heightPx}`}>
      <path d={pathD} fill="none" stroke={pathEditing ? "rgb(245 158 11)" : "transparent"} strokeWidth={pathEditing ? 1 : 0} />
      <defs>
        <path id={pathId} d={pathD} />
      </defs>
      <text fontSize={Math.max(8, layer.text.maxFontSizePt)} fontFamily={layer.text.fontPolicy?.mode === "fixed" ? layer.text.fontPolicy.fontId : layer.text.fontPolicy?.defaultFontId} fontWeight={600} fill="rgb(19 78 74)" textAnchor={pathAttrs.textAnchor} dominantBaseline="middle" textLength={pathAttrs.textLength} lengthAdjust={pathAttrs.lengthAdjust} wordSpacing={pathAttrs.wordSpacingPx ?? 0}>
        <textPath href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
          {pathAttrs.dy ? <tspan dy={pathAttrs.dy}>{layer.text.sampleText}</tspan> : layer.text.sampleText}
        </textPath>
      </text>
    </svg>
  );
}

function PathPointOverlay({
  layer,
  onUpdate,
}: {
  layer: TextEditorLayer;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  if (layer.text.path.type !== "custom") return null;
  const points = layer.text.path.points;
  return (
    <>
      {points.map((point, index) => (
        <div key={point.id}>
          <PathHandle
            pointId={point.id}
            kind="anchor"
            xRatio={point.xRatio}
            yRatio={point.yRatio}
            onMove={(xRatio, yRatio) => {
              onUpdate((current) =>
                current.type === "text" && current.text.path.type === "custom"
                  ? {
                      ...current,
                      text: {
                        ...current.text,
                        path: {
                          ...current.text.path,
                          points: current.text.path.points.map((entry) =>
                            entry.id === point.id ? { ...entry, xRatio, yRatio } : entry,
                          ),
                        },
                      },
                    }
                  : current,
              );
            }}
          />
          {point.inHandle ? (
            <PathHandle
              pointId={point.id}
              kind="in"
              xRatio={point.xRatio + point.inHandle.xRatio}
              yRatio={point.yRatio + point.inHandle.yRatio}
              onMove={(xRatio, yRatio) => updatePathHandle(onUpdate, point.id, "inHandle", xRatio - point.xRatio, yRatio - point.yRatio)}
            />
          ) : null}
          {point.outHandle ? (
            <PathHandle
              pointId={point.id}
              kind="out"
              xRatio={point.xRatio + point.outHandle.xRatio}
              yRatio={point.yRatio + point.outHandle.yRatio}
              onMove={(xRatio, yRatio) => updatePathHandle(onUpdate, point.id, "outHandle", xRatio - point.xRatio, yRatio - point.yRatio)}
            />
          ) : null}
          {index > 0 ? (
            <div
              className="pointer-events-none absolute h-px bg-amber-500"
              style={{
                left: `${points[index - 1]!.xRatio * 100}%`,
                top: `${points[index - 1]!.yRatio * 100}%`,
                width: `${Math.hypot(point.xRatio - points[index - 1]!.xRatio, point.yRatio - points[index - 1]!.yRatio) * 100}%`,
              }}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}

function PathHandle({
  kind,
  xRatio,
  yRatio,
  onMove,
}: {
  pointId: string;
  kind: "anchor" | "in" | "out";
  xRatio: number;
  yRatio: number;
  onMove: (xRatio: number, yRatio: number) => void;
}) {
  return (
    <button
      type="button"
      className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white ${kind === "anchor" ? "bg-amber-500" : "bg-sky-500"}`}
      style={{ left: `${xRatio * 100}%`, top: `${yRatio * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const target = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        function move(pointer: PointerEvent) {
          onMove(
            Math.max(0, Math.min(1, (pointer.clientX - bounds.left) / bounds.width)),
            Math.max(0, Math.min(1, (pointer.clientY - bounds.top) / bounds.height)),
          );
        }
        function stop() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
    />
  );
}

function VectorPointOverlay({
  layer,
  onUpdate,
}: {
  layer: ImageShapeEditorLayer;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const vectorPath = layer.shape.vectorPath;
  if (!vectorPath) return null;
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const points = vectorPath.points;
  const selectedPoint = points.find((p) => p.id === selectedPointId) ?? null;

  return (
    <>
      {/* Connection lines */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        {points.map((point, i) => {
          if (i === 0) return null;
          const prev = points[i - 1]!;
          const prevOut = prev.outHandle;
          const currIn = point.inHandle;
          const x1 = prev.xRatio * 100;
          const y1 = prev.yRatio * 100;
          const x2 = point.xRatio * 100;
          const y2 = point.yRatio * 100;
          if (prevOut && currIn) {
            return (
              <path
                key={`${prev.id}-${point.id}`}
                d={`M ${x1} ${y1} C ${(prev.xRatio + prevOut.xRatio) * 100} ${(prev.yRatio + prevOut.yRatio) * 100} ${(point.xRatio + currIn.xRatio) * 100} ${(point.yRatio + currIn.yRatio) * 100} ${x2} ${y2}`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
            );
          }
          return (
            <line
              key={`${prev.id}-${point.id}`}
              x1={`${x1}%`}
              y1={`${y1}%`}
              x2={`${x2}%`}
              y2={`${y2}%`}
              stroke="#6366f1"
              strokeWidth="1.5"
            />
          );
        })}
        {vectorPath.closed && points.length > 2 ? (
          <line
            x1={`${points[points.length - 1]!.xRatio * 100}%`}
            y1={`${points[points.length - 1]!.yRatio * 100}%`}
            x2={`${points[0]!.xRatio * 100}%`}
            y2={`${points[0]!.yRatio * 100}%`}
            stroke="#6366f1"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        ) : null}
      </svg>
      {/* Point circles */}
      {points.map((point) => (
        <VectorPointHandle
          key={point.id}
          point={point}
          isSelected={selectedPointId === point.id}
          onSelect={() => setSelectedPointId(point.id)}
          onDrag={(xRatio, yRatio) => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) =>
                          p.id === point.id ? { ...p, xRatio, yRatio } : p,
                        ),
                      },
                    },
                  }
                : current,
            );
          }}
          onDoubleClick={() => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) => {
                          if (p.id !== point.id) return p;
                          if (p.type === "corner") {
                            return { ...p, type: "smooth", inHandle: { xRatio: -0.08, yRatio: 0 }, outHandle: { xRatio: 0.08, yRatio: 0 } };
                          }
                          return { ...p, type: "corner", inHandle: undefined, outHandle: undefined };
                        }),
                      },
                    },
                  }
                : current,
            );
          }}
          onDelete={() => {
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.filter((p) => p.id !== point.id),
                      },
                    },
                  }
                : current,
            );
          }}
        />
      ))}
      {/* Handle lines */}
      {selectedPoint?.type === "smooth" && selectedPoint.inHandle ? (
        <VectorHandleLine point={selectedPoint} handle="in" onUpdate={onUpdate} />
      ) : null}
      {selectedPoint?.type === "smooth" && selectedPoint.outHandle ? (
        <VectorHandleLine point={selectedPoint} handle="out" onUpdate={onUpdate} />
      ) : null}
    </>
  );
}

function VectorPointHandle({
  point,
  isSelected,
  onSelect,
  onDrag,
  onDoubleClick,
  onDelete,
}: {
  point: VectorPoint;
  isSelected: boolean;
  onSelect: () => void;
  onDrag: (xRatio: number, yRatio: number) => void;
  onDoubleClick: () => void;
  onDelete: () => void;
}) {
  const dragRef = useRef<{ startX: number; startY: number; xRatio: number; yRatio: number } | null>(null);

  useKeyboardDelete(onDelete, isSelected);

  return (
    <button
      type="button"
      className={`absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm ${isSelected ? "bg-indigo-500" : "bg-indigo-300"}`}
      style={{ left: `${point.xRatio * 100}%`, top: `${point.yRatio * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect();
        const target = event.currentTarget.parentElement as HTMLElement | null;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        dragRef.current = { startX: event.clientX, startY: event.clientY, xRatio: point.xRatio, yRatio: point.yRatio };
        // Need pointer capture to get move events on the parent
        const move = (pointer: PointerEvent) => {
          if (!dragRef.current) return;
          const dx = (pointer.clientX - dragRef.current.startX) / bounds.width;
          const dy = (pointer.clientY - dragRef.current.startY) / bounds.height;
          onDrag(
            Math.max(0, Math.min(1, dragRef.current.xRatio + dx)),
            Math.max(0, Math.min(1, dragRef.current.yRatio + dy)),
          );
        };
        const stop = () => {
          dragRef.current = null;
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onDoubleClick();
      }}
    />
  );
}

function VectorHandleLine({
  point,
  handle,
  onUpdate,
}: {
  point: VectorPoint;
  handle: "in" | "out";
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const handleData = handle === "in" ? point.inHandle : point.outHandle;
  if (!handleData) return null;
  const hx = point.xRatio + handleData.xRatio;
  const hy = point.yRatio + handleData.yRatio;

  return (
    <>
      <div
        className="pointer-events-none absolute h-px bg-sky-400"
        style={{
          left: `${Math.min(point.xRatio, hx) * 100}%`,
          top: `${Math.min(point.yRatio, hy) * 100}%`,
          width: `${Math.abs(point.xRatio - hx) * 100}%`,
          transform: `rotate(${(Math.atan2(point.yRatio - hy, point.xRatio - hx) * 180) / Math.PI}deg)`,
          transformOrigin: "0 0",
        }}
      />
      <button
        type="button"
        className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-sky-400 shadow-sm"
        style={{ left: `${hx * 100}%`, top: `${hy * 100}%` }}
        onPointerDown={(event) => {
          event.stopPropagation();
          const target = event.currentTarget.parentElement as HTMLElement | null;
          if (!target) return;
          const bounds = target.getBoundingClientRect();
          const startX = event.clientX;
          const startY = event.clientY;
          const startHx = handleData.xRatio;
          const startHy = handleData.yRatio;
          function move(pointer: PointerEvent) {
            const dx = (pointer.clientX - startX) / bounds.width;
            const dy = (pointer.clientY - startY) / bounds.height;
            const newHx = startHx + dx;
            const newHy = startHy + dy;
            onUpdate((current) =>
              current.type === "image_shape" && current.shape.vectorPath
                ? {
                    ...current,
                    shape: {
                      ...current.shape,
                      vectorPath: {
                        ...current.shape.vectorPath,
                        points: current.shape.vectorPath.points.map((p) =>
                          p.id === point.id ? { ...p, [handle === "in" ? "inHandle" : "outHandle"]: { xRatio: newHx, yRatio: newHy } } : p,
                        ),
                      },
                    },
                  }
                : current,
            );
          }
          function stop() {
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", stop);
          }
          window.addEventListener("pointermove", move);
          window.addEventListener("pointerup", stop);
        }}
      />
    </>
  );
}

function useKeyboardDelete(onDelete: () => void, enabled: boolean) {
  const ref = useRef(onDelete);
  ref.current = onDelete;
  useEffect(() => {
    if (!enabled) return;
    function handler(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        ref.current();
      }
    }
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled]);
}

function ClosedEllipsePathOverlay({
  layer,
  onUpdate,
}: {
  layer: TextEditorLayer;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  if (layer.text.path.type !== "closed_ellipse") return null;
  const path = layer.text.path;
  const angle = (path.startAngleDeg * Math.PI) / 180;
  const xRatio = path.bounds.xRatio + (Math.cos(angle) * path.bounds.widthRatio) / 2;
  const yRatio = path.bounds.yRatio + (Math.sin(angle) * path.bounds.heightRatio) / 2;

  return (
    <button
      type="button"
      title="Text start position"
      className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-500 shadow"
      style={{ left: `${xRatio * 100}%`, top: `${yRatio * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const target = event.currentTarget.parentElement as HTMLElement | null;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        function move(pointer: PointerEvent) {
          const x = (pointer.clientX - bounds.left) / bounds.width;
          const y = (pointer.clientY - bounds.top) / bounds.height;
          const dx = x - path.bounds.xRatio;
          const dy = y - path.bounds.yRatio;
          const startAngleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
          onUpdate((current) =>
            current.type === "text" && current.text.path.type === "closed_ellipse"
              ? { ...current, text: { ...current.text, path: { ...current.text.path, startAngleDeg } } }
              : current,
          );
        }
        function stop() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
    />
  );
}

function ResizeHandles({ layer, background, zoom, onUpdate }: { layer: CustomizationLayer; background: BackgroundAsset; zoom: number; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  const closedTextPath = layer.type === "text" && layer.text.path.type === "closed_ellipse";
  const handles = layer.type === "text" ? (closedTextPath ? ["nw", "n", "ne", "e", "se", "s", "sw", "w"] : ["left", "right"]) : layer.shape.lockAspectRatio ? ["nw", "ne", "sw", "se"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  return (
    <>
      {handles.map((handle) => (
        <button
          key={handle}
          type="button"
          className="absolute size-2 rounded-full bg-ui-fg-interactive"
          style={handleStyle(handle)}
          onPointerDown={(event) => {
            event.stopPropagation();
            const startX = event.clientX;
            const startY = event.clientY;
            const start = layerGeometryToPixels({ geometry: layer.geometry, background });
            function move(pointer: PointerEvent) {
              const dx = (pointer.clientX - startX) / zoom;
              const dy = (pointer.clientY - startY) / zoom;
              const next = resizeRect(start, handle, dx, dy, layer.type === "image_shape" && layer.shape.lockAspectRatio);
              const geometry = pixelRectToLayerGeometry({ ...next, heightPx: layer.type === "image_shape" || closedTextPath ? next.heightPx : undefined, background });
              onUpdate((current) => {
                const keepTextHeight = current.type === "text" && current.text.path.type === "closed_ellipse";
                return { ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: keepTextHeight ? geometry.heightRatio ?? 0.1 : undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } } as CustomizationLayer;
              });
            }
            function stop() {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", stop);
            }
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", stop);
          }}
        />
      ))}
    </>
  );
}

function updatePathHandle(
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void,
  pointId: string,
  handle: "inHandle" | "outHandle",
  xRatio: number,
  yRatio: number,
) {
  onUpdate((current) =>
    current.type === "text" && current.text.path.type === "custom"
      ? {
          ...current,
          text: {
            ...current.text,
            path: {
              ...current.text.path,
              points: current.text.path.points.map((point) =>
                point.id === pointId ? { ...point, [handle]: { xRatio, yRatio } } : point,
              ),
            },
          },
        }
      : current,
  );
}

function handleStyle(handle: string): React.CSSProperties {
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

function resizeRect(rect: ReturnType<typeof layerGeometryToPixels>, handle: string, dx: number, dy: number, lockRatio: boolean) {
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
