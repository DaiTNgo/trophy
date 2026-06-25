export type ProductionMethod = "print" | "engrave";
export type ColorMode = "rgb" | "cmyk" | "grayscale" | "monochrome";

export type PreviewBounds = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio: number;
  rotationDeg: number;
  zIndex: number;
};

export type ProductionBounds = {
  widthMm: number;
  heightMm: number;
  safeMarginMm: number;
  bleedMm: number;
  method: ProductionMethod;
  colorMode: ColorMode;
  minImageDpi: number;
};

export type BlockCondition = {
  blockId: string;
  equals: string | boolean;
};

type BlockBase = {
  id: string;
  label: string;
  helpText?: string;
  hidden?: boolean;
  required: boolean;
  order: number;
  visibleWhen?: BlockCondition;
};

type RenderableBlockBase = BlockBase & {
  preview: PreviewBounds;
  production: ProductionBounds;
};

export type TextSingleBlock = RenderableBlockBase & {
  type: "text_single";
  placeholder?: string;
  defaultValue: string;
  maxChars: number;
  fontId: string;
  minFontSizePt: number;
  maxFontSizePt: number;
  color: string;
  alignment: "left" | "center" | "right";
  uppercase: boolean;
  colorMode: "fixed" | "user_selectable";
  colorOptions: ChoiceOption[];
  fontFamilyMode: "fixed" | "user_selectable";
  fontFamilyOptions: ChoiceOption[];
};

export type TextMultiBlock = RenderableBlockBase & {
  type: "text_multi";
  placeholder?: string;
  defaultValue: string;
  maxChars: number;
  maxLines: number;
  fontId: string;
  minFontSizePt: number;
  maxFontSizePt: number;
  color: string;
  alignment: "left" | "center" | "right";
  colorMode: "fixed" | "user_selectable";
  colorOptions: ChoiceOption[];
  fontFamilyMode: "fixed" | "user_selectable";
  fontFamilyOptions: ChoiceOption[];
};

export type IconOption = {
  id: string;
  label: string;
  category?: string;
  previewUrl: string;
  productionAssetId: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
};

export type IconPickerBlock = RenderableBlockBase & {
  type: "icon_picker";
  defaultOptionId: string;
  allowNone: boolean;
  allowUpload?: boolean;
  accept?: Array<"image/png" | "image/jpeg">;
  maxBytes?: number;
  fit: "contain" | "cover";
  options: IconOption[];
};

