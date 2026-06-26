export type TemplateStatus = "draft" | "published";
export type DesignStatus = "draft" | "validated" | "frozen";
export type TextAlign = "left" | "center" | "right";
export type ShapeType = "rectangle" | "circle" | "ellipse" | "rounded_rectangle" | "star" | "heart";

export type BackgroundAsset = {
  assetId: string;
  previewUrl: string;
  filename?: string;
  mimeType?: string;
  widthPx: number;
  heightPx: number;
};

export type LayerGeometry = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio?: number;
  rotationDeg: number;
};

export type ChoiceOption = {
  value: string;
  label: string;
  swatch?: string;
};

export type TextColorPolicy =
  | { mode: "fixed"; color: string }
  | { mode: "shopper_selectable"; defaultColor: string; options: ChoiceOption[] };

export type TextFontPolicy =
  | { mode: "fixed"; fontId: string }
  | { mode: "shopper_selectable"; defaultFontId: string; options: ChoiceOption[] };

export type BezierPoint = {
  id: string;
  xRatio: number;
  yRatio: number;
  inHandle?: { xRatio: number; yRatio: number };
  outHandle?: { xRatio: number; yRatio: number };
};

export type TextPath =
  | { type: "straight" }
  | { type: "arc_up"; curveAmount: number }
  | { type: "arc_down"; curveAmount: number }
  | { type: "circle_top"; radiusRatio: number }
  | { type: "circle_bottom"; radiusRatio: number }
  | { type: "custom"; points: BezierPoint[] };

type LayerBase = {
  id: string;
  name: string;
  hidden: boolean;
  locked: boolean;
  zIndex: number;
};

export type TextEditorLayer = LayerBase & {
  type: "text";
  geometry: Omit<LayerGeometry, "heightRatio">;
  text: {
    sampleText: string;
    maxLines: number;
    minFontSizePt: number;
    maxFontSizePt: number;
    align: TextAlign;
    colorPolicy: TextColorPolicy;
    fontPolicy: TextFontPolicy;
    path: TextPath;
  };
};

export type ImageShapeEditorLayer = LayerBase & {
  type: "image_shape";
  geometry: Required<LayerGeometry>;
  shape: {
    type: ShapeType;
    lockAspectRatio: boolean;
  };
  upload: {
    fit: "cover";
    defaultCrop?: ImageCrop;
  };
};

export type CustomizationLayer = TextEditorLayer | ImageShapeEditorLayer;

export type CustomizationFormField = {
  id: string;
  layerId: string;
  label: string;
  helpText?: string;
  placeholder?: string;
  required: boolean;
  order: number;
};

export type CustomizationTemplate = {
  id: string;
  productId: string;
  name: string;
  revision: number;
  status: TemplateStatus;
  background: BackgroundAsset | null;
  layers: CustomizationLayer[];
  formFields: CustomizationFormField[];
};

export type TextFieldValue = {
  text: string;
  color?: string;
  fontId?: string;
};

export type ImageShapeFieldValue = {
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
};

export type CustomizationFieldValue = TextFieldValue | ImageShapeFieldValue | null;
export type CustomizationFormValues = Record<string, CustomizationFieldValue>;

export type RuntimeTextLayer = {
  id: string;
  layerId: string;
  type: "text";
  text: string;
  fontId: string;
  fontSizePt: number;
  color: string;
  align: TextAlign;
  path: TextPath;
  geometry: Omit<LayerGeometry, "heightRatio">;
  zIndex: number;
  trimmed: boolean;
};

export type RuntimeImageShapeLayer = {
  id: string;
  layerId: string;
  type: "image_shape";
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  shape: ImageShapeEditorLayer["shape"];
  geometry: Required<LayerGeometry>;
  cropScale: number;
  cropXRatio: number;
  cropYRatio: number;
  zIndex: number;
};

export type RuntimeLayer = RuntimeTextLayer | RuntimeImageShapeLayer;

