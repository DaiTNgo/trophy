export type TemplateStatus = "draft" | "published";
export type DesignStatus = "draft" | "validated" | "frozen";
export type TextAlign = "left" | "center" | "right" | "justified";
export type ShapeType = "rectangle" | "circle" | "ellipse" | "rounded_rectangle" | "star" | "heart" | "vector";

export type VectorPointType = "corner" | "smooth";

export type VectorPoint = {
  id: string;
  type: VectorPointType;
  xRatio: number;
  yRatio: number;
  inHandle?: { xRatio: number; yRatio: number };
  outHandle?: { xRatio: number; yRatio: number };
  cornerRadius?: number;
};

export type VectorPath = {
  points: VectorPoint[];
  closed: boolean;
};

export type BackgroundAsset = {
  assetId: string;
  previewUrl: string;
  filename?: string;
  mimeType?: string;
  widthPx: number;
  heightPx: number;
  pdfPageCount?: number;
  pdfAssetId?: string;
  pendingPdfUpload?: boolean;
};

export type LayerGeometry = {
  xRatio: number;
  yRatio: number;
  widthRatio: number;
  heightRatio?: number;
  rotationDeg: number;
};

export type ClipartAssetMimeType = "image/svg+xml" | "image/png" | "image/webp";

export type CustomizationClipartAsset = {
  id: string;
  sourceAssetId: string;
  name: string;
  fileName?: string | null;
  categoryId: string;
  previewUrl: string;
  mimeType: ClipartAssetMimeType;
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  active: boolean;
};

export type ClipartCategory = {
  id: string;
  name: string;
};

export type ClipartCategoryMode = "fixed" | "allow_list";

export type ImageClipartSourcePolicy =
  | "upload_only"
  | "clipart_category_only"
  | "upload_or_clipart_category";

export type UploadClipartPresentation = "source_select" | "side_by_side";
export type ImageShapeSelectedSource = "upload" | "clipart";

export type ChoiceOption = {
  value: string;
  label: string;
  swatch?: string;
};

export type TextColorPolicy =
  | { mode: "fixed"; color: string }
  | { mode: "shopper_selectable"; defaultColor: string; options: ChoiceOption[]; allowCustomColor?: boolean };

export type TextFontPolicy =
  | { mode: "fixed"; fontId: string }
  | { mode: "shopper_selectable"; defaultFontId: string; options: ChoiceOption[] };

export type TextFormatPolicy =
  | { mode: "fixed"; isBold: boolean; isItalic: boolean }
  | { mode: "shopper_selectable"; defaultBold: boolean; defaultItalic: boolean };

export type TextAlignPolicy =
  | { mode: "fixed"; align: TextAlign }
  | { mode: "shopper_selectable"; defaultAlign: TextAlign };

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
  | { type: "custom"; points: BezierPoint[] }
  | {
      type: "closed_ellipse";
      bounds: {
        xRatio: number;
        yRatio: number;
        widthRatio: number;
        heightRatio: number;
      };
      startAngleDeg: number;
      direction: "clockwise" | "counterclockwise";
      placement: "over_path" | "below_path" | "in_path";
    };

type LayerBase = {
  id: string;
  name: string;
  hidden: boolean;
  locked: boolean;
  zIndex: number;
};

export type TextEditorLayer = LayerBase & {
  type: "text";
  geometry: LayerGeometry;
  text: {
    sampleText: string;
    maxLines: number;
    minFontSizePt: number;
    maxFontSizePt: number;
    alignPolicy: TextAlignPolicy;
    colorPolicy: TextColorPolicy;
    fontPolicy: TextFontPolicy;
    formatPolicy: TextFormatPolicy;
    path: TextPath;
  };
};

export type ImageShapeEditorLayer = LayerBase & {
  type: "image_shape";
  geometry: Required<LayerGeometry>;
  shape: {
    type: ShapeType;
    lockAspectRatio: boolean;
    vectorPath?: VectorPath;
  };
  upload: {
    fit: "cover";
    defaultCrop?: ImageCrop;
  };
  sourcePolicy?: ImageClipartSourcePolicy;
  presentation?: UploadClipartPresentation;
  clipartCategoryMode?: ClipartCategoryMode;
  clipartCategory?: ClipartCategory | null;
  allowedClipartCategories?: ClipartCategory[];
  clipartAssets?: CustomizationClipartAsset[];
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

export type ProductCustomization = {
  productId: string;
  enabled: boolean;
  canvasWidthPx: number | null;
  canvasHeightPx: number | null;
  layers: CustomizationLayer[];
  formFields: CustomizationFormField[];
};

export type TextFieldValue = {
  text: string;
  color?: string;
  fontId?: string;
  isBold?: boolean;
  isItalic?: boolean;
  align?: TextAlign;
};

export type ImageShapeFieldValue = {
  source?: "upload";
  assetId: string;
  previewUrl: string;
  sourceWidthPx: number;
  sourceHeightPx: number;
  cropScale?: number;
  cropXRatio?: number;
  cropYRatio?: number;
};

export type ClipartFieldValue = {
  source: "clipart";
  clipartAssetId: string;
  clipartAssetName: string;
  sourceAssetId: string;
  previewUrl: string;
  mimeType: ClipartAssetMimeType;
  sourceWidthPx: number | null;
  sourceHeightPx: number | null;
  categoryId: string;
};

export type CustomizationFieldValue = TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null;
export type CustomizationFormValues = Record<string, CustomizationFieldValue>;

export type RuntimeImageClipartLayer = {
  id: string;
  layerId: string;
  type: "image_clipart_runtime";
  fieldId?: string;
  required: boolean;
  geometry: Required<LayerGeometry>;
  shape: ImageShapeEditorLayer["shape"];
  sourcePolicy: ImageClipartSourcePolicy;
  presentation?: UploadClipartPresentation;
  clipartCategoryMode?: ClipartCategoryMode;
  clipartCategory?: ClipartCategory;
  allowedClipartCategories: ClipartCategory[];
  clipartAssets: CustomizationClipartAsset[];
  upload: {
    enabled: boolean;
    fit: "cover" | "contain";
    panEnabled: boolean;
    zoomEnabled: boolean;
  };
};

export type RuntimeTextLayer = {
  id: string;
  layerId: string;
  type: "text";
  text: string;
  fontId: string;
  fontSizePt: number;
  color: string;
  isBold: boolean;
  isItalic: boolean;
  align: TextAlign;
  path: TextPath;
  geometry: LayerGeometry;
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
  contentSource?: "upload" | "clipart";
  clipartAssetId?: string;
  clipartAssetName?: string;
  categoryId?: string;
  mimeType?: ClipartAssetMimeType;
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
    | "CANVAS_DIMENSIONS_REQUIRED"
    | "CANVAS_DIMENSIONS_INVALID"
    | "FIELD_LAYER_MISSING"
    | "LAYER_FIELD_MISSING"
    | "FONT_SIZE_RANGE_INVALID"
    | "TEXT_PATH_REQUIRES_SINGLE_LINE"
    | "STYLE_POLICY_INVALID"
    | "CLIPART_POLICY_INVALID"
    | "REQUIRED_VALUE_MISSING"
    | "LOCALIZATION_INCOMPLETE"
    | "OPTION_NOT_ALLOWED"
    | "UPLOAD_INVALID"
    | "SHAPE_REFERENCE_MISSING";
  layerId?: string;
  fieldId?: string;
  message: string;
};
