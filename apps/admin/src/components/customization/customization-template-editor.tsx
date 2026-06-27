import { useCallback, useEffect, useRef, useState } from "react";
import { FileImage } from "lucide-react";
import {
  getVisibleLayers,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  type BackgroundAsset,
  type CustomizationLayer,
  type CustomizationTemplate,
  type TextEditorLayer,
} from "@trophy/customization";
import { BackgroundUpload, createId, cssShapeClip } from "./customization-template-ui";

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
  onSelectLayer,
  onPathEditingLayerChange,
  onUpdateLayer,
  onUploadBackground,
}: {
  template: CustomizationTemplate;
  selectedLayerId: string;
  pathEditingLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onPathEditingLayerChange: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  onUploadBackground: (background: BackgroundAsset) => void;
}) {
  const [mode, setMode] = useState<CanvasMode>("edit");
  const [zoom, setZoom] = useState(0.72);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [zoomInput, setZoomInput] = useState("72");
  const workspaceRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const viewportDrag = useRef<{ x: number; y: number; pan: PanState } | null>(null);
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
          className={`absolute left-1/2 top-1/2 bg-white shadow-lg ${mode === "view" ? "pointer-events-none" : ""}`}
          style={{
            width: background.widthPx,
            height: background.heightPx,
            transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
            transformOrigin: "center",
          }}
          onPointerDown={(event) => {
            if (mode === "edit" && event.target === event.currentTarget) onSelectLayer("");
          }}
          onDoubleClick={(event) => {
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
          {getVisibleLayers(template).map((layer) => (
            <CanvasLayer
              key={layer.id}
              layer={layer}
              background={background}
              zoom={zoom}
              selected={selectedLayerId === layer.id}
              pathEditing={pathEditingLayerId === layer.id}
              editing={mode === "edit"}
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
  const textHeight = layer.type === "text" ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx;
  const h = layer.type === "text" ? textHeight : rect.heightPx;
  const top = layer.type === "text" ? layer.geometry.yRatio * background.heightPx - h / 2 : rect.yPx;
  const drag = useRef<{ x: number; y: number; rect: typeof rect } | null>(null);
  function startDrag(event: React.PointerEvent) {
    if (!editing || layer.locked) return;
    onSelect();
    drag.current = { x: event.clientX, y: event.clientY, rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent) {
    if (!editing || !drag.current || layer.locked) return;
    const dx = (event.clientX - drag.current.x) / zoom;
    const dy = (event.clientY - drag.current.y) / zoom;
    const geometry = pixelRectToLayerGeometry({
      xPx: drag.current.rect.xPx + dx,
      yPx: (layer.type === "text" ? top : drag.current.rect.yPx) + dy,
      widthPx: drag.current.rect.widthPx,
      heightPx: layer.type === "image_shape" ? drag.current.rect.heightPx : undefined,
      background,
    });
    onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
  }
  return (
    <div
      className={`absolute ${selected ? "ring-2 ring-ui-fg-interactive" : "ring-1 ring-teal-500/70"} ${layer.locked ? "cursor-not-allowed" : "cursor-move"}`}
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
        <div className="flex h-full items-center justify-center overflow-hidden bg-teal-500/10 text-center text-xs font-medium text-teal-900">
          {layer.text.sampleText}
        </div>
      ) : (
        <div className="h-full w-full bg-teal-500/10" style={{ borderRadius: layer.shape.type === "circle" ? "999px" : layer.shape.type === "rounded_rectangle" ? "12%" : undefined, clipPath: cssShapeClip(layer.shape.type) }} />
      )}
      {editing && pathEditing && layer.type === "text" && layer.text.path.type === "custom" ? (
        <PathPointOverlay
          layer={layer}
          onUpdate={onUpdate}
        />
      ) : null}
      {editing && selected && !layer.locked ? <ResizeHandles layer={layer} background={background} zoom={zoom} onUpdate={onUpdate} /> : null}
    </div>
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

function ResizeHandles({ layer, background, zoom, onUpdate }: { layer: CustomizationLayer; background: BackgroundAsset; zoom: number; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  const handles = layer.type === "text" ? ["left", "right"] : layer.shape.lockAspectRatio ? ["nw", "ne", "sw", "se"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
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
              const geometry = pixelRectToLayerGeometry({ ...next, heightPx: layer.type === "image_shape" ? next.heightPx : undefined, background });
              onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
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
