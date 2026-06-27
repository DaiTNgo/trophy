import type { BackgroundAsset, LayerGeometry, ShapeType, VectorPoint } from "./types";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const normalizeCropScale = (value?: number) => clamp(value ?? 1, 1, 4);
export const normalizeCropPan = (value?: number) => clamp(value ?? 0, -1, 1);

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
  const parts: string[] = [];
  parts.push(`M ${points[0]!.xRatio} ${points[0]!.yRatio}`);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const prevOut = prev.outHandle;
    const currIn = curr.inHandle;
    if (prevOut && currIn) {
      parts.push(
        `C ${prev.xRatio + prevOut.xRatio} ${prev.yRatio + prevOut.yRatio} ${curr.xRatio + currIn.xRatio} ${curr.yRatio + currIn.yRatio} ${curr.xRatio} ${curr.yRatio}`,
      );
    } else {
      parts.push(`L ${curr.xRatio} ${curr.yRatio}`);
    }
  }
  if (closed && points.length > 2) {
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const lastOut = last.outHandle;
    const firstIn = first.inHandle;
    if (lastOut && firstIn) {
      parts.push(
        `C ${last.xRatio + lastOut.xRatio} ${last.yRatio + lastOut.yRatio} ${first.xRatio + firstIn.xRatio} ${first.yRatio + firstIn.yRatio} ${first.xRatio} ${first.yRatio}`,
      );
    }
    parts.push("Z");
  }
  return parts.join(" ");
};
