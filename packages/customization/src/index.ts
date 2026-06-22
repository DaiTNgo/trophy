export type CustomizationContentType = "text" | "image";
export type ProductionMethod = "print" | "engrave";
export type ColorMode = "rgb" | "cmyk" | "grayscale" | "monochrome";

export type PreviewBounds = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  rotationDeg: number;
};

export type BlockBounds = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  rotationDeg: number;
  zIndex: number;
};

export type BlockCondition = {
  blockId: string;
  equals: string | boolean;
};

type BlockBase = {
  id: string;
  label: string;
  helpText?: string;
  required: boolean;
  order: number;
  visibleWhen?: BlockCondition;
};

export type TextBlock = BlockBase & {
  type: "text" | "textarea";
  placeholder?: string;
  defaultValue: string;
  maxChars: number;
  maxLines: number;
  bounds: BlockBounds;
  fontId: string;
  minFontSizePt: number;
  maxFontSizePt: number;
  color: string;
  alignment: "left" | "center" | "right";
};

export type MediaOption = {
  id: string;
  label: string;
  previewUrl: string;
  productionAssetId: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
};

export type MediaSelectBlock = BlockBase & {
  type: "media-select";
  role: "logo" | "background" | "border" | "artwork";
  defaultOptionId: string;
  allowNone: boolean;
  bounds: BlockBounds;
  fit: "contain" | "cover";
  options: MediaOption[];
};

export type MediaUploadBlock = BlockBase & {
  type: "media-upload";
  accept: Array<"image/png" | "image/jpeg">;
  maxBytes: number;
  minDpi: number;
  bounds: BlockBounds;
  fit: "contain" | "cover";
};

export type ChoiceOption = {
  value: string;
  label: string;
  swatch?: string;
};

export type ChoiceBlock = BlockBase & {
  type: "select" | "radio" | "color";
  defaultValue: string;
  options: ChoiceOption[];
};

export type CheckboxBlock = BlockBase & {
  type: "checkbox";
  defaultValue: boolean;
};

export type CustomizationBlock =
  | TextBlock
  | MediaSelectBlock
  | MediaUploadBlock
  | ChoiceBlock
  | CheckboxBlock;

export type UploadedMediaValue = {
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
};

export type CustomizationFieldValue = string | boolean | UploadedMediaValue | null;
export type CustomizationFormValues = Record<string, CustomizationFieldValue>;

export type TextRules = {
  fontIds: string[];
  minFontSizePt: number;
  maxFontSizePt: number;
  alignment: "left" | "center" | "right";
  singleLine: true;
};

export type CustomizationZone = {
  id: string;
  name: string;
  previewBounds: PreviewBounds;
  widthMm: number;
  heightMm: number;
  bleedMm: number;
  safeMarginMm: number;
  allowedContent: CustomizationContentType[];
  textRules: TextRules;
  production: {
    method: ProductionMethod;
    colorMode: ColorMode;
    minImageDpi: number;
  };
  blocks: CustomizationBlock[];
};

export type CustomizationTemplate = {
  id: string;
  productId: string;
  name: string;
  revision: number;
  status: "draft" | "published";
  previewUrl: string;
  zones: CustomizationZone[];
};

type LayerBase = {
  id: string;
  zoneId: string;
  xRatio: number;
  yRatio: number;
  rotationDeg: number;
};

export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  fontId: string;
  fontSizePt: number;
  color: string;
  alignment: TextRules["alignment"];
};

export type ImageLayer = LayerBase & {
  type: "image";
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  widthRatio: number;
  heightRatio: number;
  cropXRatio: number;
  cropYRatio: number;
};

export type CustomizationLayer = TextLayer | ImageLayer;

export type CustomizationDesign = {
  id: string;
  productId: string;
  templateId: string;
  templateRevision: number;
  revision: number;
  status: "draft" | "validated" | "frozen";
  values?: CustomizationFormValues;
  layers: CustomizationLayer[];
};

export type ValidationIssue = {
  code:
    | "ZONE_NOT_FOUND"
    | "CONTENT_NOT_ALLOWED"
    | "TEXT_EMPTY"
    | "TEXT_DOES_NOT_FIT"
    | "IMAGE_DPI_LOW"
    | "IMAGE_ASSET_MISSING";
  zoneId: string;
  layerId: string;
  message: string;
};

const presetSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const transparentOption: MediaOption = {
  id: "none",
  label: "No logo",
  previewUrl: presetSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"/>`),
  productionAssetId: "preset_none_v1",
  sourceWidthPx: 400,
  sourceHeightPx: 200,
};

