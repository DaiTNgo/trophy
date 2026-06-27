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
  return path;
};

export const isPathText = (layer: TextEditorLayer) => layer.text.path.type !== "straight";

export const estimatePresetPathLengthRatio = (path: TextPath) => {
  if (path.type === "arc_up" || path.type === "arc_down") return 1 + clamp(path.curveAmount, 0, 1) * 0.25;
  if (path.type === "circle_top" || path.type === "circle_bottom") return Math.PI * clamp(path.radiusRatio, 0.05, 2);
  return 1;
};

export const fitTextToLayer = ({
  layer,
  value,
  availableWidthPx,
  measure,
}: {
  layer: TextEditorLayer;
  value: TextFieldValue;
  availableWidthPx: number;
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
  const pathMultiplier = estimatePresetPathLengthRatio(layer.text.path);
  const width = Math.max(1, availableWidthPx * pathMultiplier);

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
