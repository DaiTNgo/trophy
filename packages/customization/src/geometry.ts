import type { BackgroundAsset, LayerGeometry, ShapeType, VectorPoint } from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const normalizeCropScale = (value?: number) => Math.max(0.02, Number.isFinite(value) ? value! : 1);
export const normalizeCropPan = (value?: number) => Number.isFinite(value) ? value! : 0;
export const normalizeCropRotation = (value?: number) => Number.isFinite(value) ? value! : 0;

export const layerGeometryToPixels = ({
  geometry,
  background,
}: {
  geometry: LayerGeometry;
  background: Pick<BackgroundAsset, "widthPx" | "heightPx">;
}) => {
  const widthPx = geometry.widthRatio * background.widthPx;
  const heightPx = (geometry.heightRatio ?? 0) * background.heightPx;
  const centerXPx = geometry.xRatio * background.widthPx;
  const centerYPx = geometry.yRatio * background.heightPx;
  return {
    xPx: centerXPx - widthPx / 2,
    yPx: centerYPx - heightPx / 2,
    widthPx,
    heightPx,
    centerXPx,
    centerYPx,
    rotationDeg: geometry.rotationDeg,
  };
};

export const pixelRectToLayerGeometry = ({
  xPx,
  yPx,
  widthPx,
  heightPx,
  rotationDeg = 0,
  background,
}: {
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx?: number;
  rotationDeg?: number;
  background: Pick<BackgroundAsset, "widthPx" | "heightPx">;
}): LayerGeometry => ({
  xRatio: background.widthPx > 0 ? (xPx + widthPx / 2) / background.widthPx : 0,
  yRatio: background.heightPx > 0 ? (yPx + (heightPx ?? 0) / 2) / background.heightPx : 0,
  widthRatio: background.widthPx > 0 ? widthPx / background.widthPx : 0,
  heightRatio: heightPx === undefined || background.heightPx <= 0 ? undefined : heightPx / background.heightPx,
  rotationDeg,
});

export const getCoverImageRect = ({
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
}) => {
  const safeSourceWidth = Math.max(1, sourceWidthPx);
  const safeSourceHeight = Math.max(1, sourceHeightPx);
  const safeFrameWidth = Math.max(1, frameWidthPx);
  const safeFrameHeight = Math.max(1, frameHeightPx);
  const scale = Math.max(safeFrameWidth / safeSourceWidth, safeFrameHeight / safeSourceHeight) *
    normalizeCropScale(cropScale);
  const widthPx = safeSourceWidth * scale;
  const heightPx = safeSourceHeight * scale;
  const overflowXPx = Math.max(0, widthPx - safeFrameWidth);
  const overflowYPx = Math.max(0, heightPx - safeFrameHeight);
  const panX = normalizeCropPan(cropXRatio);
  const panY = normalizeCropPan(cropYRatio);

  return {
    xPx: -safeFrameWidth / 2 - (overflowXPx * (panX + 1)) / 2,
    yPx: -safeFrameHeight / 2 - (overflowYPx * (panY + 1)) / 2,
    widthPx,
    heightPx,
    overflowXPx,
    overflowYPx,
    cropScale: normalizeCropScale(cropScale),
    cropXRatio: panX,
    cropYRatio: panY,
  };
};

export const getCropPanFromImagePosition = ({
  imageXPx,
  imageYPx,
  frameWidthPx,
  frameHeightPx,
  imageWidthPx,
  imageHeightPx,
}: {
  imageXPx: number;
  imageYPx: number;
  frameWidthPx: number;
  frameHeightPx: number;
  imageWidthPx: number;
  imageHeightPx: number;
}) => {
  const overflowXPx = Math.max(0, imageWidthPx - frameWidthPx);
  const overflowYPx = Math.max(0, imageHeightPx - frameHeightPx);
  return {
    cropXRatio: overflowXPx > 0 ? clamp(((-frameWidthPx / 2 - imageXPx) / overflowXPx) * 2 - 1, -1, 1) : 0,
    cropYRatio: overflowYPx > 0 ? clamp(((-frameHeightPx / 2 - imageYPx) / overflowYPx) * 2 - 1, -1, 1) : 0,
  };
};

export const getShapeClipPath = ({
  shape,
  widthPx,
  heightPx,
}: {
  shape: ShapeType;
  widthPx: number;
  heightPx: number;
}) => {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);
  if (shape === "circle" || shape === "ellipse") {
    return `ellipse(${w / 2} ${h / 2} ${w / 2} ${h / 2})`;
  }
  if (shape === "rounded_rectangle") {
    const radius = Math.min(w, h) * 0.12;
    return `roundRect(0 0 ${w} ${h} ${radius})`;
  }
  if (shape === "star") {
    const points = Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const radius = index % 2 === 0 ? 0.5 : 0.22;
      return `${w / 2 + Math.cos(angle) * w * radius},${h / 2 + Math.sin(angle) * h * radius}`;
    });
    return `polygon(${points.join(" ")})`;
  }
  if (shape === "heart") {
    return `path(M ${w / 2} ${h * 0.85} C ${w * 0.1} ${h * 0.55}, 0 ${h * 0.25}, ${w * 0.25} ${h * 0.12} C ${w * 0.4} 0, ${w / 2} ${h * 0.16}, ${w / 2} ${h * 0.28} C ${w / 2} ${h * 0.16}, ${w * 0.6} 0, ${w * 0.75} ${h * 0.12} C ${w} ${h * 0.25}, ${w * 0.9} ${h * 0.55}, ${w / 2} ${h * 0.85} Z)`;
  }
  return `rect(0 0 ${w} ${h})`;
};