const frontBlocks: CustomizationBlock[] = [
  {
    id: "design_style",
    type: "radio",
    label: "Design style",
    required: true,
    order: 1,
    defaultValue: "preset",
    options: [
      { value: "preset", label: "Choose a preset" },
      { value: "upload", label: "Upload your own logo" },
    ],
  },
  {
    id: "background",
    type: "media-select",
    role: "background",
    label: "Background",
    required: true,
    order: 2,
    defaultOptionId: "classic",
    allowNone: false,
    fit: "cover",
    bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1, rotationDeg: 0, zIndex: 1 },
    options: [
      {
        id: "classic",
        label: "Classic gold",
        previewUrl: presetSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320"><rect width="800" height="320" rx="22" fill="#f3d27a"/><path d="M0 40h800M0 280h800" stroke="#9b7128" stroke-width="18"/></svg>`,
        ),
        productionAssetId: "background_classic_v1",
        sourceWidthPx: 800,
        sourceHeightPx: 320,
      },
      {
        id: "midnight",
        label: "Midnight",
        previewUrl: presetSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320"><rect width="800" height="320" rx="22" fill="#17211d"/><path d="M30 30h740v260H30z" fill="none" stroke="#d9b85f" stroke-width="12"/></svg>`,
        ),
        productionAssetId: "background_midnight_v1",
        sourceWidthPx: 800,
        sourceHeightPx: 320,
      },
      {
        id: "stadium",
        label: "Stadium lights",
        previewUrl: presetSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="320"><rect width="800" height="320" fill="#12395b"/><path d="M0 250Q400 80 800 250" fill="none" stroke="#ecf6ff" stroke-width="18"/><circle cx="100" cy="65" r="22" fill="#fff"/><circle cx="700" cy="65" r="22" fill="#fff"/></svg>`,
        ),
        productionAssetId: "background_stadium_v1",
        sourceWidthPx: 800,
        sourceHeightPx: 320,
      },
    ],
  },
  {
    id: "preset_logo",
    type: "media-select",
    role: "logo",
    label: "Logo",
    required: false,
    order: 3,
    visibleWhen: { blockId: "design_style", equals: "preset" },
    defaultOptionId: "champion-star",
    allowNone: true,
    fit: "contain",
    bounds: {
      xRatio: 0.5,
      yRatio: 0.32,
      widthRatio: 0.2,
      heightRatio: 0.35,
      rotationDeg: 0,
      zIndex: 2,
    },
    options: [
      transparentOption,
      {
        id: "champion-star",
        label: "Champion star",
        previewUrl: presetSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="m100 8 23 62 66 3-52 41 18 65-55-36-55 36 18-65L11 73l66-3z" fill="#111827"/></svg>`,
        ),
        productionAssetId: "logo_champion_star_v1",
        sourceWidthPx: 600,
        sourceHeightPx: 600,
      },
      {
        id: "victory-cup",
        label: "Victory cup",
        previewUrl: presetSvg(
          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M52 20h96v50c0 42-18 70-48 78-30-8-48-36-48-78zM52 38H20c0 38 14 58 43 64M148 38h32c0 38-14 58-43 64M90 148h20v22h34v18H56v-18h34z" fill="none" stroke="#111827" stroke-width="12"/></svg>`,
        ),
        productionAssetId: "logo_victory_cup_v1",
        sourceWidthPx: 600,
        sourceHeightPx: 600,
      },
    ],
  },
  {
    id: "uploaded_logo",
    type: "media-upload",
    label: "Upload your logo",
    helpText: "PNG or JPEG, up to 20 MB.",
    required: true,
    order: 3,
    visibleWhen: { blockId: "design_style", equals: "upload" },
    accept: ["image/png", "image/jpeg"],
    maxBytes: 20 * 1024 * 1024,
    minDpi: 300,
    fit: "contain",
    bounds: {
      xRatio: 0.5,
      yRatio: 0.32,
      widthRatio: 0.2,
      heightRatio: 0.35,
      rotationDeg: 0,
      zIndex: 2,
    },
  },
  {
    id: "line_1",
    type: "text",
    label: "Line 1",
    placeholder: "LEAGUE CHAMPION",
    required: true,
    order: 4,
    defaultValue: "LEAGUE CHAMPION",
    maxChars: 24,
    maxLines: 1,
    bounds: {
      xRatio: 0.5,
      yRatio: 0.62,
      widthRatio: 0.82,
      heightRatio: 0.18,
      rotationDeg: 0,
      zIndex: 3,
    },
    fontId: "sans-bold",
    minFontSizePt: 8,
    maxFontSizePt: 18,
    color: "#111111",
    alignment: "center",
  },
  {
    id: "line_2",
    type: "textarea",
    label: "Award details",
    placeholder: "Winner name\n2026",
    required: false,
    order: 5,
    defaultValue: "ALEX MORGAN\n2026",
    maxChars: 36,
    maxLines: 2,
    bounds: {
      xRatio: 0.5,
      yRatio: 0.82,
      widthRatio: 0.82,
      heightRatio: 0.28,
      rotationDeg: 0,
      zIndex: 3,
    },
    fontId: "sans-bold",
    minFontSizePt: 7,
    maxFontSizePt: 13,
    color: "#111111",
    alignment: "center",
  },
  {
    id: "artwork_rights",
    type: "checkbox",
    label: "I have the rights to use the uploaded artwork.",
    required: true,
    order: 6,
    defaultValue: false,
    visibleWhen: { blockId: "design_style", equals: "upload" },
  },
  {
    id: "design_confirmation",
    type: "checkbox",
    label: "I reviewed the preview and confirm the design is correct.",
    required: true,
    order: 7,
    defaultValue: false,
  },
];

