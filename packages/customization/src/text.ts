import type {
  BezierPoint,
  CustomizationFieldValue,
  CustomizationFormValues,
  CustomizationTemplate,
  TextColorPolicy,
  TextEditorLayer,
  TextFieldValue,
  TextFontPolicy,
  TextPath,
} from "./types";
import { clamp } from "./geometry";
import { normalizeSingleLine, getLayerById } from "./template";

const resolveColor = (policy: TextColorPolicy, selected?: string) => {
  if (policy.mode === "fixed") return policy.color;
  if (selected && policy.options.some((option) => option.value === selected)) return selected;
  return policy.defaultColor;
};

const resolveFont = (policy: TextFontPolicy, selected?: string) => {
  if (policy.mode === "fixed") return policy.fontId;
  if (selected && policy.options.some((option) => option.value === selected)) return selected;
  return policy.defaultFontId;
};

export const createDefaultTextValue = (layer: TextEditorLayer): TextFieldValue => ({
  text: layer.text.sampleText,
  color: resolveColor(layer.text.colorPolicy),
  fontId: resolveFont(layer.text.fontPolicy),
});

export const createDefaultFormValues = (template: CustomizationTemplate): CustomizationFormValues => {
  const values: CustomizationFormValues = {};
  for (const field of template.formFields) {
    const layer = getLayerById(template, field.layerId);
    if (!layer) continue;
    values[field.id] = layer.type === "text" ? createDefaultTextValue(layer) : null;
  }
  return values;
};

const getTextValue = (layer: TextEditorLayer, value: CustomizationFieldValue | undefined): TextFieldValue => {
  if (value && "text" in value) {
    return {
      text: typeof value.text === "string" ? value.text : "",
      color: typeof value.color === "string" ? value.color : resolveColor(layer.text.colorPolicy),
      fontId: typeof value.fontId === "string" ? value.fontId : resolveFont(layer.text.fontPolicy),
    };
  }
  return createDefaultTextValue(layer);
};

export const normalizeBezierPoint = (point: BezierPoint): BezierPoint => ({
  id: point.id,
  xRatio: clamp(point.xRatio, 0, 1),
  yRatio: clamp(point.yRatio, 0, 1),
  inHandle: point.inHandle
    ? { xRatio: clamp(point.inHandle.xRatio, -1, 1), yRatio: clamp(point.inHandle.yRatio, -1, 1) }
    : undefined,
  outHandle: point.outHandle
    ? { xRatio: clamp(point.outHandle.xRatio, -1, 1), yRatio: clamp(point.outHandle.yRatio, -1, 1) }
    : undefined,
});

export const normalizeTextPath = (path: TextPath): TextPath => {
  if (path.type === "arc_up" || path.type === "arc_down") {
    return { ...path, curveAmount: clamp(path.curveAmount, 0, 1) };
  }
  if (path.type === "circle_top" || path.type === "circle_bottom") {
    return { ...path, radiusRatio: clamp(path.radiusRatio, 0.05, 2) };
  }
  if (path.type === "custom") {
    return { ...path, points: path.points.map(normalizeBezierPoint) };
  }
  if (path.type === "closed_ellipse") {
    return {
      ...path,
      bounds: {
        xRatio: clamp(path.bounds.xRatio, 0, 1),
        yRatio: clamp(path.bounds.yRatio, 0, 1),
        widthRatio: clamp(path.bounds.widthRatio, 0.05, 1),
        heightRatio: clamp(path.bounds.heightRatio, 0.05, 1),
      },
      startAngleDeg: Number.isFinite(path.startAngleDeg) ? path.startAngleDeg : 0,
      direction: path.direction === "counterclockwise" ? "counterclockwise" : "clockwise",
      placement: path.placement === "below_path" || path.placement === "in_path" ? path.placement : "over_path",
    };
  }
  return path;
};

export const isPathText = (layer: TextEditorLayer) => layer.text.path.type !== "straight";

export const estimatePresetPathLengthRatio = (path: TextPath) => {
  if (path.type === "arc_up" || path.type === "arc_down") return 1 + clamp(path.curveAmount, 0, 1) * 0.25;
  if (path.type === "circle_top" || path.type === "circle_bottom") return Math.PI * clamp(path.radiusRatio, 0.05, 2);
  return 1;
};

export const getTextPathLengthPx = ({
  path,
  widthPx,
  heightPx,
}: {
  path: TextPath;
  widthPx: number;
  heightPx: number;
}) => {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);
  if (path.type === "closed_ellipse") {
    const normalized = normalizeTextPath(path) as Extract<TextPath, { type: "closed_ellipse" }>;
    const rx = Math.max(1, (normalized.bounds.widthRatio * w) / 2);
    const ry = Math.max(1, (normalized.bounds.heightRatio * h) / 2);
    return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
  }
  return w * estimatePresetPathLengthRatio(path);
};