export type CustomizationDesign = {
  id: string;
  productId: string;
  templateId: string;
  templateRevision: number;
  revision: number;
  status: DesignStatus;
  values: CustomizationFormValues;
  layers: RuntimeLayer[];
};

export type ImageCrop = {
  scale: number;
  xRatio: number;
  yRatio: number;
};

export type ValidationIssue = {
  code:
    | "BACKGROUND_REQUIRED"
    | "FIELD_LAYER_MISSING"
    | "LAYER_FIELD_MISSING"
    | "FONT_SIZE_RANGE_INVALID"
    | "TEXT_PATH_REQUIRES_SINGLE_LINE"
    | "STYLE_POLICY_INVALID"
    | "REQUIRED_VALUE_MISSING"
    | "OPTION_NOT_ALLOWED"
    | "UPLOAD_INVALID";
  layerId?: string;
  fieldId?: string;
  message: string;
};

const presetSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const DEFAULT_TEXT_COLOR_OPTIONS: ChoiceOption[] = [
  { value: "#111111", label: "Black", swatch: "#111111" },
  { value: "#ffffff", label: "White", swatch: "#ffffff" },
  { value: "#b45309", label: "Gold", swatch: "#b45309" },
  { value: "#0f766e", label: "Teal", swatch: "#0f766e" },
];

export const DEFAULT_FONT_FAMILY_OPTIONS: ChoiceOption[] = [
  { value: "sans-bold", label: "Sans Bold" },
  { value: "serif-display", label: "Serif Display" },
  { value: "script-elegant", label: "Script Elegant" },
];