export type ImageUploadBlock = RenderableBlockBase & {
  type: "image_upload";
  defaultOptionId?: string;
  allowUpload?: boolean;
  options?: IconOption[];
  accept: Array<"image/png" | "image/jpeg">;
  maxBytes: number;
  minDpi: number;
  fit: "contain" | "cover";
  monochromePreview: boolean;
  productionMode: "original" | "monochrome";
  requireArtworkRights: boolean;
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
  | TextSingleBlock
  | TextMultiBlock
  | IconPickerBlock
  | ImageUploadBlock
  | ChoiceBlock
  | CheckboxBlock;

export type UploadedMediaValue = {
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
};

export type TextBlockValue = {
  text: string;
  color?: string;
  fontId?: string;
};

export type CustomizationFieldValue = string | boolean | UploadedMediaValue | TextBlockValue | null;
export type CustomizationFormValues = Record<string, CustomizationFieldValue>;

export type CustomizationTemplate = {
  id: string;
  productId: string;
  name: string;
  revision: number;
  status: "draft" | "published";
  previewUrl: string;
  previewWidthPx: number;
  previewHeightPx: number;
  blocks: CustomizationBlock[];
};

type LayerBase = {
  id: string;
  blockId: string;
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
  alignment: "left" | "center" | "right";
};

export type ImageLayer = LayerBase & {
  type: "image";
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  widthRatio: number;
  heightRatio: number;
  cropScale?: number;
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
  code: "BLOCK_NOT_FOUND" | "TEXT_EMPTY" | "TEXT_DOES_NOT_FIT" | "IMAGE_DPI_LOW" | "IMAGE_ASSET_MISSING";
  blockId: string;
  layerId: string;
  message: string;
};

export type FormValidationIssue = {
  code:
    | "REQUIRED_VALUE_MISSING"
    | "TEXT_TOO_LONG"
    | "TOO_MANY_LINES"
    | "OPTION_NOT_ALLOWED"
    | "UPLOAD_INVALID"
    | "CONFIRMATION_REQUIRED";
  blockId: string;
  message: string;
};

const presetSvg = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

const defaultProduction = (overrides?: Partial<ProductionBounds>): ProductionBounds => ({
  widthMm: 40,
  heightMm: 20,
  safeMarginMm: 2,
  bleedMm: 1,
  method: "engrave",
  colorMode: "monochrome",
  minImageDpi: 300,
  ...overrides,
});

const transparentOption: IconOption = {
  id: "none",
  label: "No icon",
  previewUrl: presetSvg(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"/>`),
  productionAssetId: "preset_none_v1",
  sourceWidthPx: 400,
  sourceHeightPx: 200,
};

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
  previewUrl:
    "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='900' height='900' viewBox='0 0 900 900'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' x2='1'%3E%3Cstop stop-color='%23f8d878'/%3E%3Cstop offset='.5' stop-color='%23fff5bf'/%3E%3Cstop offset='1' stop-color='%23b8862b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='900' height='900' fill='%23f5f5f4'/%3E%3Cpath d='M300 150h300v130c0 150-65 250-150 270-85-20-150-120-150-270z' fill='url(%23g)' stroke='%23966f24' stroke-width='12'/%3E%3Cpath d='M300 190H190c0 130 35 205 145 220M600 190h110c0 130-35 205-145 220' fill='none' stroke='%23b8862b' stroke-width='38'/%3E%3Cpath d='M430 550h40v120h120v55H310v-55h120z' fill='url(%23g)' stroke='%23966f24' stroke-width='10'/%3E%3Crect x='270' y='725' width='360' height='90' rx='14' fill='%23292524'/%3E%3C/svg%3E",
  previewWidthPx: 900,
  previewHeightPx: 900,
  blocks: [
    {
      id: "design_style",
      type: "radio",
      label: "Artwork source",
      required: true,
      order: 1,
      defaultValue: "preset",
      options: [
        { value: "preset", label: "Choose an icon" },
        { value: "upload", label: "Upload your own logo" },
      ],
    },
    {
      id: "badge_icon",
      type: "icon_picker",
      label: "Badge icon",
      required: false,
      order: 2,
      visibleWhen: { blockId: "design_style", equals: "preset" },
      defaultOptionId: "champion-star",
      allowNone: true,
      allowUpload: true,
      accept: ["image/png", "image/jpeg"],
      maxBytes: 20 * 1024 * 1024,
      fit: "contain",
      preview: {
        xRatio: 0.4,
        yRatio: 0.31,
        widthRatio: 0.18,
        heightRatio: 0.18,
        rotationDeg: 0,
        zIndex: 1,
      },
      production: defaultProduction({ widthMm: 22, heightMm: 22 }),
      options: [
        transparentOption,
        {
          id: "champion-star",
          label: "Champion star",
          category: "Awards",
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
          category: "Awards",
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
      type: "image_upload",
      label: "Upload your logo",
      helpText: "PNG or JPEG, up to 20 MB.",
      required: true,
      order: 3,
      visibleWhen: { blockId: "design_style", equals: "upload" },
      accept: ["image/png", "image/jpeg"],
      allowUpload: true,
      options: [],
      maxBytes: 20 * 1024 * 1024,
      minDpi: 300,
      fit: "contain",
      monochromePreview: true,
      productionMode: "monochrome",
      requireArtworkRights: true,
      preview: {
        xRatio: 0.4,
        yRatio: 0.31,
        widthRatio: 0.18,
        heightRatio: 0.18,
        rotationDeg: 0,
        zIndex: 1,
      },
      production: defaultProduction({ widthMm: 22, heightMm: 22 }),
    },
    {
      id: "line_1",
      type: "text_single",
      label: "Line 1",
      placeholder: "LEAGUE CHAMPION",
      required: true,
      order: 4,
      defaultValue: "LEAGUE CHAMPION",
      maxChars: 24,
      fontId: "sans-bold",
      minFontSizePt: 8,
      maxFontSizePt: 18,
      color: "#111111",
      alignment: "center",
      uppercase: true,
      colorMode: "fixed",
      colorOptions: [],
      fontFamilyMode: "fixed",
      fontFamilyOptions: [],
      preview: {
        xRatio: 0.5,
        yRatio: 0.42,
        widthRatio: 0.44,
        heightRatio: 0.08,
        rotationDeg: 0,
        zIndex: 2,
      },
      production: defaultProduction({ widthMm: 70, heightMm: 12 }),
    },
    {
      id: "line_2",
      type: "text_multi",
      label: "Award details",
      placeholder: "Winner name\n2026",
      required: false,
      order: 5,
      defaultValue: "ALEX MORGAN\n2026",
      maxChars: 36,
      maxLines: 2,
      fontId: "sans-bold",
      minFontSizePt: 7,
      maxFontSizePt: 13,
      color: "#111111",
      alignment: "center",
      colorMode: "fixed",
      colorOptions: [],
      fontFamilyMode: "fixed",
      fontFamilyOptions: [],
      preview: {
        xRatio: 0.5,
        yRatio: 0.5,
        widthRatio: 0.44,
        heightRatio: 0.14,
        rotationDeg: 0,
        zIndex: 2,
      },
      production: defaultProduction({ widthMm: 70, heightMm: 20 }),
    },
    {
      id: "base_text",
      type: "text_single",
      label: "Base engraving",
      placeholder: "CHAMPION 2026",
      required: true,
      order: 6,
      defaultValue: "CHAMPION 2026",
      maxChars: 28,
      fontId: "sans-bold",
      minFontSizePt: 7,
      maxFontSizePt: 20,
      color: "#ffffff",
      alignment: "center",
      uppercase: true,
      colorMode: "fixed",
      colorOptions: [],
      fontFamilyMode: "fixed",
      fontFamilyOptions: [],
      preview: {
        xRatio: 0.5,
        yRatio: 0.855,
        widthRatio: 0.34,
        heightRatio: 0.06,
        rotationDeg: 0,
        zIndex: 2,
      },
      production: defaultProduction({ widthMm: 80, heightMm: 18 }),
    },
    {
      id: "artwork_rights",
      type: "checkbox",
      label: "I have the rights to use the uploaded artwork.",
      required: true,
      order: 7,
      defaultValue: false,
      visibleWhen: { blockId: "design_style", equals: "upload" },
    },
    {
      id: "design_confirmation",
      type: "checkbox",
      label: "I reviewed the preview and confirm the design is correct.",
      required: true,
      order: 8,
      defaultValue: false,
    },
  ],
};

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

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

export const isBlockVisible = (block: CustomizationBlock, values: CustomizationFormValues) =>
  !block.hidden && (!block.visibleWhen || values[block.visibleWhen.blockId] === block.visibleWhen.equals);

const resolveOptionValue = (
  options: ChoiceOption[],
  selectedValue: string | undefined,
  fallbackValue: string,
) => {
  if (selectedValue && options.some((option) => option.value === selectedValue)) {
    return selectedValue;
  }
  return options.find((option) => option.value === fallbackValue)?.value ?? options[0]?.value ?? fallbackValue;
};

export const createDefaultTextValue = (
  block: TextSingleBlock | TextMultiBlock,
): TextBlockValue => ({
  text: block.defaultValue,
  color:
    block.colorMode === "user_selectable"
      ? resolveOptionValue(block.colorOptions, undefined, block.color)
      : block.color,
  fontId:
    block.fontFamilyMode === "user_selectable"
      ? resolveOptionValue(block.fontFamilyOptions, undefined, block.fontId)
      : block.fontId,
});

export const getTextBlockValue = (
  block: TextSingleBlock | TextMultiBlock,
  value: CustomizationFieldValue | undefined,
): TextBlockValue => {
  if (value && typeof value === "object" && "text" in value) {
    return {
      text: typeof value.text === "string" ? value.text : "",
      color:
        typeof value.color === "string"
          ? value.color
          : createDefaultTextValue(block).color,
      fontId:
        typeof value.fontId === "string"
          ? value.fontId
          : createDefaultTextValue(block).fontId,
    };
  }

  if (typeof value === "string") {
    return {
      ...createDefaultTextValue(block),
      text: value,
    };
  }

  return createDefaultTextValue(block);
};

export const hasRenderablePreview = (
  block: CustomizationBlock,
): block is TextSingleBlock | TextMultiBlock | IconPickerBlock | ImageUploadBlock =>
  "preview" in block && "production" in block;

export const createDefaultFormValues = (template: CustomizationTemplate) => {
  const values: CustomizationFormValues = {};
  for (const block of template.blocks) {
    if (block.type === "text_single" || block.type === "text_multi") {
      values[block.id] = createDefaultTextValue(block);
    } else if (block.type === "icon_picker") {
      values[block.id] = block.defaultOptionId;
    } else if (block.type === "image_upload") {
      values[block.id] = block.defaultOptionId && block.options?.some((option) => option.id === block.defaultOptionId)
        ? block.defaultOptionId
        : null;
    } else {
      values[block.id] = block.defaultValue;
    }
  }
  return values;
};

export const limitTextBlockValue = (
  block: TextSingleBlock | TextMultiBlock,
  input: string,
) => {
  if (block.type === "text_single") {
    const normalized = input.replace(/[\r\n]+/g, " ").slice(0, block.maxChars);
    return block.uppercase ? normalized.toUpperCase() : normalized;
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

  for (const block of template.blocks) {
    if (!isBlockVisible(block, values)) continue;

    const value = values[block.id];
    if (block.type === "checkbox") {
      if (block.required && value !== true) {
        issues.push({
          code: "CONFIRMATION_REQUIRED",
          blockId: block.id,
          message: `${block.label} must be confirmed.`,
        });
      }
      continue;
    }

    if (block.type === "text_single" || block.type === "text_multi") {
      const textValue = getTextBlockValue(block, value);
      const text = textValue.text;
      if (block.required && !text.trim()) {
        issues.push({
          code: "REQUIRED_VALUE_MISSING",
          blockId: block.id,
          message: `${block.label} is required.`,
        });
        continue;
      }
      if (text.length > block.maxChars) {
        issues.push({
          code: "TEXT_TOO_LONG",
          blockId: block.id,
          message: `${block.label} allows at most ${block.maxChars} characters.`,
        });
      }
      if (block.type === "text_multi" && text.split(/\r?\n/).length > block.maxLines) {
        issues.push({
          code: "TOO_MANY_LINES",
          blockId: block.id,
          message: `${block.label} allows at most ${block.maxLines} lines.`,
        });
      }
      if (
        block.colorMode === "user_selectable" &&
        !block.colorOptions.some((option) => option.value === textValue.color)
      ) {
        issues.push({
          code: "OPTION_NOT_ALLOWED",
          blockId: block.id,
          message: `${block.label} contains an unavailable color.`,
        });
      }
      if (
        block.fontFamilyMode === "user_selectable" &&
        !block.fontFamilyOptions.some((option) => option.value === textValue.fontId)
      ) {
        issues.push({
          code: "OPTION_NOT_ALLOWED",
          blockId: block.id,
          message: `${block.label} contains an unavailable font family.`,
        });
      }
    } else if (block.type === "icon_picker") {
      if (block.required && (value === null || value === undefined || value === "")) {
        issues.push({
          code: "REQUIRED_VALUE_MISSING",
          blockId: block.id,
          message: `${block.label} is required.`,
        });
        continue;
      }
      if (value && typeof value === "object" && "assetId" in value) {
        if (block.allowUpload === false || !value.assetId) {
          issues.push({
            code: "UPLOAD_INVALID",
            blockId: block.id,
            message: `${block.label} upload is invalid.`,
          });
        }
        continue;
      }
      const optionId = typeof value === "string" ? value : "";
      if (optionId && !block.options.some((option) => option.id === optionId)) {
        issues.push({
          code: "OPTION_NOT_ALLOWED",
          blockId: block.id,
          message: `${block.label} contains an unavailable option.`,
        });
      }
    } else if (block.type === "image_upload") {
      if (block.required && value == null) {
        issues.push({
          code: "REQUIRED_VALUE_MISSING",
          blockId: block.id,
          message: `${block.label} is required.`,
        });
        continue;
      }
      if (value !== null) {
        if (typeof value === "string") {
          if (!block.options?.some((option) => option.id === value)) {
            issues.push({
              code: "OPTION_NOT_ALLOWED",
              blockId: block.id,
              message: `${block.label} contains an unavailable option.`,
            });
          }
        } else if (typeof value !== "object" || !("assetId" in value) || !value.assetId || block.allowUpload === false) {
          issues.push({
            code: "UPLOAD_INVALID",
            blockId: block.id,
            message: `${block.label} upload is invalid.`,
          });
        }
      }
    } else if (
      (block.type === "select" || block.type === "radio" || block.type === "color") &&
      typeof value === "string" &&
      !block.options.some((option) => option.value === value)
    ) {
      issues.push({
        code: "OPTION_NOT_ALLOWED",
        blockId: block.id,
        message: `${block.label} contains an unavailable option.`,
      });
    }
    else if (block.required && (value === null || value === undefined || value === "")) {
      issues.push({
        code: "REQUIRED_VALUE_MISSING",
        blockId: block.id,
        message: `${block.label} is required.`,
      });
      continue;
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

  for (const block of [...template.blocks].sort((a, b) => a.order - b.order)) {
    if (!isBlockVisible(block, values) || !hasRenderablePreview(block)) continue;

    const value = values[block.id];
    if (block.type === "text_single" || block.type === "text_multi") {
      const textValue = getTextBlockValue(block, value);
      const lines =
        block.type === "text_single"
          ? [normalizeSingleLine(block.uppercase ? textValue.text.toUpperCase() : textValue.text)]
          : textValue.text
              .replace(/\r/g, "")
              .split("\n")
              .slice(0, block.maxLines);
      const visibleLines = lines.filter((line) => line.length > 0);
      if (visibleLines.length === 0) continue;

      if (block.type === "text_multi") {
        const availableWidthMm = block.production.widthMm - block.production.safeMarginMm * 2;
        const fittedLines = visibleLines.map((line) =>
          fitSingleLineText({
            text: line,
            minFontSizePt: block.minFontSizePt,
            maxFontSizePt: block.maxFontSizePt,
            availableWidth: availableWidthMm,
            measure: (text, size) => text.length * size * 0.3528 * 0.55,
          }),
        );
        layers.push({
          id: block.id,
          blockId: block.id,
          type: "text",
          xRatio: block.preview.xRatio,
          yRatio: block.preview.yRatio,
          rotationDeg: block.preview.rotationDeg,
          text: fittedLines.map((line) => line.text).join("\n"),
          fontId:
            block.fontFamilyMode === "user_selectable"
              ? resolveOptionValue(block.fontFamilyOptions, textValue.fontId, block.fontId)
              : block.fontId,
          fontSizePt: Math.min(...fittedLines.map((line) => line.fontSizePt)),
          color:
            block.colorMode === "user_selectable"
              ? resolveOptionValue(block.colorOptions, textValue.color, block.color)
              : block.color,
          alignment: block.alignment,
        });
        continue;
      }

      const line = visibleLines[0];
      const availableWidthMm = block.production.widthMm - block.production.safeMarginMm * 2;
      const fitted = fitSingleLineText({
        text: line,
        minFontSizePt: block.minFontSizePt,
        maxFontSizePt: block.maxFontSizePt,
        availableWidth: availableWidthMm,
        measure: (text, size) => text.length * size * 0.3528 * 0.55,
      });
      layers.push({
        id: block.id,
        blockId: block.id,
        type: "text",
        xRatio: block.preview.xRatio,
        yRatio: block.preview.yRatio,
        rotationDeg: block.preview.rotationDeg,
        text: fitted.text,
        fontId:
          block.fontFamilyMode === "user_selectable"
            ? resolveOptionValue(block.fontFamilyOptions, textValue.fontId, block.fontId)
            : block.fontId,
        fontSizePt: fitted.fontSizePt,
        color:
          block.colorMode === "user_selectable"
            ? resolveOptionValue(block.colorOptions, textValue.color, block.color)
            : block.color,
        alignment: block.alignment,
      });
      continue;
    }

    if (block.type === "icon_picker" && typeof value === "string" && value !== "none") {
      const option = block.options.find((entry) => entry.id === value);
      if (!option) continue;
      layers.push({
        id: block.id,
        blockId: block.id,
        type: "image",
        xRatio: block.preview.xRatio,
        yRatio: block.preview.yRatio,
        rotationDeg: block.preview.rotationDeg,
        assetId: option.productionAssetId,
        previewUrl: option.previewUrl,
        sourceWidthPx: option.sourceWidthPx,
        sourceHeightPx: option.sourceHeightPx,
        widthRatio: block.preview.widthRatio,
        heightRatio: block.preview.heightRatio,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
      });
      continue;
    }

    if (block.type === "icon_picker" && value && typeof value === "object" && "assetId" in value) {
      if (block.allowUpload === false) continue;
      layers.push({
        id: block.id,
        blockId: block.id,
        type: "image",
        xRatio: block.preview.xRatio,
        yRatio: block.preview.yRatio,
        rotationDeg: block.preview.rotationDeg,
        assetId: value.assetId,
        previewUrl: value.previewUrl,
        sourceWidthPx: value.sourceWidthPx,
        sourceHeightPx: value.sourceHeightPx,
        widthRatio: block.preview.widthRatio,
        heightRatio: block.preview.heightRatio,
        cropScale: normalizeCropScale(value.cropScale),
        cropXRatio: normalizeCropPan(value.cropXRatio),
        cropYRatio: normalizeCropPan(value.cropYRatio),
      });
      continue;
    }

    if (block.type === "image_upload" && typeof value === "string" && value !== "none") {
      const option = block.options?.find((entry) => entry.id === value);
      if (!option) continue;
      layers.push({
        id: block.id,
        blockId: block.id,
        type: "image",
        xRatio: block.preview.xRatio,
        yRatio: block.preview.yRatio,
        rotationDeg: block.preview.rotationDeg,
        assetId: option.productionAssetId,
        previewUrl: option.previewUrl,
        sourceWidthPx: option.sourceWidthPx,
        sourceHeightPx: option.sourceHeightPx,
        widthRatio: block.preview.widthRatio,
        heightRatio: block.preview.heightRatio,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
      });
      continue;
    }

    if (block.type === "image_upload" && value && typeof value === "object" && "assetId" in value) {
      if (block.allowUpload === false) continue;
      layers.push({
        id: block.id,
        blockId: block.id,
        type: "image",
        xRatio: block.preview.xRatio,
        yRatio: block.preview.yRatio,
        rotationDeg: block.preview.rotationDeg,
        assetId: value.assetId,
        previewUrl: value.previewUrl,
        sourceWidthPx: value.sourceWidthPx,
        sourceHeightPx: value.sourceHeightPx,
        widthRatio: block.preview.widthRatio,
        heightRatio: block.preview.heightRatio,
        cropScale: normalizeCropScale(value.cropScale),
        cropXRatio: normalizeCropPan(value.cropXRatio),
        cropYRatio: normalizeCropPan(value.cropYRatio),
      });
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

  const findBlock = (layerId: string, blockId: string) =>
    template.blocks.find((block) => block.id === blockId || layerId.startsWith(`${block.id}:`));

  for (const layer of design.layers) {
    const block = findBlock(layer.id, layer.blockId);
    if (!block || !hasRenderablePreview(block)) {
      issues.push({
        code: "BLOCK_NOT_FOUND",
        blockId: layer.blockId,
        layerId: layer.id,
        message: "The customization block no longer exists.",
      });
      continue;
    }

    if (layer.type === "text") {
      const textLines = layer.text
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => normalizeSingleLine(line))
        .filter(Boolean);
      if (textLines.length === 0) {
        issues.push({
          code: "TEXT_EMPTY",
          blockId: block.id,
          layerId: layer.id,
          message: "Text cannot be empty.",
        });
        continue;
      }

      if (measureText) {
        const availableWidthMm = block.production.widthMm - block.production.safeMarginMm * 2;
        const exceedsWidth = textLines.some(
          (line) => measureText(line, layer.fontSizePt, layer.fontId) > availableWidthMm,
        );
        if (exceedsWidth) {
          issues.push({
            code: "TEXT_DOES_NOT_FIT",
            blockId: block.id,
            layerId: layer.id,
            message: "Text does not fit inside the block safe width.",
          });
        }
      }
      continue;
    }

    if (!layer.assetId || !layer.previewUrl) {
      issues.push({
        code: "IMAGE_ASSET_MISSING",
        blockId: block.id,
        layerId: layer.id,
        message: "The original image asset is unavailable.",
      });
      continue;
    }

    const frameWidthPx = Math.max(1, layer.widthRatio * template.previewWidthPx);
    const frameHeightPx = Math.max(1, layer.heightRatio * template.previewHeightPx);
    const cropRect = getCoverImageRect({
      sourceWidthPx: layer.sourceWidthPx,
      sourceHeightPx: layer.sourceHeightPx,
      frameWidthPx,
      frameHeightPx,
      cropScale: layer.cropScale,
      cropXRatio: layer.cropXRatio,
      cropYRatio: layer.cropYRatio,
    });
    const dpi = calculateEffectiveDpi({
      sourcePixels: layer.sourceWidthPx,
      cropRatio: frameWidthPx / cropRect.widthPx,
      printedMillimetres: block.production.widthMm - block.production.safeMarginMm * 2,
    });
    if (dpi < block.production.minImageDpi) {
      issues.push({
        code: "IMAGE_DPI_LOW",
        blockId: block.id,
        layerId: layer.id,
        message: `Image quality is ${dpi} DPI; ${block.production.minImageDpi} DPI is required.`,
      });
    }
  }

  return { valid: issues.length === 0, issues };
};

export const fitPreviewIntoBox = ({
  intrinsicWidthPx,
  intrinsicHeightPx,
  maxWidthPx,
  maxHeightPx,
}: {
  intrinsicWidthPx: number;
  intrinsicHeightPx: number;
  maxWidthPx: number;
  maxHeightPx: number;
}) => {
  const safeWidth = intrinsicWidthPx > 0 ? intrinsicWidthPx : maxWidthPx;
  const safeHeight = intrinsicHeightPx > 0 ? intrinsicHeightPx : maxHeightPx;
  const scale = Math.min(maxWidthPx / safeWidth, maxHeightPx / safeHeight);
  return {
    widthPx: Math.round(safeWidth * scale),
    heightPx: Math.round(safeHeight * scale),
  };
};

export const getBlockPreviewRect = ({
  block,
  previewWidthPx,
  previewHeightPx,
}: {
  block: TextSingleBlock | TextMultiBlock | IconPickerBlock | ImageUploadBlock;
  previewWidthPx: number;
  previewHeightPx: number;
}) => {
  const widthPx = block.preview.widthRatio * previewWidthPx;
  const heightPx = block.preview.heightRatio * previewHeightPx;
  const centerXPx = block.preview.xRatio * previewWidthPx;
  const centerYPx = block.preview.yRatio * previewHeightPx;
  return {
    xPx: centerXPx - widthPx / 2,
    yPx: centerYPx - heightPx / 2,
    widthPx,
    heightPx,
    centerXPx,
    centerYPx,
    rotationDeg: block.preview.rotationDeg,
  };
};

export type ImageCoverCrop = {
  sourceWidthPx: number;
  sourceHeightPx: number;
  frameWidthPx: number;
  frameHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

export const normalizeCropScale = (value?: number) => clamp(value ?? 1, 1, 4);

export const normalizeCropPan = (value?: number) => clamp(value ?? 0, -1, 1);

export const getCoverImageRect = ({
  sourceWidthPx,
  sourceHeightPx,
  frameWidthPx,
  frameHeightPx,
  cropScale,
  cropXRatio,
  cropYRatio,
}: ImageCoverCrop) => {
  const safeSourceWidth = Math.max(1, sourceWidthPx);
  const safeSourceHeight = Math.max(1, sourceHeightPx);
  const safeFrameWidth = Math.max(1, frameWidthPx);
  const safeFrameHeight = Math.max(1, frameHeightPx);
  const scale =
    Math.max(safeFrameWidth / safeSourceWidth, safeFrameHeight / safeSourceHeight) *
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
    cropXRatio:
      overflowXPx > 0
        ? clamp(((-frameWidthPx / 2 - imageXPx) / overflowXPx) * 2 - 1, -1, 1)
        : 0,
    cropYRatio:
      overflowYPx > 0
        ? clamp(((-frameHeightPx / 2 - imageYPx) / overflowYPx) * 2 - 1, -1, 1)
        : 0,
  };
};

const escapeXml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const renderBlockSvg = ({
  template,
  design,
  blockId,
}: {
  template: CustomizationTemplate;
  design: CustomizationDesign;
  blockId: string;
}) => {
  const block = template.blocks.find((entry) => entry.id === blockId);
  if (!block || !hasRenderablePreview(block)) {
    throw new Error(`Unknown customization block: ${blockId}`);
  }

  const safeX = block.production.safeMarginMm;
  const safeY = block.production.safeMarginMm;
  const safeWidth = block.production.widthMm - block.production.safeMarginMm * 2;
  const safeHeight = block.production.heightMm - block.production.safeMarginMm * 2;
  const layers = design.layers.filter((layer) => layer.blockId === block.id);
  const body = layers
    .map((layer) => {
      const x = safeX + ((layer.xRatio - block.preview.xRatio) / block.preview.widthRatio + 0.5) * safeWidth;
      const y = safeY + ((layer.yRatio - block.preview.yRatio) / block.preview.heightRatio + 0.5) * safeHeight;

      if (layer.type === "text") {
        const anchor =
          layer.alignment === "left" ? "start" : layer.alignment === "right" ? "end" : "middle";
        const textLines = layer.text.replace(/\r/g, "").split("\n");
        if (textLines.length > 1) {
          const firstDy = -((textLines.length - 1) * 1.15) / 2;
          const tspans = textLines
            .map((line, index) => {
              const dy = index === 0 ? `${firstDy}em` : "1.15em";
              return `<tspan x="${x}" dy="${dy}">${escapeXml(line)}</tspan>`;
            })
            .join("");
          return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${layer.fontSizePt}pt" text-anchor="${anchor}" dominant-baseline="middle" fill="${escapeXml(layer.color)}" transform="rotate(${layer.rotationDeg} ${x} ${y})">${tspans}</text>`;
        }
        return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${layer.fontSizePt}pt" text-anchor="${anchor}" dominant-baseline="middle" fill="${escapeXml(layer.color)}" transform="rotate(${layer.rotationDeg} ${x} ${y})">${escapeXml(layer.text)}</text>`;
      }

      const width = (layer.widthRatio / block.preview.widthRatio) * safeWidth;
      const height = (layer.heightRatio / block.preview.heightRatio) * safeHeight;
      const cropRect = getCoverImageRect({
        sourceWidthPx: layer.sourceWidthPx,
        sourceHeightPx: layer.sourceHeightPx,
        frameWidthPx: width,
        frameHeightPx: height,
        cropScale: layer.cropScale,
        cropXRatio: layer.cropXRatio,
        cropYRatio: layer.cropYRatio,
      });
      const clipId = `clip-${escapeXml(layer.id).replace(/[^a-zA-Z0-9_-]/g, "-")}`;
      return `<g transform="rotate(${layer.rotationDeg} ${x} ${y})"><clipPath id="${clipId}"><rect x="${x - width / 2}" y="${y - height / 2}" width="${width}" height="${height}" /></clipPath><image clip-path="url(#${clipId})" href="${escapeXml(layer.previewUrl)}" x="${x + cropRect.xPx}" y="${y + cropRect.yPx}" width="${cropRect.widthPx}" height="${cropRect.heightPx}" preserveAspectRatio="none" /></g>`;
    })
    .join("");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${block.production.widthMm}mm" height="${block.production.heightMm}mm" viewBox="0 0 ${block.production.widthMm} ${block.production.heightMm}">`,
    `<metadata>${escapeXml(JSON.stringify({ productId: design.productId, templateRevision: design.templateRevision, designRevision: design.revision, blockId }))}</metadata>`,
    `<defs><clipPath id="block-clip"><rect width="${block.production.widthMm}" height="${block.production.heightMm}" /></clipPath></defs>`,
    `<g clip-path="url(#block-clip)">${body}</g>`,
    `</svg>`,
  ].join("");
};