export const DEFAULT_TEMPLATE: CustomizationTemplate = {
  id: "template_demo_cup",
  productId: "prod_trophy_cup",
  name: "Classic Trophy Cup",
  revision: 1,
  status: "published",
  previewUrl:
    "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='900' viewBox='0 0 900 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop stop-color='%23f8d878'/%3E%3Cstop offset='.5' stop-color='%23fff5bf'/%3E%3Cstop offset='1' stop-color='%23b8862b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='900' fill='%23f5f5f4'/%3E%3Cpath d='M300 150h300v130c0 150-65 250-150 270-85-20-150-120-150-270z' fill='url(%23g)' stroke='%23966f24' stroke-width='12'/%3E%3Cpath d='M300 190H190c0 130 35 205 145 220M600 190h110c0 130-35 205-145 220' fill='none' stroke='%23b8862b' stroke-width='38'/%3E%3Cpath d='M430 550h40v120h120v55H310v-55h120z' fill='url(%23g)' stroke='%23966f24' stroke-width='10'/%3E%3Crect x='270' y='725' width='360' height='90' rx='14' fill='%23292524'/%3E%3C/svg%3E",
  zones: [
    {
      id: "zone_front",
      name: "Front plate",
      previewBounds: {
        xRatio: 0.35,
        yRatio: 0.37,
        widthRatio: 0.3,
        heightRatio: 0.13,
        rotationDeg: 0,
      },
      widthMm: 70,
      heightMm: 28,
      bleedMm: 2,
      safeMarginMm: 3,
      allowedContent: ["text", "image"],
      textRules: {
        fontIds: ["sans-bold"],
        minFontSizePt: 8,
        maxFontSizePt: 28,
        alignment: "center",
        singleLine: true,
      },
      production: {
        method: "engrave",
        colorMode: "monochrome",
        minImageDpi: 300,
      },
      blocks: frontBlocks,
    },
    {
      id: "zone_base",
      name: "Base plate",
      previewBounds: {
        xRatio: 0.33,
        yRatio: 0.83,
        widthRatio: 0.34,
        heightRatio: 0.07,
        rotationDeg: 0,
      },
      widthMm: 80,
      heightMm: 18,
      bleedMm: 1,
      safeMarginMm: 2,
      allowedContent: ["text"],
      textRules: {
        fontIds: ["sans-bold"],
        minFontSizePt: 7,
        maxFontSizePt: 20,
        alignment: "center",
        singleLine: true,
      },
      production: {
        method: "engrave",
        colorMode: "monochrome",
        minImageDpi: 300,
      },
      blocks: [
        {
          id: "base_text",
          type: "text",
          label: "Base engraving",
          placeholder: "CHAMPION 2026",
          required: true,
          order: 1,
          defaultValue: "CHAMPION 2026",
          maxChars: 28,
          maxLines: 1,
          bounds: {
            xRatio: 0.5,
            yRatio: 0.5,
            widthRatio: 0.88,
            heightRatio: 0.7,
            rotationDeg: 0,
            zIndex: 1,
          },
          fontId: "sans-bold",
          minFontSizePt: 7,
          maxFontSizePt: 20,
          color: "#ffffff",
          alignment: "center",
        },
      ],
    },
  ],
};