export const DEFAULT_TEMPLATE: CustomizationTemplate = {
  id: "template_demo_cup",
  productId: "prod_trophy_cup",
  name: "Classic Trophy Cup",
  revision: 1,
  status: "published",
  background: {
    assetId: "background_demo_cup",
    filename: "classic-trophy-cup.svg",
    mimeType: "image/svg+xml",
    widthPx: 900,
    heightPx: 900,
    previewUrl: presetSvg(
      `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#f8d878"/><stop offset=".5" stop-color="#fff5bf"/><stop offset="1" stop-color="#b8862b"/></linearGradient></defs><rect width="900" height="900" fill="#f5f5f4"/><path d="M300 150h300v130c0 150-65 250-150 270-85-20-150-120-150-270z" fill="url(#g)" stroke="#966f24" stroke-width="12"/><path d="M300 190H190c0 130 35 205 145 220M600 190h110c0 130-35 205-145 220" fill="none" stroke="#b8862b" stroke-width="38"/><path d="M430 550h40v120h120v55H310v-55h120z" fill="url(#g)" stroke="#966f24" stroke-width="10"/><rect x="270" y="725" width="360" height="90" rx="14" fill="#292524"/></svg>`,
    ),
  },
  layers: [
    {
      id: "badge_shape",
      name: "Badge artwork",
      type: "image_shape",
      hidden: false,
      locked: false,
      zIndex: 1,
      geometry: { xRatio: 0.5, yRatio: 0.31, widthRatio: 0.2, heightRatio: 0.2, rotationDeg: 0 },
      shape: { type: "circle", lockAspectRatio: true },
      upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
    },
    {
      id: "line_1",
      name: "Main engraving",
      type: "text",
      hidden: false,
      locked: false,
      zIndex: 2,
      geometry: { xRatio: 0.5, yRatio: 0.43, widthRatio: 0.46, rotationDeg: 0 },
      text: {
        sampleText: "LEAGUE CHAMPION",
        maxLines: 1,
        minFontSizePt: 8,
        maxFontSizePt: 18,
        align: "center",
        colorPolicy: { mode: "fixed", color: "#111111" },
        fontPolicy: { mode: "fixed", fontId: "sans-bold" },
        path: { type: "straight" },
      },
    },
    {
      id: "curved_name",
      name: "Curved name",
      type: "text",
      hidden: false,
      locked: false,
      zIndex: 3,
      geometry: { xRatio: 0.5, yRatio: 0.52, widthRatio: 0.42, rotationDeg: 0 },
      text: {
        sampleText: "ALEX MORGAN",
        maxLines: 1,
        minFontSizePt: 7,
        maxFontSizePt: 16,
        align: "center",
        colorPolicy: {
          mode: "shopper_selectable",
          defaultColor: "#111111",
          options: DEFAULT_TEXT_COLOR_OPTIONS,
        },
        fontPolicy: {
          mode: "shopper_selectable",
          defaultFontId: "sans-bold",
          options: DEFAULT_FONT_FAMILY_OPTIONS,
        },
        path: { type: "arc_up", curveAmount: 0.35 },
      },
    },
  ],
  formFields: [
    {
      id: "field_badge_shape",
      layerId: "badge_shape",
      label: "Upload your logo",
      helpText: "Your image will be clipped to the badge shape.",
      required: false,
      order: 2,
    },
    {
      id: "field_line_1",
      layerId: "line_1",
      label: "Line 1",
      placeholder: "LEAGUE CHAMPION",
      required: true,
      order: 1,
    },
    {
      id: "field_curved_name",
      layerId: "curved_name",
      label: "Name",
      placeholder: "ALEX MORGAN",
      required: true,
      order: 3,
    },
  ],
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

export const normalizeCropScale = (value?: number) => clamp(value ?? 1, 1, 4);
export const normalizeCropPan = (value?: number) => clamp(value ?? 0, -1, 1);

export const isLayerVisible = (layer: CustomizationLayer) => !layer.hidden;

export const getVisibleLayers = (template: CustomizationTemplate) =>
  template.layers.filter(isLayerVisible).sort((a, b) => a.zIndex - b.zIndex);

export const getOrderedFormFields = (template: CustomizationTemplate) => {
  const visibleLayerIds = new Set(getVisibleLayers(template).map((layer) => layer.id));
  return template.formFields
    .filter((field) => visibleLayerIds.has(field.layerId))
    .sort((a, b) => a.order - b.order);
};

export const getLayerById = (template: CustomizationTemplate, layerId: string) =>
  template.layers.find((layer) => layer.id === layerId);

export const getFormFieldForLayer = (template: CustomizationTemplate, layerId: string) =>
  template.formFields.find((field) => field.layerId === layerId);

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

export const validateTemplateForPublish = (template: CustomizationTemplate) => {
  const issues: ValidationIssue[] = [];
  if (!template.background) {
    issues.push({ code: "BACKGROUND_REQUIRED", message: "A background image is required before publishing." });
  }

  const layerIds = new Set(template.layers.map((layer) => layer.id));
  const fieldLayerIds = new Set(template.formFields.map((field) => field.layerId));

  for (const field of template.formFields) {
    if (!layerIds.has(field.layerId)) {
      issues.push({
        code: "FIELD_LAYER_MISSING",
        fieldId: field.id,
        layerId: field.layerId,
        message: `${field.label} references a missing layer.`,
      });
    }
  }

  for (const layer of template.layers) {
    if (!layer.hidden && !fieldLayerIds.has(layer.id)) {
      issues.push({
        code: "LAYER_FIELD_MISSING",
        layerId: layer.id,
        message: `${layer.name} needs a linked form field.`,
      });
    }
    if (layer.type !== "text") continue;
    if (layer.text.minFontSizePt > layer.text.maxFontSizePt) {
      issues.push({
        code: "FONT_SIZE_RANGE_INVALID",
        layerId: layer.id,
        message: `${layer.name} minimum font size must be less than maximum font size.`,
      });
    }
    if (isPathText(layer) && layer.text.maxLines !== 1) {
      issues.push({
        code: "TEXT_PATH_REQUIRES_SINGLE_LINE",
        layerId: layer.id,
        message: `${layer.name} uses a text path and must be one line.`,
      });
    }
    const colorPolicy = layer.text.colorPolicy;
    if (
      colorPolicy.mode === "shopper_selectable" &&
      (colorPolicy.options.length === 0 ||
        !colorPolicy.options.some((option) => option.value === colorPolicy.defaultColor))
    ) {
      issues.push({ code: "STYLE_POLICY_INVALID", layerId: layer.id, message: `${layer.name} has invalid color options.` });
    }
    const fontPolicy = layer.text.fontPolicy;
    if (
      fontPolicy.mode === "shopper_selectable" &&
      (fontPolicy.options.length === 0 ||
        !fontPolicy.options.some((option) => option.value === fontPolicy.defaultFontId))
    ) {
      issues.push({ code: "STYLE_POLICY_INVALID", layerId: layer.id, message: `${layer.name} has invalid font options.` });
    }
  }

  return { valid: issues.length === 0, issues };
};

export const validateCustomizationValues = ({
  template,
  values,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
}) => {
  const issues: ValidationIssue[] = [];
  for (const field of getOrderedFormFields(template)) {
    const layer = getLayerById(template, field.layerId);
    if (!layer) continue;
    const value = values[field.id];
    if (layer.type === "text") {
      const textValue = getTextValue(layer, value);
      if (field.required && !textValue.text.trim()) {
        issues.push({ code: "REQUIRED_VALUE_MISSING", fieldId: field.id, layerId: layer.id, message: `${field.label} is required.` });
      }
      if (layer.text.colorPolicy.mode === "shopper_selectable" && !layer.text.colorPolicy.options.some((option) => option.value === textValue.color)) {
        issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains an unavailable color.` });
      }
      if (layer.text.fontPolicy.mode === "shopper_selectable" && !layer.text.fontPolicy.options.some((option) => option.value === textValue.fontId)) {
        issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains an unavailable font.` });
      }
    } else if (field.required && (!value || !("assetId" in value) || !value.assetId)) {
      issues.push({ code: "REQUIRED_VALUE_MISSING", fieldId: field.id, layerId: layer.id, message: `${field.label} is required.` });
    } else if (value && (!("assetId" in value) || !value.assetId)) {
      issues.push({ code: "UPLOAD_INVALID", fieldId: field.id, layerId: layer.id, message: `${field.label} upload is invalid.` });
    }
  }
  return { valid: issues.length === 0, issues };
};