export const vectorPointsToSvgPathD = (points: VectorPoint[], closed: boolean) => {
  if (points.length === 0) return "";

  const n = points.length;
  // Pre-compute effective corner radius for each point
  const effectiveRadius: number[] = points.map((p, i) => {
    const r = p.cornerRadius ?? 0;
    if (r <= 0 || p.type === "smooth") return 0;
    
    const prev = closed ? points[(i - 1 + n) % n] : points[i - 1];
    const next = closed ? points[(i + 1) % n] : points[i + 1];
    
    // Disable corner radius if adjacent segments are bezier curves
    if (prev && (prev.outHandle || p.inHandle)) return 0;
    if (next && (p.outHandle || next.inHandle)) return 0;

    let maxR = r;
    if (prev) {
      const segLen = Math.hypot(p.xRatio - prev.xRatio, p.yRatio - prev.yRatio);
      maxR = Math.min(maxR, segLen / 2);
    }
    if (next) {
      const segLen = Math.hypot(next.xRatio - p.xRatio, next.yRatio - p.yRatio);
      maxR = Math.min(maxR, segLen / 2);
    }
    return Math.max(0, maxR);
  });

  function lerp(from: VectorPoint, to: VectorPoint, dist: number) {
    const segLen = Math.hypot(to.xRatio - from.xRatio, to.yRatio - from.yRatio);
    if (segLen === 0) return { x: from.xRatio, y: from.yRatio };
    const t = dist / segLen;
    return { x: from.xRatio + (to.xRatio - from.xRatio) * t, y: from.yRatio + (to.yRatio - from.yRatio) * t };
  }

  const parts: string[] = [];
  const firstRadius = effectiveRadius[0]!;

  // Determine start point
  if (firstRadius > 0 && closed && n > 1) {
    // Start at the exit point of the first corner's arc (towards point 1)
    const startPt = lerp(points[0]!, points[1]!, firstRadius);
    parts.push(`M ${startPt.x} ${startPt.y}`);
  } else {
    parts.push(`M ${points[0]!.xRatio} ${points[0]!.yRatio}`);
  }

  for (let i = 1; i < n; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const prevOut = prev.outHandle;
    const currIn = curr.inHandle;
    const rCurr = effectiveRadius[i]!;

    if (prevOut || currIn) {
      const cp1x = prev.xRatio + (prevOut?.xRatio ?? 0);
      const cp1y = prev.yRatio + (prevOut?.yRatio ?? 0);
      const cp2x = curr.xRatio + (currIn?.xRatio ?? 0);
      const cp2y = curr.yRatio + (currIn?.yRatio ?? 0);
      parts.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.xRatio} ${curr.yRatio}`);
    } else {
      const endPt = rCurr > 0 ? lerp(curr, prev, rCurr) : { x: curr.xRatio, y: curr.yRatio };
      
      // If we are at i=1 and not closed, and prev had radius, we started at M prev.
      // So we just draw L endPt. The start of the line is naturally connected.
      parts.push(`L ${endPt.x} ${endPt.y}`);

      if (rCurr > 0) {
        const nextIdx = i + 1 < n ? i + 1 : (closed ? 0 : -1);
        if (nextIdx >= 0) {
          const next = points[nextIdx]!;
          const exitPt = lerp(curr, next, rCurr);
          parts.push(`Q ${curr.xRatio} ${curr.yRatio} ${exitPt.x} ${exitPt.y}`);
        }
      }
    }
  }

  if (closed && n > 2) {
    const first = points[0]!;
    const last = points[n - 1]!;
    const lastOut = last.outHandle;
    const firstIn = first.inHandle;
    const rFirst = effectiveRadius[0]!;

    if (lastOut || firstIn) {
      const cp1x = last.xRatio + (lastOut?.xRatio ?? 0);
      const cp1y = last.yRatio + (lastOut?.yRatio ?? 0);
      const cp2x = first.xRatio + (firstIn?.xRatio ?? 0);
      const cp2y = first.yRatio + (firstIn?.yRatio ?? 0);
      parts.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${first.xRatio} ${first.yRatio}`);
    } else {
      const endPt = rFirst > 0 ? lerp(first, last, rFirst) : { x: first.xRatio, y: first.yRatio };
      parts.push(`L ${endPt.x} ${endPt.y}`);
      if (rFirst > 0) {
        const secondPt = points[1]!;
        const exitPt = lerp(first, secondPt, rFirst);
        parts.push(`Q ${first.xRatio} ${first.yRatio} ${exitPt.x} ${exitPt.y}`);
      }
    }
    parts.push("Z");
  }
  return parts.join(" ");
};