export const normalizeSingleLine = (value: string) =>
  value
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const fitSingleLineText = ({
  text,
  minFontSizePt,
  maxFontSizePt,
  availableWidth,
  measure,
}: {
  text: string;
  minFontSizePt: number;
  maxFontSizePt: number;
  availableWidth: number;
  measure: (value: string, fontSizePt: number) => number;
}) => {
  const normalizedText = normalizeSingleLine(text);
  if (!normalizedText) {
    return { text: "", fontSizePt: maxFontSizePt, fits: false };
  }

  let low = minFontSizePt;
  let high = maxFontSizePt;
  let best: number | null = null;

  for (let iteration = 0; iteration < 24 && low <= high; iteration += 1) {
    const candidate = (low + high) / 2;
    if (measure(normalizedText, candidate) <= availableWidth) {
      best = candidate;
      low = candidate + 0.05;
    } else {
      high = candidate - 0.05;
    }
  }

  return {
    text: normalizedText,
    fontSizePt: Number((best ?? minFontSizePt).toFixed(2)),
    fits: best !== null || measure(normalizedText, minFontSizePt) <= availableWidth,
  };
};

export const calculateEffectiveDpi = ({
  sourcePixels,
  cropRatio,
  printedMillimetres,
}: {
  sourcePixels: number;
  cropRatio: number;
  printedMillimetres: number;
}) => {
  if (sourcePixels <= 0 || cropRatio <= 0 || printedMillimetres <= 0) {
    return 0;
  }

  return Math.floor((sourcePixels * Math.min(cropRatio, 1)) / (printedMillimetres / 25.4));
};

export type FormValidationIssue = {
  code:
    | "REQUIRED_VALUE_MISSING"
    | "TEXT_TOO_LONG"
    | "TOO_MANY_LINES"
    | "OPTION_NOT_ALLOWED"
    | "UPLOAD_INVALID"
    | "CONFIRMATION_REQUIRED";
  zoneId: string;
  blockId: string;
  message: string;
};

export const createDefaultFormValues = (template: CustomizationTemplate) => {
  const values: CustomizationFormValues = {};
  for (const zone of template.zones) {
    for (const block of zone.blocks) {
      if (block.type === "text" || block.type === "textarea") {
        values[block.id] = block.defaultValue;
      } else if (block.type === "media-select") {
        values[block.id] = block.defaultOptionId;
      } else if (block.type === "media-upload") {
        values[block.id] = null;
      } else {
        values[block.id] = block.defaultValue;
      }
    }
  }
  return values;
};

export const isBlockVisible = (block: CustomizationBlock, values: CustomizationFormValues) =>
  !block.visibleWhen || values[block.visibleWhen.blockId] === block.visibleWhen.equals;

export const limitTextBlockValue = (block: TextBlock, input: string) => {
  if (block.type === "text") {
    return input.replace(/[\r\n]+/g, " ").slice(0, block.maxChars);
  }

  return input
    .replace(/\r/g, "")
    .split("\n")
    .slice(0, block.maxLines)
    .join("\n")
    .slice(0, block.maxChars);
};