export const buildDesignFromForm = ({
  template,
  values,
  designId = `design_${crypto.randomUUID()}`,
  measureText,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  designId?: string;
  measureText?: (text: string, fontSizePt: number, fontId: string) => number;
}): CustomizationDesign => {
  const layers: RuntimeLayer[] = [];
  const fieldsByLayerId = new Map(template.formFields.map((field) => [field.layerId, field]));
  const background = template.background ?? { widthPx: 1, heightPx: 1 };

  for (const layer of getVisibleLayers(template)) {
    const field = fieldsByLayerId.get(layer.id);
    if (!field) continue;
    const value = values[field.id];
    if (layer.type === "text") {
      const fitted = fitTextToLayer({
        layer,
        value: getTextValue(layer, value),
        availableWidthPx: layer.geometry.widthRatio * background.widthPx,
        measure: measureText,
      });
      if (!fitted.text) continue;
      layers.push({
        id: layer.id,
        layerId: layer.id,
        type: "text",
        geometry: layer.geometry,
        zIndex: layer.zIndex,
        path: normalizeTextPath(layer.text.path),
        ...fitted,
      });
      continue;
    }

    if (!value || !("assetId" in value) || !value.assetId) continue;
    layers.push({
      id: layer.id,
      layerId: layer.id,
      type: "image_shape",
      zIndex: layer.zIndex,
      geometry: layer.geometry,
      shape: layer.shape,
      assetId: value.assetId,
      previewUrl: value.previewUrl,
      sourceWidthPx: value.sourceWidthPx,
      sourceHeightPx: value.sourceHeightPx,
      cropScale: normalizeCropScale(value.cropScale),
      cropXRatio: normalizeCropPan(value.cropXRatio),
      cropYRatio: normalizeCropPan(value.cropYRatio),
    });
  }

  return {
    id: designId,
    productId: template.productId,
    templateId: template.id,
    templateRevision: template.revision,
    revision: 1,
    status: "draft",
    values,
    layers,
  };
};
