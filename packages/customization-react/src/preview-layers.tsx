import { useId, type PointerEvent as ReactPointerEvent } from "react";
import {
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  vectorPointsToSvgPathD,
  type ImageShapeFieldValue,
  type RuntimeLayer,
} from "@trophy/customization";
import type { ResolveCustomizationAssetUrl } from "./index";

const MIN_FREE_IMAGE_SCALE = 0.02;
type ResizeCorner = "nw" | "ne" | "sw" | "se";

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
  fit,
}: {
  sourceWidthPx: number;
  sourceHeightPx: number;
  frameWidthPx: number;
  frameHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
  fit?: "cover" | "contain";
}) {
  const safeSourceWidth = Math.max(1, sourceWidthPx || 1);
  const safeSourceHeight = Math.max(1, sourceHeightPx || 1);
  const safeFrameWidth = Math.max(1, frameWidthPx || 1);
  const safeFrameHeight = Math.max(1, frameHeightPx || 1);
  
  const baseScale = fit === "contain"
    ? Math.min(safeFrameWidth / safeSourceWidth, safeFrameHeight / safeSourceHeight)
    : Math.max(safeFrameWidth / safeSourceWidth, safeFrameHeight / safeSourceHeight);
    
  const scale = freeImageScale(cropScale);
  const widthPx = safeSourceWidth * baseScale * scale;
  const heightPx = safeSourceHeight * baseScale * scale;
  const centerXPx =
    safeFrameWidth / 2 + freeCropOffset(cropXRatio) * safeFrameWidth;
  const centerYPx =
    safeFrameHeight / 2 + freeCropOffset(cropYRatio) * safeFrameHeight;

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

export function PreviewText({
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
  // useId() must be called at the top level of the component (Rules of Hooks).
  // We generate a per-instance unique path ID here so that when both the
  // mobile and desktop preview canvases are mounted simultaneously in the DOM
  // they each reference their own <path> element instead of colliding on a
  // shared global ID like "storefront_product_text_path_${layer.id}".
  const instanceId = useId().replace(/:/g, "");
  const pathId = `preview_text_path_${instanceId}`;

  const closedTextPath = layer.path.type === "closed_ellipse";
  const layerWidthPx = layer.geometry.widthRatio * width;
  const layerHeightPx = closedTextPath
    ? Math.max(
        1,
        (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height,
      )
    : layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const left = (layer.geometry.xRatio * width - layerWidthPx / 2) * scale;
  const top = (layer.geometry.yRatio * height - layerHeightPx / 2) * scale;

  if (layer.path.type !== "straight") {
    const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
    const wordCount = layer.text.trim()
      ? layer.text.trim().split(/\s+/).length
      : 0;
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
    const pathD = getTextPathSvgD({
      path: renderPath,
      widthPx: layerWidthPx,
      heightPx: layerHeightPx,
    });

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
            {pathAttrs.dy ? (
              <tspan dy={pathAttrs.dy}>{layer.text}</tspan>
            ) : (
              layer.text
            )}
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

function renderShapeClipElement(
  shape: Extract<RuntimeLayer, { type: "image_shape" }>["shape"],
  widthPx: number,
  heightPx: number,
) {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);

  if (shape.type === "circle") {
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} />;
  }

  if (shape.type === "ellipse") {
    return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h * 0.4} />;
  }

  if (shape.type === "rounded_rectangle") {
    const radius = Math.min(w, h) * 0.12;
    return <rect x={0} y={0} width={w} height={h} rx={radius} ry={radius} />;
  }

  if (shape.type === "star") {
    const points = [
      [0.5, 0],
      [0.6293, 0.322],
      [0.9755, 0.3455],
      [0.7092, 0.568],
      [0.7939, 0.9045],
      [0.5, 0.72],
      [0.2061, 0.9045],
      [0.2908, 0.568],
      [0.0245, 0.3455],
      [0.3707, 0.322],
    ]
      .map(([px, py]) => `${(px ?? 0) * w},${(py ?? 0) * h}`)
      .join(" ");
    return <polygon points={points} />;
  }

  if (shape.type === "heart") {
    const pathD = `M ${w * 0.5} ${h * 0.85} C ${w * 0.1} ${h * 0.55}, 0 ${h * 0.25}, ${w * 0.25} ${h * 0.12} C ${w * 0.4} 0, ${w * 0.5} ${h * 0.16}, ${w * 0.5} ${h * 0.28} C ${w * 0.5} ${h * 0.16}, ${w * 0.6} 0, ${w * 0.75} ${h * 0.12} C ${w} ${h * 0.25}, ${w * 0.9} ${h * 0.55}, ${w * 0.5} ${h * 0.85} Z`;
    return <path d={pathD} />;
  }

  if (shape.type === "vector" && shape.vectorPath) {
    return (
      <path
        d={vectorPointsToSvgPathD(
          shape.vectorPath.points,
          shape.vectorPath.closed,
        )}
        transform={`scale(${w} ${h})`}
      />
    );
  }

  return <rect x={0} y={0} width={w} height={h} />;
}

export function PreviewImageShape({
  layer,
  width,
  height,
  scale,
  interactive,
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
  interactive: boolean;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  value?: ImageShapeFieldValue | null;
  onChange?: (value: ImageShapeFieldValue) => void;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const rect = layerGeometryToPixels({
    geometry: layer.geometry,
    background: { widthPx: width, heightPx: height },
  });
  const imageRect = getFreeImageRect({
    sourceWidthPx: value?.sourceWidthPx ?? layer.sourceWidthPx,
    sourceHeightPx: value?.sourceHeightPx ?? layer.sourceHeightPx,
    frameWidthPx: rect.widthPx,
    frameHeightPx: rect.heightPx,
    cropScale: value?.cropScale ?? layer.cropScale,
    cropXRatio: value?.cropXRatio ?? layer.cropXRatio,
    cropYRatio: value?.cropYRatio ?? layer.cropYRatio,
    fit: layer.fit ?? "contain",
  });
  const editable = Boolean(value && onChange);
  const inlineClipId = `inline-clip-${useId().replace(/:/g, "")}`;
  const imageSource =
    resolveAssetUrl?.(value?.previewUrl ?? layer.previewUrl) ??
    value?.previewUrl ??
    layer.previewUrl;
  const cropRotationDeg = value?.cropRotationDeg ?? layer.cropRotationDeg;

  function updateFromImageRect(next: {
    centerXPx: number;
    centerYPx: number;
    widthPx: number;
  }) {
    if (!value || !onChange) return;
    onChange({
      ...value,
      cropScale: Math.max(
        MIN_FREE_IMAGE_SCALE,
        (next.widthPx / imageRect.widthPx) * imageRect.cropScale,
      ),
      cropXRatio:
        (next.centerXPx - rect.widthPx / 2) / Math.max(1, rect.widthPx),
      cropYRatio:
        (next.centerYPx - rect.heightPx / 2) / Math.max(1, rect.heightPx),
    });
  }

  function startResize(
    event: ReactPointerEvent<HTMLButtonElement>,
    corner: ResizeCorner,
  ) {
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
    const vectorLengthSq = Math.max(
      1,
      vector.x * vector.x + vector.y * vector.y,
    );
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(pointer: PointerEvent) {
      const dx = (pointer.clientX - startX) / scale;
      const dy = (pointer.clientY - startY) / scale;
      const nextVector = {
        x: moving.x + dx - fixed.x,
        y: moving.y + dy - fixed.y,
      };
      const nextScale = Math.max(
        MIN_FREE_IMAGE_SCALE,
        (nextVector.x * vector.x + nextVector.y * vector.y) / vectorLengthSq,
      );
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
        pointerEvents: interactive ? "auto" : "none",
        touchAction: "none",
      }}
      onWheel={(event) => {
        if (!interactive || !editable || !value || !selected) return;
        event.preventDefault();
        event.stopPropagation();
        onSelect?.();
        const nextCropScale = Math.max(
          MIN_FREE_IMAGE_SCALE,
          imageRect.cropScale * (event.deltaY < 0 ? 1.06 : 1 / 1.06),
        );
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerXPx = (event.clientX - bounds.left) / scale;
        const pointerYPx = (event.clientY - bounds.top) / scale;
        const scaleRatio = nextCropScale / imageRect.cropScale;
        updateFromImageRect({
          centerXPx:
            pointerXPx - (pointerXPx - imageRect.centerXPx) * scaleRatio,
          centerYPx:
            pointerYPx - (pointerYPx - imageRect.centerYPx) * scaleRatio,
          widthPx: imageRect.widthPx * scaleRatio,
        });
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          cursor: editable && selected ? "move" : "default",
        }}
        onPointerDown={(event) => {
          if (!interactive || !editable || !value || !onChange) return;
          if (!selected) {
            event.preventDefault();
            event.stopPropagation();
            onSelect?.();
            return;
          }
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
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${rect.widthPx} ${rect.heightPx}`}
          preserveAspectRatio="none"
        >
          <defs>
            <clipPath id={inlineClipId} clipPathUnits="userSpaceOnUse">
              {renderShapeClipElement(layer.shape, rect.widthPx, rect.heightPx)}
            </clipPath>
          </defs>
          <g clipPath={`url(#${inlineClipId})`}>
            <image
              href={imageSource}
              x={imageRect.xPx}
              y={imageRect.yPx}
              width={imageRect.widthPx}
              height={imageRect.heightPx}
              preserveAspectRatio="none"
              transform={`rotate(${cropRotationDeg} ${imageRect.centerXPx} ${imageRect.centerYPx})`}
            />
          </g>
        </svg>
      </div>
      {selected && editable && interactive ? (
        <>
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize image ${corner}`}
              className="absolute z-10 flex size-10 items-center justify-center md:size-6"
              style={{
                left:
                  (corner === "nw" || corner === "sw"
                    ? imageRect.xPx
                    : imageRect.xPx + imageRect.widthPx) * scale,
                top:
                  (corner === "nw" || corner === "ne"
                    ? imageRect.yPx
                    : imageRect.yPx + imageRect.heightPx) * scale,
                transform: "translate(-50%, -50%)",
                cursor:
                  corner === "nw" || corner === "se"
                    ? "nwse-resize"
                    : "nesw-resize",
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
