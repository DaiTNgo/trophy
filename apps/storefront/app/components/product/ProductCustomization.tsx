import {
  buildDesignFromForm,
  getOrderedFormFields,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  layerGeometryToPixels,
  validateCustomizationValues,
  vectorPointsToSvgPathD,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type DynamicFontFamily,
  type IconFieldValue,
  type ImageShapeFieldValue,
  type ImageShapeEditorLayer,
  type RuntimeLayer,
  type TextFieldValue,
} from "@trophy/customization";
import { useMemo } from "react";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:8787";

export function ProductCustomizationPreview({
  template,
  values,
  dynamicFonts = [],
  selectedVariantId,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
}) {
  const design = useMemo(
    () => buildDesignFromForm({ template, values, designId: "storefront_product_preview", dynamicFonts }),
    [dynamicFonts, template, values],
  );

  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const scale = Math.min(720 / width, 720 / height);

  return (
    <div
      className="relative mx-auto overflow-auto rounded-lg bg-surface-container-low p-4"
      data-selected-variant-id={selectedVariantId ?? ""}
      data-preview-background-url={background?.previewUrl ?? ""}
    >
      <FontLoader layers={design.layers} dynamicFonts={dynamicFonts} />
      <ShapeClipPaths layers={design.layers} />
      <div
        className="relative mx-auto overflow-hidden rounded-lg bg-white shadow-sm"
        style={{ width: width * scale, height: height * scale }}
      >
        {background ? (
          <img
            src={background.previewUrl}
            alt=""
            data-preview-background-image=""
            className="absolute inset-0 h-full w-full object-fill"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-surface-container text-sm text-on-surface-variant">
            Variant image unavailable
          </div>
        )}
        {[...design.layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
          if (layer.type === "text") {
            return (
              <PreviewText
                key={layer.id}
                layer={layer}
                width={width}
                height={height}
                scale={scale}
              />
            );
          }
          return (
            <PreviewImageShape
              key={layer.id}
              layer={layer}
              width={width}
              height={height}
              scale={scale}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ProductCustomizationForm({
  template,
  values,
  dynamicFonts = [],
  message,
  uploadingFieldId,
  onUploadingFieldIdChange,
  onMessageChange,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  message: string;
  uploadingFieldId: string;
  onUploadingFieldIdChange: (fieldId: string) => void;
  onMessageChange: (message: string) => void;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  const validation = useMemo(
    () => validateCustomizationValues({ template, values }),
    [template, values],
  );

  async function uploadImage(field: CustomizationFormField, file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      onMessageChange("Use a PNG or JPEG image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      onMessageChange("Image exceeds the 20 MB limit.");
      return;
    }

    onUploadingFieldIdChange(field.id);
    try {
      const response = await fetch(`${BACKEND_URL}/api/storefront/customizations/assets`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Upload-Token": getUploadToken() },
        body: file,
      });
      const payload = (await response.json()) as {
        asset?: { id: string; widthPx: number; heightPx: number; contentUrl: string };
        error?: string;
      };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? "Upload failed.");
      onValueChange(field.id, {
        assetId: payload.asset.id,
        previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
        sourceWidthPx: payload.asset.widthPx,
        sourceHeightPx: payload.asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
      });
      onMessageChange("");
    } catch (error) {
      onMessageChange(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      onUploadingFieldIdChange("");
    }
  }

  return (
    <div className="space-y-6">
      {message ? (
        <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {message}
        </p>
      ) : null}
      {!validation.valid ? (
        <div className="space-y-2">
          {validation.issues.map((issue) => (
            <p key={`${issue.fieldId}-${issue.code}`} className="text-sm text-destructive">
              {issue.message}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Preview updates on the selected variant image. Layer placement stays fixed to the same canvas.
        </p>
      )}
      <div className="space-y-5">
        {getOrderedFormFields(template).map((field) => {
          const layer = template.layers.find((entry) => entry.id === field.layerId);
          if (!layer) return null;
          return (
            <FormField
              key={field.id}
              field={field}
              layer={layer}
              value={values[field.id]}
              issue={validation.issues.find((issue) => issue.fieldId === field.id)?.message}
              uploading={uploadingFieldId === field.id}
              dynamicFonts={dynamicFonts}
              onChange={(value) => {
                onValueChange(field.id, value);
                onMessageChange("");
              }}
              onUpload={(file) => uploadImage(field, file)}
            />
          );
        })}
      </div>
    </div>
  );
}

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

function FontLoader({
  layers,
  dynamicFonts = [],
}: {
  layers: RuntimeLayer[];
  dynamicFonts?: DynamicFontFamily[];
}) {
  const fontFamilies = Array.from(
    new Set(
      layers
        .filter((layer): layer is Extract<RuntimeLayer, { type: "text" }> => layer.type === "text" && !!layer.fontId)
        .map((layer) => layer.fontId),
    ),
  );

  return (
    <>
      {fontFamilies.flatMap((familyId) => {
        const dynamicFont = dynamicFonts.find((font) => font.id === familyId);
        if (!dynamicFont) return [];

        return [
          dynamicFont.regularAssetId,
          dynamicFont.boldAssetId,
          dynamicFont.italicAssetId,
          dynamicFont.boldItalicAssetId,
        ]
          .filter(Boolean)
          .map((assetId) => (
            <style
              key={assetId}
              dangerouslySetInnerHTML={{
                __html: `
                  @font-face {
                    font-family: '${assetId}';
                    src: url('${BACKEND_URL}/api/storefront/brand-assets/fonts/file/${assetId}') format('truetype');
                  }
                `,
              }}
            />
          ));
      })}
    </>
  );
}

function PreviewText({
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
  const closedTextPath = layer.path.type === "closed_ellipse";
  const layerWidthPx = layer.geometry.widthRatio * width;
  const layerHeightPx = closedTextPath
    ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height)
    : layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const left = (layer.geometry.xRatio * width - layerWidthPx / 2) * scale;
  const top = (layer.geometry.yRatio * height - layerHeightPx / 2) * scale;

  if (layer.path.type !== "straight") {
    const pathId = `storefront_product_text_path_${layer.id}`;
    const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
    const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
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
    const pathD = getTextPathSvgD({ path: renderPath, widthPx: layerWidthPx, heightPx: layerHeightPx });

    return (
      <svg
        className="absolute overflow-visible"
        style={{
          left,
          top,
          width: layerWidthPx * scale,
          height: layerHeightPx * scale,
          transform: `rotate(${layer.geometry.rotationDeg}deg)`,
        }}
        viewBox={`0 0 ${layerWidthPx} ${layerHeightPx}`}
      >
        <defs>
          <path id={pathId} d={pathD} />
        </defs>
        <text
          fontSize={layer.fontSizePt}
          fontFamily={layer.fontId}
          fontWeight={layer.isBold ? "bold" : "normal"}
          fontStyle={layer.isItalic ? "italic" : "normal"}
          textDecoration={layer.isUnderline ? "underline" : "none"}
          fill={layer.color}
          textAnchor={pathAttrs.textAnchor}
          dominantBaseline="middle"
          textLength={pathAttrs.textLength}
          lengthAdjust={pathAttrs.lengthAdjust}
          wordSpacing={pathAttrs.wordSpacingPx ?? 0}
        >
          <textPath href={`#${pathId}`} startOffset={pathAttrs.startOffset}>
            {pathAttrs.dy ? <tspan dy={pathAttrs.dy}>{layer.text}</tspan> : layer.text}
          </textPath>
        </text>
      </svg>
    );
  }

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden whitespace-pre-line text-center font-semibold"
      style={{
        left: layer.geometry.xRatio * width * scale,
        top: layer.geometry.yRatio * height * scale,
        width: layerWidthPx * scale,
        color: layer.color,
        fontSize: layer.fontSizePt * scale,
        fontFamily: layer.fontId,
        textAlign: layer.align === "justified" ? "justify" : layer.align,
        transform: `translate(-50%, -50%) rotate(${layer.geometry.rotationDeg}deg)`,
      }}
    >
      {layer.text}
    </div>
  );
}

function PreviewImageShape({
  layer,
  width,
  height,
  scale,
}: {
  layer: Extract<RuntimeLayer, { type: "image_shape" }>;
  width: number;
  height: number;
  scale: number;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: width, heightPx: height } });
  const panX = layer.cropXRatio * rect.widthPx * 0.25;
  const panY = layer.cropYRatio * rect.heightPx * 0.25;

  return (
    <div
      className="absolute overflow-hidden"
      style={{
        left: rect.xPx * scale,
        top: rect.yPx * scale,
        width: rect.widthPx * scale,
        height: rect.heightPx * scale,
        clipPath: cssShapeClip(layer.shape.type, layer.id),
        transform: `rotate(${layer.geometry.rotationDeg}deg)`,
      }}
    >
      <img
        src={layer.previewUrl}
        alt=""
        className="h-full w-full object-cover"
        style={{
          transform: `translate(${panX * scale}px, ${panY * scale}px) scale(${layer.cropScale})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

function FormField({
  field,
  layer,
  value,
  issue,
  uploading,
  onChange,
  onUpload,
}: {
  field: CustomizationFormField;
  layer: CustomizationLayer;
  value: CustomizationFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  dynamicFonts?: DynamicFontFamily[];
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => void;
}) {
  const imageLayer = layer.type === "image_shape" ? (layer as ImageShapeEditorLayer) : null;
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-on-surface">
        {field.label} {field.required ? <span className="text-destructive">*</span> : null}
      </label>
      {layer.type === "text" ? (
        <TextField field={field} layer={layer} value={value} onChange={onChange} />
      ) : (
        <ImageField layer={imageLayer} value={value} uploading={uploading} onChange={onChange} onUpload={onUpload} />
      )}
      {field.helpText ? <p className="mt-2 text-xs text-on-surface-variant">{field.helpText}</p> : null}
      {issue ? <p className="mt-2 text-xs font-medium text-destructive">{issue}</p> : null}
    </div>
  );
}

function TextField({
  field,
  layer,
  value,
  onChange,
}: {
  field: CustomizationFormField;
  layer: Extract<CustomizationLayer, { type: "text" }>;
  value: CustomizationFieldValue | undefined;
  onChange: (value: TextFieldValue) => void;
}) {
  const textValue = value && "text" in value ? value : { text: "" };
  const pathText = layer.text.path.type !== "straight";

  return (
    <div className="space-y-3">
      <textarea
        rows={pathText ? 1 : layer.text.maxLines}
        value={textValue.text}
        placeholder={field.placeholder}
        onChange={(event) =>
          onChange({
            ...textValue,
            text: pathText ? event.target.value.replace(/\s*\n+\s*/g, " ") : event.target.value,
          })
        }
        className="w-full resize-none rounded-lg border border-outline bg-background px-4 py-3 text-sm outline-none focus:border-primary"
      />
      {layer.text.colorPolicy.mode === "shopper_selectable" ? (
        <select
          value={textValue.color ?? layer.text.colorPolicy.defaultColor}
          onChange={(event) => onChange({ ...textValue, color: event.target.value })}
          className="w-full rounded-lg border border-outline bg-background px-4 py-3 text-sm"
        >
          {layer.text.colorPolicy.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      {layer.text.fontPolicy.mode === "shopper_selectable" ? (
        <select
          value={textValue.fontId ?? layer.text.fontPolicy.defaultFontId}
          onChange={(event) => onChange({ ...textValue, fontId: event.target.value })}
          className="w-full rounded-lg border border-outline bg-background px-4 py-3 text-sm"
        >
          {layer.text.fontPolicy.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

function ImageField({
  layer,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  layer: ImageShapeEditorLayer | null;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  onChange: (value: ImageShapeFieldValue | IconFieldValue | null) => void;
  onUpload: (file: File) => void;
}) {
  const sourcePolicy = layer?.sourcePolicy ?? "upload_only";
  const uploaded = value && typeof value === "object" && "assetId" in value ? value : null;
  const iconValue = value && typeof value === "object" && "source" in value && value.source === "icon" ? value : null;
  const availableIcons = (layer?.allowedIcons ?? []).filter((icon) => {
    if (!icon.active) return false;
    if (layer?.fixedCategory?.id) return icon.categoryId === layer.fixedCategory.id;
    return true;
  });
  const currentSource =
    sourcePolicy === "clipart_category_only" ? "icon" : iconValue ? "icon" : "upload";

  if (sourcePolicy === "fixed_clipart") {
    return null;
  }

  const uploadSection = (
    <div className="space-y-3">
      <label className="block cursor-pointer rounded-lg border border-dashed border-outline bg-surface-container-low px-4 py-5 text-center text-sm font-semibold text-on-surface">
        {uploaded ? <img src={uploaded.previewUrl} alt="" className="mx-auto mb-3 h-24 object-contain" /> : null}
        {uploading ? "Uploading..." : uploaded ? "Replace image" : "Choose PNG or JPEG"}
        <input
          type="file"
          accept="image/png,image/jpeg"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onUpload(file);
            event.target.value = "";
          }}
          className="sr-only"
        />
      </label>
      {uploaded ? (
        <div className="rounded-lg bg-surface-container-low px-4 py-4">
          <Range
            label="Zoom"
            min={1}
            max={4}
            value={uploaded.cropScale ?? 1}
            onChange={(cropScale) => onChange({ ...uploaded, cropScale })}
          />
          <Range
            label="Pan X"
            min={-1}
            max={1}
            value={uploaded.cropXRatio ?? 0}
            onChange={(cropXRatio) => onChange({ ...uploaded, cropXRatio })}
          />
          <Range
            label="Pan Y"
            min={-1}
            max={1}
            value={uploaded.cropYRatio ?? 0}
            onChange={(cropYRatio) => onChange({ ...uploaded, cropYRatio })}
          />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="mt-3 text-xs font-semibold text-destructive"
          >
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );

  const iconSection = (
    <div className="space-y-3">
      {layer?.fixedCategory?.label ? (
        <p className="text-xs text-on-surface-variant">Category: {layer.fixedCategory.label}</p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {availableIcons.map((icon) => {
          const selected = iconValue && "iconAssetId" in iconValue && iconValue.iconAssetId === icon.id;
          return (
            <button
              key={icon.id}
              type="button"
              onClick={() =>
                onChange({
                  source: "icon",
                  iconAssetId: icon.id,
                  iconName: icon.name,
                  sourceAssetId: icon.sourceAssetId,
                  previewUrl: icon.previewUrl,
                  mimeType: icon.mimeType,
                  sourceWidthPx: icon.sourceWidthPx,
                  sourceHeightPx: icon.sourceHeightPx,
                  categoryId: icon.categoryId,
                  categoryLabel: icon.categoryLabel,
                  tags: icon.tags,
                })
              }
              className={`rounded-lg border p-2 ${
                selected ? "border-primary ring-1 ring-primary" : "border-outline"
              }`}
            >
              <img src={icon.previewUrl} alt={icon.name} className="mx-auto h-16 w-16 object-contain" />
              <span className="mt-2 block truncate text-xs">{icon.name}</span>
            </button>
          );
        })}
      </div>
      {iconValue ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-destructive"
        >
          Clear clipart
        </button>
      ) : null}
    </div>
  );

  return (
    <div className="space-y-3">
      {sourcePolicy === "upload_only" ? uploadSection : null}
      {sourcePolicy === "clipart_category_only" ? iconSection : null}
      {sourcePolicy === "upload_or_clipart_category" && layer?.presentation === "source_select" ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (availableIcons[0]) {
                  const icon = availableIcons[0];
                  onChange({
                    source: "icon",
                    iconAssetId: icon.id,
                    iconName: icon.name,
                    sourceAssetId: icon.sourceAssetId,
                    previewUrl: icon.previewUrl,
                    mimeType: icon.mimeType,
                    sourceWidthPx: icon.sourceWidthPx,
                    sourceHeightPx: icon.sourceHeightPx,
                    categoryId: icon.categoryId,
                    categoryLabel: icon.categoryLabel,
                    tags: icon.tags,
                  });
                }
              }}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${currentSource === "icon" ? "border-primary bg-primary text-white" : "border-outline"}`}
            >
              Clipart
            </button>
            <button
              type="button"
              onClick={() => onChange(uploaded ?? null)}
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${currentSource === "upload" ? "border-primary bg-primary text-white" : "border-outline"}`}
            >
              Upload image
            </button>
          </div>
          {currentSource === "icon" ? iconSection : uploadSection}
        </>
      ) : null}
      {sourcePolicy === "upload_or_clipart_category" && layer?.presentation === "side_by_side" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">Clipart</p>
            {iconSection}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-on-surface-variant">Upload image</p>
            {uploadSection}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Range({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="mb-3 block text-xs font-semibold text-on-surface-variant">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-primary"
      />
    </label>
  );
}

function cssShapeClip(shape: string, layerId?: string) {
  if (shape === "circle") return "ellipse(50% 50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") {
    return "polygon(50.00% 0.00%, 62.93% 32.20%, 97.55% 34.55%, 70.92% 56.80%, 79.39% 90.45%, 50.00% 72.00%, 20.61% 90.45%, 29.08% 56.80%, 2.45% 34.55%, 37.07% 32.20%)";
  }
  if (shape === "heart") return "url(#clip-shape-heart)";
  if (shape === "vector" && layerId) return `url(#clip-vector-${layerId})`;
  return "inset(0)";
}

function ShapeClipPaths({ layers }: { layers?: RuntimeLayer[] }) {
  return (
    <svg width="0" height="0" className="absolute pointer-events-none">
      <defs>
        <clipPath id="clip-shape-heart" clipPathUnits="objectBoundingBox">
          <path d="M 0.5 0.85 C 0.1 0.55 0 0.25 0.25 0.12 C 0.4 0 0.5 0.16 0.5 0.28 C 0.5 0.16 0.6 0 0.75 0.12 C 1 0.25 0.9 0.55 0.5 0.85 Z" />
        </clipPath>
        {layers?.map((layer) => {
          if (layer.type === "image_shape" && layer.shape.type === "vector" && layer.shape.vectorPath) {
            return (
              <clipPath key={layer.id} id={`clip-vector-${layer.id}`} clipPathUnits="objectBoundingBox">
                <path d={vectorPointsToSvgPathD(layer.shape.vectorPath.points, layer.shape.vectorPath.closed)} />
              </clipPath>
            );
          }
          return null;
        })}
      </defs>
    </svg>
  );
}