export const validateCustomizationValues = ({
  template,
  values,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
}) => {
  const issues: FormValidationIssue[] = [];

  for (const zone of template.zones) {
    for (const block of zone.blocks) {
      if (!isBlockVisible(block, values)) {
        continue;
      }

      const value = values[block.id];
      if (block.type === "checkbox") {
        if (block.required && value !== true) {
          issues.push({
            code: "CONFIRMATION_REQUIRED",
            zoneId: zone.id,
            blockId: block.id,
            message: `${block.label} must be confirmed.`,
          });
        }
        continue;
      }

      if (block.required && (value === null || value === undefined || value === "")) {
        issues.push({
          code: "REQUIRED_VALUE_MISSING",
          zoneId: zone.id,
          blockId: block.id,
          message: `${block.label} is required.`,
        });
        continue;
      }

      if (block.type === "text" || block.type === "textarea") {
        const text = typeof value === "string" ? value : "";
        if (text.length > block.maxChars) {
          issues.push({
            code: "TEXT_TOO_LONG",
            zoneId: zone.id,
            blockId: block.id,
            message: `${block.label} allows at most ${block.maxChars} characters.`,
          });
        }
        if (text.split(/\r?\n/).length > block.maxLines) {
          issues.push({
            code: "TOO_MANY_LINES",
            zoneId: zone.id,
            blockId: block.id,
            message: `${block.label} allows at most ${block.maxLines} lines.`,
          });
        }
      } else if (block.type === "media-select") {
        const optionId = typeof value === "string" ? value : "";
        if (optionId && !block.options.some((option) => option.id === optionId)) {
          issues.push({
            code: "OPTION_NOT_ALLOWED",
            zoneId: zone.id,
            blockId: block.id,
            message: `${block.label} contains an unavailable option.`,
          });
        }
      } else if (block.type === "media-upload" && value !== null) {
        if (typeof value !== "object" || !("assetId" in value) || !value.assetId) {
          issues.push({
            code: "UPLOAD_INVALID",
            zoneId: zone.id,
            blockId: block.id,
            message: `${block.label} upload is invalid.`,
          });
        }
      } else if (
        (block.type === "select" || block.type === "radio" || block.type === "color") &&
        typeof value === "string" &&
        !block.options.some((option) => option.value === value)
      ) {
        issues.push({
          code: "OPTION_NOT_ALLOWED",
          zoneId: zone.id,
          blockId: block.id,
          message: `${block.label} contains an unavailable option.`,
        });
      }
    }
  }

  return { valid: issues.length === 0, issues };
};