export const getTextPathRenderAttributes = ({
  path,
  align,
  widthPx,
  heightPx,
  textWidthPx,
  charCount,
  wordCount,
}: {
  path: TextPath;
  align: TextEditorLayer["text"]["align"];
  widthPx: number;
  heightPx: number;
  textWidthPx?: number;
  charCount?: number;
  wordCount?: number;
}): {
  textAnchor: "start" | "middle" | "end";
  startOffset: string;
  textLength?: number;
  lengthAdjust?: "spacing";
  wordSpacingPx?: number;
  dy?: string;
  /** For closed_ellipse paths with non-left alignment: the startAngleDeg the path should use so text lands correctly without crossing the path boundary */
  pathStartAngleDeg?: number;
} => {
  const closedPath = path.type === "closed_ellipse"
    ? normalizeTextPath(path) as Extract<TextPath, { type: "closed_ellipse" }>
    : null;
  let textAnchor: "start" | "middle" | "end";
  let startOffset: string;
  let pathStartAngleDeg: number | undefined;
  const pathLengthPx = getTextPathLengthPx({ path, widthPx, heightPx });
  let textLength: number | undefined;
  let lengthAdjust: "spacing" | undefined;
  let wordSpacingPx: number | undefined;
  if (closedPath) {
    if (align === "center") {
      pathStartAngleDeg = closedPath.startAngleDeg - 180;
      startOffset = "50%";
      textAnchor = "middle";
    } else if (align === "right" && textWidthPx != null) {
      const angleOffset = (textWidthPx / pathLengthPx) * 360;
      pathStartAngleDeg = closedPath.startAngleDeg - angleOffset;
      startOffset = "0";
      textAnchor = "start";
    } else {
      startOffset = "0";
      textAnchor = "start";
    }
    if (align === "justified" && textWidthPx != null && charCount != null && charCount > 1) {
      if (wordCount != null && wordCount > 1) {
        wordSpacingPx = (pathLengthPx - textWidthPx) / wordCount;
      } else {
        textLength = (textWidthPx + (charCount - 1) * pathLengthPx) / charCount;
        lengthAdjust = "spacing";
      }
    }
  } else {
    textAnchor = align === "left" || align === "justified" ? "start" : align === "right" ? "end" : "middle";
    startOffset = align === "left" || align === "justified" ? "0%" : align === "right" ? "100%" : "50%";
    if (align === "justified") {
      textLength = pathLengthPx;
      lengthAdjust = "spacing";
    }
  }
  return {
    textAnchor,
    startOffset,
    pathStartAngleDeg,
    textLength,
    lengthAdjust,
    wordSpacingPx,
    dy: closedPath
      ? closedPath.placement === "over_path"
        ? "-0.6em"
        : closedPath.placement === "below_path"
          ? "0.5em"
          : "0em"
      : undefined,
  };
};

const formatNumber = (value: number) => Number(value.toFixed(3));

const pointOnEllipse = ({
  centerX,
  centerY,
  radiusX,
  radiusY,
  angleDeg,
}: {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  angleDeg: number;
}) => {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + Math.cos(radians) * radiusX,
    y: centerY + Math.sin(radians) * radiusY,
  };
};

