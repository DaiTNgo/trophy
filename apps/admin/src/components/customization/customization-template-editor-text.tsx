import {
  createDefaultTextValue,
  fitTextToLayer,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  type BackgroundAsset,
  type CustomizationLayer,
  type DynamicFontFamily,
  type TextEditorLayer,
} from "@trophy/customization";
import { handleStyle, resizeRect } from "./customization-template-editor";

let textMeasureCanvas: HTMLCanvasElement | null = null;
function quoteFontFamily(fontId: string) { return `"${fontId.replace(/["\\]/g, "\\$&")}"`; }
function measureTextCanvas(text: string, fontSizePt: number, fontId: string) {
  if (typeof document === "undefined") return text.length * fontSizePt * 0.55;
  textMeasureCanvas ??= document.createElement("canvas");
  const context = textMeasureCanvas.getContext("2d");
  if (!context) return text.length * fontSizePt * 0.55;
  context.font = `${fontSizePt}px ${quoteFontFamily(fontId)}`;
  return context.measureText(text).width;
}

export function EditorTextLayer({
  layer,
  widthPx,
  heightPx,
  pathEditing,
  dynamicFonts = [],
}: {
  layer: TextEditorLayer;
  widthPx: number;
  heightPx: number;
  pathEditing: boolean;
  dynamicFonts?: DynamicFontFamily[];
}) {
  const fitted = fitTextToLayer({
    layer,
    value: createDefaultTextValue(layer),
    availableWidthPx: widthPx,
    availableHeightPx: layer.text.path.type !== "straight" ? heightPx : undefined,
    measure: measureTextCanvas,
    dynamicFonts,
  });

  if (layer.text.path.type === "straight") {
    return (
      <div
        className="pointer-events-none h-full w-full select-none overflow-hidden bg-teal-500/10"
        style={{
          display: "grid",
          alignContent: "center",
          color: fitted.color,
          fontFamily: fitted.fontId,
          fontSize: fitted.fontSizePt,
          lineHeight: 1.35,
          fontWeight: fitted.isBold ? 700 : 400,
          fontStyle: fitted.isItalic ? "italic" : "normal",
          textAlign: fitted.align === "justified" ? "justify" : fitted.align,
          whiteSpace: "pre-wrap",
        }}
      >
        {fitted.text}
      </div>
    );
  }

  const pathId = `editor_text_path_${layer.id}`;
  const textWidthPx = fitted.text.length * Math.max(8, fitted.fontSizePt) * 0.55;
  const wordCount = fitted.text.trim() ? fitted.text.trim().split(/\s+/).length : 0;
  const pathAttrs = getTextPathRenderAttributes({ path: layer.text.path, align: fitted.align, widthPx, heightPx, textWidthPx, charCount: fitted.text.length, wordCount });
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
      <text fontSize={fitted.fontSizePt} fontFamily={fitted.fontId} fontWeight={fitted.isBold ? 700 : 400} fontStyle={fitted.isItalic ? "italic" : "normal"} fill={fitted.color} textAnchor={pathAttrs.textAnchor} dominantBaseline="middle" textLength={pathAttrs.textLength} lengthAdjust={pathAttrs.lengthAdjust} wordSpacing={pathAttrs.wordSpacingPx ?? 0}>
        <textPath href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
          {pathAttrs.dy ? <tspan dy={pathAttrs.dy}>{fitted.text}</tspan> : fitted.text}
        </textPath>
      </text>
    </svg>
  );
}

export function PathPointOverlay({
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
                point.id === pointId
                  ? { ...point, [handle]: { xRatio, yRatio } }
                  : point,
              ),
            },
          },
        }
      : current,
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

export function ClosedEllipsePathOverlay({
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

export function ResizeHandles({ layer, background, zoom, onUpdate }: { layer: CustomizationLayer; background: BackgroundAsset; zoom: number; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
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