export const buildDesignFromForm = ({
  template,
  values,
  designId = `design_${crypto.randomUUID()}`,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  designId?: string;
}): CustomizationDesign => {
  const layers: CustomizationLayer[] = [];

  for (const zone of template.zones) {
    const blocks = [...zone.blocks].sort((a, b) => a.order - b.order);
    for (const block of blocks) {
      if (!isBlockVisible(block, values)) {
        continue;
      }

      const value = values[block.id];
      if ((block.type === "text" || block.type === "textarea") && typeof value === "string") {
        const lines = block.type === "text" ? [normalizeSingleLine(value)] : value.split(/\r?\n/);
        const lineCount = Math.max(lines.length, 1);
        lines.forEach((line, index) => {
          if (!line) return;
          const availableWidthMm = block.bounds.widthRatio * zone.widthMm;
          const fitted = fitSingleLineText({
            text: line,
            minFontSizePt: block.minFontSizePt,
            maxFontSizePt: block.maxFontSizePt,
            availableWidth: availableWidthMm,
            measure: (text, size) => text.length * size * 0.3528 * 0.55,
          });
          layers.push({
            id: `${block.id}:${index}`,
            zoneId: zone.id,
            type: "text",
            xRatio: block.bounds.xRatio,
            yRatio:
              block.bounds.yRatio + ((index + 0.5) / lineCount - 0.5) * block.bounds.heightRatio,
            rotationDeg: block.bounds.rotationDeg,
            text: fitted.text,
            fontId: block.fontId,
            fontSizePt: fitted.fontSizePt,
            color: block.color,
            alignment: block.alignment,
          });
        });
        continue;
      }

      if (block.type === "media-select" && typeof value === "string" && value !== "none") {
        const option = block.options.find((entry) => entry.id === value);
        if (option) {
          layers.push({
            id: block.id,
            zoneId: zone.id,
            type: "image",
            xRatio: block.bounds.xRatio,
            yRatio: block.bounds.yRatio,
            rotationDeg: block.bounds.rotationDeg,
            assetId: option.productionAssetId,
            previewUrl: option.previewUrl,
            sourceWidthPx: option.sourceWidthPx,
            sourceHeightPx: option.sourceHeightPx,
            widthRatio: block.bounds.widthRatio,
            heightRatio: block.bounds.heightRatio,
            cropXRatio: 0,
            cropYRatio: 0,
          });
        }
        continue;
      }

      if (block.type === "media-upload" && value && typeof value === "object") {
        layers.push({
          id: block.id,
          zoneId: zone.id,
          type: "image",
          xRatio: block.bounds.xRatio,
          yRatio: block.bounds.yRatio,
          rotationDeg: block.bounds.rotationDeg,
          assetId: value.assetId,
          previewUrl: value.previewUrl,
          sourceWidthPx: value.sourceWidthPx,
          sourceHeightPx: value.sourceHeightPx,
          widthRatio: block.bounds.widthRatio,
          heightRatio: block.bounds.heightRatio,
          cropXRatio: 0,
          cropYRatio: 0,
        });
      }
    }
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

export const validateDesign = ({
  template,
  design,
  measureText,
}: {
  template: CustomizationTemplate;
  design: CustomizationDesign;
  measureText?: (text: string, fontSizePt: number, fontId: string) => number;
}) => {
  const issues: ValidationIssue[] = [];

  for (const layer of design.layers) {
    const zone = template.zones.find((entry) => entry.id === layer.zoneId);
    if (!zone) {
      issues.push({
        code: "ZONE_NOT_FOUND",
        zoneId: layer.zoneId,
        layerId: layer.id,
        message: "The customization zone no longer exists.",
      });
      continue;
    }

    if (!zone.allowedContent.includes(layer.type)) {
      issues.push({
        code: "CONTENT_NOT_ALLOWED",
        zoneId: zone.id,
        layerId: layer.id,
        message: `${layer.type} content is not allowed in this zone.`,
      });
      continue;
    }

    if (layer.type === "text") {
      const text = normalizeSingleLine(layer.text);
      if (!text) {
        issues.push({
          code: "TEXT_EMPTY",
          zoneId: zone.id,
          layerId: layer.id,
          message: "Text cannot be empty.",
        });
        continue;
      }

      if (measureText) {
        const availableWidthMm = zone.widthMm - zone.safeMarginMm * 2;
        const widthMm = measureText(text, layer.fontSizePt, layer.fontId);
        if (widthMm > availableWidthMm) {
          issues.push({
            code: "TEXT_DOES_NOT_FIT",
            zoneId: zone.id,
            layerId: layer.id,
            message: "Text does not fit inside the zone safe width.",
          });
        }
      }
      continue;
    }

    if (!layer.assetId || !layer.previewUrl) {
      issues.push({
        code: "IMAGE_ASSET_MISSING",
        zoneId: zone.id,
        layerId: layer.id,
        message: "The original image asset is unavailable.",
      });
      continue;
    }

    const dpi = calculateEffectiveDpi({
      sourcePixels: layer.sourceWidthPx,
      cropRatio: 1,
      printedMillimetres: layer.widthRatio * (zone.widthMm - zone.safeMarginMm * 2),
    });
    if (dpi < zone.production.minImageDpi) {
      issues.push({
        code: "IMAGE_DPI_LOW",
        zoneId: zone.id,
        layerId: layer.id,
        message: `Image quality is ${dpi} DPI; ${zone.production.minImageDpi} DPI is required.`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const renderZoneSvg = ({
  template,
  design,
  zoneId,
}: {
  template: CustomizationTemplate;
  design: CustomizationDesign;
  zoneId: string;
}) => {
  const zone = template.zones.find((entry) => entry.id === zoneId);
  if (!zone) {
    throw new Error(`Unknown customization zone: ${zoneId}`);
  }

  const safeX = zone.safeMarginMm;
  const safeY = zone.safeMarginMm;
  const safeWidth = zone.widthMm - zone.safeMarginMm * 2;
  const safeHeight = zone.heightMm - zone.safeMarginMm * 2;
  const layers = design.layers.filter((layer) => layer.zoneId === zone.id);
  const body = layers
    .map((layer) => {
      const x = safeX + layer.xRatio * safeWidth;
      const y = safeY + layer.yRatio * safeHeight;

      if (layer.type === "text") {
        const anchor =
          layer.alignment === "left" ? "start" : layer.alignment === "right" ? "end" : "middle";
        return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${layer.fontSizePt}pt" text-anchor="${anchor}" dominant-baseline="middle" fill="${escapeXml(layer.color)}" transform="rotate(${layer.rotationDeg} ${x} ${y})">${escapeXml(layer.text)}</text>`;
      }

      const width = layer.widthRatio * safeWidth;
      const height = layer.heightRatio * safeHeight;
      return `<image href="${escapeXml(layer.previewUrl)}" x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" transform="rotate(${layer.rotationDeg} ${x} ${y})" />`;
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${zone.widthMm}mm" height="${zone.heightMm}mm" viewBox="0 0 ${zone.widthMm} ${zone.heightMm}">`,
    `<metadata>${escapeXml(JSON.stringify({ productId: design.productId, templateRevision: design.templateRevision, designRevision: design.revision, zoneId }))}</metadata>`,
    `<defs><clipPath id="zone-clip"><rect width="${zone.widthMm}" height="${zone.heightMm}" /></clipPath></defs>`,
    `<g clip-path="url(#zone-clip)">${body}</g>`,
    `</svg>`,
  ].join("");
};