export const getTextPathSvgD = ({
  path,
  widthPx,
  heightPx,
}: {
  path: TextPath;
  widthPx: number;
  heightPx: number;
}) => {
  const w = Math.max(1, widthPx);
  const h = Math.max(1, heightPx);
  const centerX = w / 2;
  const centerY = h / 2;

  if (path.type === "arc_up" || path.type === "arc_down") {
    const curve = clamp(path.curveAmount, 0, 1) * w * (path.type === "arc_up" ? -0.35 : 0.35);
    return `M 0 ${formatNumber(centerY)} Q ${formatNumber(centerX)} ${formatNumber(centerY + curve)} ${formatNumber(w)} ${formatNumber(centerY)}`;
  }

  if (path.type === "circle_top" || path.type === "circle_bottom") {
    const radius = Math.max(1, clamp(path.radiusRatio, 0.05, 2) * w);
    const sweep = path.type === "circle_top" ? 1 : 0;
    return `M 0 ${formatNumber(centerY)} A ${formatNumber(radius)} ${formatNumber(radius)} 0 0 ${sweep} ${formatNumber(w)} ${formatNumber(centerY)}`;
  }

  if (path.type === "custom" && path.points.length > 0) {
    const customPath = normalizeTextPath(path) as Extract<TextPath, { type: "custom" }>;
    return customPath.points
      .map((point, index, points) => {
        const x = point.xRatio * w;
        const y = point.yRatio * h;
        if (index === 0) return `M ${formatNumber(x)} ${formatNumber(y)}`;

        const previous = points[index - 1]!;
        const px = previous.xRatio * w;
        const py = previous.yRatio * h;
        const c1x = px + (previous.outHandle?.xRatio ?? 0) * w;
        const c1y = py + (previous.outHandle?.yRatio ?? 0) * h;
        const c2x = x + (point.inHandle?.xRatio ?? 0) * w;
        const c2y = y + (point.inHandle?.yRatio ?? 0) * h;
        return `C ${formatNumber(c1x)} ${formatNumber(c1y)} ${formatNumber(c2x)} ${formatNumber(c2y)} ${formatNumber(x)} ${formatNumber(y)}`;
      })
      .join(" ");
  }

  if (path.type === "closed_ellipse") {
    const closedPath = normalizeTextPath(path) as Extract<TextPath, { type: "closed_ellipse" }>;
    const centerX = closedPath.bounds.xRatio * w;
    const centerY = closedPath.bounds.yRatio * h;
    const radiusX = Math.max(1, (closedPath.bounds.widthRatio * w) / 2);
    const radiusY = Math.max(1, (closedPath.bounds.heightRatio * h) / 2);
    const direction = closedPath.direction;
    const sweep = direction === "clockwise" ? 1 : 0;
    const start = pointOnEllipse({
      centerX,
      centerY,
      radiusX,
      radiusY,
      angleDeg: closedPath.startAngleDeg,
    });
    const middle = pointOnEllipse({
      centerX,
      centerY,
      radiusX,
      radiusY,
      angleDeg: closedPath.startAngleDeg + (closedPath.direction === "clockwise" ? 180 : -180),
    });
    return [
      `M ${formatNumber(start.x)} ${formatNumber(start.y)}`,
      `A ${formatNumber(radiusX)} ${formatNumber(radiusY)} 0 1 ${sweep} ${formatNumber(middle.x)} ${formatNumber(middle.y)}`,
      `A ${formatNumber(radiusX)} ${formatNumber(radiusY)} 0 1 ${sweep} ${formatNumber(start.x)} ${formatNumber(start.y)}`,
    ].join(" ");
  }

  return `M 0 ${formatNumber(centerY)} L ${formatNumber(w)} ${formatNumber(centerY)}`;
};

export const fitTextToLayer = ({
  layer,
  value,
  availableWidthPx,
  availableHeightPx,
  measure,
}: {
  layer: TextEditorLayer;
  value: TextFieldValue;
  availableWidthPx: number;
  availableHeightPx?: number;
  measure?: (text: string, fontSizePt: number, fontId: string) => number;
}) => {
  const maxLines = isPathText(layer) ? 1 : Math.max(1, Math.round(layer.text.maxLines));
  const lines = value.text
    .replace(/\r/g, "")
    .split("\n")
    .slice(0, maxLines)
    .map((line) => (maxLines === 1 ? normalizeSingleLine(line) : line.trim()))
    .filter(Boolean);
  const fontId = resolveFont(layer.text.fontPolicy, value.fontId);
  const color = resolveColor(layer.text.colorPolicy, value.color);
  const text = lines.join("\n");
  const measureText = measure ?? ((line: string, size: number) => line.length * size * 0.55);
  const width = Math.max(
    1,
    isPathText(layer)
      ? getTextPathLengthPx({
          path: layer.text.path,
          widthPx: availableWidthPx,
          heightPx: availableHeightPx ?? availableWidthPx,
        })
      : availableWidthPx,
  );

  const fitsAt = (fontSizePt: number, candidateText: string) =>
    candidateText
      .split("\n")
      .every((line) => measureText(line, fontSizePt, fontId) <= width);

  let low = layer.text.minFontSizePt;
  let high = layer.text.maxFontSizePt;
  let best = fitsAt(low, text) ? low : null;

  for (let iteration = 0; iteration < 24 && low <= high; iteration += 1) {
    const candidate = (low + high) / 2;
    if (fitsAt(candidate, text)) {
      best = candidate;
      low = candidate + 0.05;
    } else {
      high = candidate - 0.05;
    }
  }

  const fontSizePt = Number((best ?? layer.text.minFontSizePt).toFixed(2));
  if (fitsAt(fontSizePt, text)) {
    return { text, fontId, color, fontSizePt, align: layer.text.align, trimmed: false };
  }

  const fittedLines = text.split("\n").map((line) => {
    let fitted = line;
    while (fitted.length > 0 && measureText(fitted, fontSizePt, fontId) > width) {
      fitted = fitted.slice(0, -1);
    }
    return fitted;
  });

  return {
    text: fittedLines.join("\n"),
    fontId,
    color,
    fontSizePt,
    align: layer.text.align,
    trimmed: true,
  };
};

export { getTextValue };
