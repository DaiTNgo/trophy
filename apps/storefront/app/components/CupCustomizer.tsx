import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  createDefaultFormValues,
  fitPreviewIntoBox,
  getCoverImageRect,
  getTextBlockValue,
  getBlockPreviewRect,
  getCropPanFromImagePosition,
  hasRenderablePreview,
  isBlockVisible,
  limitTextBlockValue,
  renderBlockSvg,
  validateCustomizationValues,
  validateDesign,
  type ChoiceBlock,
  type CustomizationBlock,
  type CustomizationFieldValue,
  type CustomizationFormValues,
  type CustomizationTemplate,
  type IconPickerBlock,
  type ImageLayer,
  type ImageUploadBlock,
  type TextMultiBlock,
  type TextSingleBlock,
  type TextBlockValue,
  type TextLayer,
  type UploadedMediaValue,
} from "@trophy/customization";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Group, Image as KonvaImage, Layer, Stage, Text } from "react-konva";

const PREVIEW_BOX_SIZE = 680;
const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

type RenderableBlock = Extract<CustomizationBlock, { preview: unknown }>;

function useHtmlImage(source: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextImage = new Image();
    nextImage.crossOrigin = "anonymous";
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = source;
  }, [source]);

  return image;
}

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

export default function CupCustomizer({
  template: templateProp,
}: {
  template?: CustomizationTemplate;
} = {}) {
  const template = templateProp ?? DEFAULT_TEMPLATE;
  const [values, setValues] = useState<CustomizationFormValues>(() => createDefaultFormValues(template));
  const [uploadingBlockId, setUploadingBlockId] = useState("");
  const [message, setMessage] = useState("");
  const [activeRenderableBlockId, setActiveRenderableBlockId] = useState("");
  const cupImage = useHtmlImage(template.previewUrl);

  const previewSize = useMemo(
    () =>
      fitPreviewIntoBox({
        intrinsicWidthPx: cupImage?.naturalWidth || template.previewWidthPx || PREVIEW_BOX_SIZE,
        intrinsicHeightPx: cupImage?.naturalHeight || template.previewHeightPx || PREVIEW_BOX_SIZE,
        maxWidthPx: PREVIEW_BOX_SIZE,
        maxHeightPx: PREVIEW_BOX_SIZE,
      }),
    [cupImage?.naturalHeight, cupImage?.naturalWidth, template.previewHeightPx, template.previewWidthPx],
  );

  const visibleBlocks = useMemo(
    () =>
      [...template.blocks].sort((a, b) => a.order - b.order).filter((block) => isBlockVisible(block, values)),
    [template.blocks, values],
  );

  const renderableBlocks = useMemo(
    () =>
      template.blocks
        .filter((block) => hasRenderablePreview(block) && isBlockVisible(block, values))
        .sort((a, b) => a.order - b.order),
    [template.blocks, values],
  );

  useEffect(() => {
    setActiveRenderableBlockId((current) =>
      renderableBlocks.some((block) => block.id === current)
        ? current
        : (renderableBlocks[0]?.id ?? ""),
    );
  }, [renderableBlocks]);

  const formValidation = useMemo(
    () => validateCustomizationValues({ template, values }),
    [template, values],
  );
  const design = useMemo(
    () => buildDesignFromForm({ template, values, designId: "storefront_preview" }),
    [template, values],
  );
  const productionValidation = useMemo(
    () => validateDesign({ template, design }),
    [design, template],
  );

  function updateValue(blockId: string, value: CustomizationFieldValue) {
    setValues((current) => ({ ...current, [blockId]: value, design_confirmation: false }));
    setMessage("");
  }

  function updateUploadedCrop(
    blockId: string,
    crop: Pick<UploadedMediaValue, "cropScale" | "cropXRatio" | "cropYRatio">,
  ) {
    setValues((current) => {
      const currentValue = current[blockId];
      if (!currentValue || typeof currentValue !== "object" || !("assetId" in currentValue)) {
        return current;
      }
      return {
        ...current,
        [blockId]: { ...currentValue, ...crop },
        design_confirmation: false,
      };
    });
  }

  async function uploadMedia(
    block: IconPickerBlock | ImageUploadBlock,
    file: File,
  ) {
    const accept = "accept" in block && block.accept ? block.accept : ["image/png", "image/jpeg"];
    const maxBytes = "maxBytes" in block && block.maxBytes ? block.maxBytes : 20 * 1024 * 1024;
    if (!accept.includes(file.type as "image/png" | "image/jpeg")) {
      setMessage("Use a PNG or JPEG production image.");
      return;
    }
    if (file.size > maxBytes) {
      setMessage(`Image exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
      return;
    }

    setUploadingBlockId(block.id);
    setMessage("Uploading production image…");
    try {
      const response = await fetch(`${BACKEND_URL}/api/customizations/assets`, {
        method: "POST",
        headers: { "Content-Type": file.type, "X-Upload-Token": getUploadToken() },
        body: file,
      });
      const payload = (await response.json()) as {
        asset?: {
          id: string;
          widthPx: number;
          heightPx: number;
          contentUrl: string;
        };
        error?: string;
      };
      if (!response.ok || !payload.asset) throw new Error(payload.error ?? "Upload failed.");

      const uploaded: UploadedMediaValue = {
        assetId: payload.asset.id,
        previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
        sourceWidthPx: payload.asset.widthPx,
        sourceHeightPx: payload.asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
      };
      updateValue(block.id, uploaded);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingBlockId("");
    }
  }

  function downloadBlockSvg() {
    if (!activeRenderableBlockId) return;
    const svg = renderBlockSvg({ template, design, blockId: activeRenderableBlockId });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.id}-${activeRenderableBlockId}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const allIssues = [...formValidation.issues, ...productionValidation.issues];

  return (
    <main className="min-h-screen bg-[#f4f1ea] px-4 py-6 text-slate-950 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-col justify-between gap-5 rounded-[32px] bg-[#13231d] p-7 text-white lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-amber-300">
              Trophy Studio
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              Customize your trophy
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/70">
              Complete the form and review the live preview. Each block is fixed by the production
              template.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm">
            Template revision <span className="font-semibold">{template.revision}</span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
          <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-[0_24px_70px_rgba(35,40,36,0.08)]">
            {renderableBlocks.length > 0 ? (
              <div className="mb-5 flex flex-wrap gap-2">
                {renderableBlocks.map((block) => (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setActiveRenderableBlockId(block.id)}
                    className={[
                      "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                      activeRenderableBlockId === block.id
                        ? "bg-[#13231d] text-white"
                        : "bg-stone-100 text-slate-600",
                    ].join(" ")}
                  >
                    {block.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="overflow-hidden rounded-[28px] bg-stone-100">
              <Stage width={previewSize.widthPx} height={previewSize.heightPx} className="mx-auto max-w-full">
                <Layer listening={false}>
                  {cupImage ? (
                    <KonvaImage
                      image={cupImage}
                      width={previewSize.widthPx}
                      height={previewSize.heightPx}
                    />
                  ) : null}
                  {design.layers.map((layer) =>
                    layer.type === "text" ? (
                      <FixedTextLayer
                        key={layer.id}
                        layer={layer}
                        template={template}
                        previewWidthPx={previewSize.widthPx}
                        previewHeightPx={previewSize.heightPx}
                      />
                    ) : (
                      <FixedImageLayer
                        key={layer.id}
                        layer={layer}
                        template={template}
                        previewWidthPx={previewSize.widthPx}
                        previewHeightPx={previewSize.heightPx}
                        editable={Boolean(
                          values[layer.blockId] &&
                            typeof values[layer.blockId] === "object" &&
                            "assetId" in values[layer.blockId],
                        )}
                        onCropChange={(crop) => updateUploadedCrop(layer.blockId, crop)}
                      />
                    ),
                  )}
                </Layer>
              </Stage>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400">
              Preview only · placement is controlled by the production template
            </p>
          </section>

          <aside className="space-y-5">
            <Panel title={template.name} description="Complete the fields below.">
              <div className="space-y-5">
                {visibleBlocks.map((block) => (
                  <BlockField
                    key={block.id}
                    block={block}
                    value={values[block.id]}
                    issue={allIssues.find((issue) => issue.blockId === block.id)?.message}
                    uploading={uploadingBlockId === block.id}
                    onChange={(value) => updateValue(block.id, value)}
                    onUpload={(file) =>
                      block.type === "icon_picker" || block.type === "image_upload"
                        ? uploadMedia(block, file)
                        : Promise.resolve()
                    }
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Production check" description="Review all fields before checkout.">
              <div className="space-y-3 text-sm">
                {renderableBlocks.map((block) => {
                  const invalid = allIssues.some((issue) => issue.blockId === block.id);
                  return <StatusLine key={block.id} label={block.label} ok={!invalid} />;
                })}
              </div>
              {message ? (
                <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{message}</p>
              ) : null}
              <button
                type="button"
                onClick={downloadBlockSvg}
                className="mt-5 w-full rounded-2xl border border-slate-300 px-5 py-4 text-sm font-semibold text-slate-800"
              >
                Download SVG preview
              </button>
              <button
                type="button"
                disabled={!formValidation.valid || !productionValidation.valid}
                className="mt-3 w-full rounded-2xl bg-[#13231d] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue to checkout
              </button>
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function BlockField({
  block,
  value,
  issue,
  uploading,
  onChange,
  onUpload,
}: {
  block: CustomizationBlock;
  value: CustomizationFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <div>
      {block.type !== "checkbox" ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-800">
            {block.label} {block.required ? <span className="text-rose-600">*</span> : null}
          </label>
          {(block.type === "text_single" || block.type === "text_multi") &&
          typeof value === "object" &&
          value !== null &&
          "text" in value ? (
            <span className="text-xs text-slate-400">
              {value.text.length}/{block.maxChars}
            </span>
          ) : null}
        </div>
      ) : null}

      {block.type === "text_single" ? (
        <TextControl block={block} value={value} onChange={onChange} />
      ) : block.type === "text_multi" ? (
        <TextareaControl block={block} value={value} onChange={onChange} />
      ) : block.type === "icon_picker" ? (
        <IconPickerControl block={block} value={value} uploading={uploading} onChange={onChange} onUpload={onUpload} />
      ) : block.type === "image_upload" ? (
        <ImageChoiceControl block={block} value={value} uploading={uploading} onChange={onChange} onUpload={onUpload} />
      ) : block.type === "checkbox" ? (
        <label className="flex cursor-pointer gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
            className="mt-0.5 size-4 accent-[#13231d]"
          />
          <span>
            {block.label} {block.required ? <span className="text-rose-600">*</span> : null}
          </span>
        </label>
      ) : (
        <ChoiceControl block={block} value={value} onChange={onChange} />
      )}

      {block.helpText ? <p className="mt-2 text-xs text-slate-400">{block.helpText}</p> : null}
      {issue ? <p className="mt-2 text-xs font-medium text-rose-700">{issue}</p> : null}
    </div>
  );
}

function TextControl({
  block,
  value,
  onChange,
}: {
  block: TextSingleBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: TextBlockValue) => void;
}) {
  const textValue = getTextBlockValue(block, value);
  return (
    <div className="space-y-3">
      <input
        value={textValue.text}
        maxLength={block.maxChars}
        placeholder={block.placeholder}
        onChange={(event) =>
          onChange({ ...textValue, text: limitTextBlockValue(block, event.target.value) })
        }
        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
      />
      <TextStyleControls block={block} value={textValue} onChange={onChange} />
    </div>
  );
}

function TextareaControl({
  block,
  value,
  onChange,
}: {
  block: TextMultiBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: TextBlockValue) => void;
}) {
  const textValue = getTextBlockValue(block, value);
  return (
    <>
      <textarea
        rows={Math.min(block.maxLines + 1, 6)}
        value={textValue.text}
        maxLength={block.maxChars}
        placeholder={block.placeholder}
        onChange={(event) =>
          onChange({ ...textValue, text: limitTextBlockValue(block, event.target.value) })
        }
        className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
      />
      <TextStyleControls block={block} value={textValue} onChange={onChange} />
      <p className="mt-2 text-xs text-slate-400">Maximum {block.maxLines} lines</p>
    </>
  );
}

function TextStyleControls({
  block,
  value,
  onChange,
}: {
  block: TextSingleBlock | TextMultiBlock;
  value: TextBlockValue;
  onChange: (value: TextBlockValue) => void;
}) {
  if (block.colorMode !== "user_selectable" && block.fontFamilyMode !== "user_selectable") {
    return null;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {block.colorMode === "user_selectable" ? (
        <label className="block text-sm font-medium text-slate-700">
          Text color
          <div className="mt-2 flex flex-wrap gap-2">
            {block.colorOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...value, color: option.value })}
                className={[
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold",
                  value.color === option.value
                    ? "border-amber-500 bg-amber-50 text-amber-900"
                    : "border-stone-200 text-slate-600",
                ].join(" ")}
              >
                {option.swatch ? (
                  <span className="size-4 rounded-full border" style={{ backgroundColor: option.swatch }} />
                ) : null}
                {option.label}
              </button>
            ))}
          </div>
        </label>
      ) : null}

      {block.fontFamilyMode === "user_selectable" ? (
        <label className="block text-sm font-medium text-slate-700">
          Font family
          <select
            value={value.fontId ?? block.fontId}
            onChange={(event) => onChange({ ...value, fontId: event.target.value })}
            className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
          >
            {block.fontFamilyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}

function IconPickerControl({
  block,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  block: IconPickerBlock;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const uploaded = value && typeof value === "object" && "assetId" in value ? value : null;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {block.options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "overflow-hidden rounded-2xl border bg-white text-left transition",
              value === option.id ? "border-amber-500 ring-2 ring-amber-200" : "border-stone-200",
            ].join(" ")}
          >
            <img src={option.previewUrl} alt="" className="h-20 w-full object-contain bg-stone-100" />
            <span className="block px-3 py-2 text-xs font-semibold text-slate-700">
              {option.label}
            </span>
          </button>
        ))}
      </div>
      {block.allowUpload !== false ? (
        <>
          <UploadButton
            uploaded={uploaded}
            uploading={uploading}
            accept={(block.accept ?? ["image/png", "image/jpeg"]).join(",")}
            emptyLabel="Upload custom icon"
            replaceLabel="Replace custom icon"
            onUpload={onUpload}
          />
          {uploaded ? (
            <MediaCropControls
              value={uploaded}
              onChange={(crop) => onChange({ ...uploaded, ...crop })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ImageChoiceControl({
  block,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  block: ImageUploadBlock;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => Promise<void>;
}) {
  const uploaded = value && typeof value === "object" && "assetId" in value ? value : null;
  const hasOptions = (block.options?.length ?? 0) > 0;
  return (
    <div className="space-y-3">
      {hasOptions ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {block.options?.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={[
                "overflow-hidden rounded-2xl border bg-white text-left transition",
                value === option.id ? "border-amber-500 ring-2 ring-amber-200" : "border-stone-200",
              ].join(" ")}
            >
              <img src={option.previewUrl} alt="" className="h-20 w-full object-contain bg-stone-100" />
              <span className="block px-3 py-2 text-xs font-semibold text-slate-700">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}
      {block.allowUpload !== false ? (
        <>
          <UploadButton
            uploaded={uploaded}
            uploading={uploading}
            accept={block.accept.join(",")}
            emptyLabel={hasOptions ? "Upload custom image" : "Choose PNG or JPEG"}
            replaceLabel="Replace custom image"
            onUpload={onUpload}
          />
          {uploaded ? (
            <MediaCropControls
              value={uploaded}
              onChange={(crop) => onChange({ ...uploaded, ...crop })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function UploadButton({
  uploaded,
  uploading,
  accept,
  emptyLabel,
  replaceLabel,
  onUpload,
}: {
  uploaded: UploadedMediaValue | null;
  uploading: boolean;
  accept: string;
  emptyLabel: string;
  replaceLabel: string;
  onUpload: (file: File) => Promise<void>;
}) {
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-stone-50 p-4 text-center text-sm font-semibold text-slate-700">
      {uploaded ? (
        <img src={uploaded.previewUrl} alt="Uploaded artwork" className="mx-auto mb-3 h-24 object-contain" />
      ) : null}
      {uploading ? "Uploading..." : uploaded ? replaceLabel : emptyLabel}
      <input
        type="file"
        accept={accept}
        disabled={uploading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const file = event.target.files?.[0];
          if (file) void onUpload(file);
          event.target.value = "";
        }}
        className="sr-only"
      />
    </label>
  );
}

function MediaCropControls({
  value,
  onChange,
}: {
  value: UploadedMediaValue;
  onChange: (value: UploadedMediaValue) => void;
}) {
  return (
    <div className="rounded-2xl bg-stone-50 p-4">
      <label className="block text-xs font-semibold text-slate-600">
        Image zoom
        <input
          type="range"
          min={1}
          max={4}
          step={0.05}
          value={value.cropScale ?? 1}
          onChange={(event) =>
            onChange({
              ...value,
              cropScale: Number(event.target.value),
              cropXRatio: value.cropXRatio ?? 0,
              cropYRatio: value.cropYRatio ?? 0,
            })
          }
          className="mt-3 w-full accent-[#13231d]"
        />
      </label>
      <p className="mt-2 text-xs text-slate-400">Drag the image on the preview to adjust position.</p>
    </div>
  );
}

function ChoiceControl({
  block,
  value,
  onChange,
}: {
  block: ChoiceBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: string) => void;
}) {
  if (block.type === "select") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
      >
        {block.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {block.options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={[
            "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
            value === option.value
              ? "border-amber-500 bg-amber-50 text-amber-900"
              : "border-stone-200 text-slate-600",
          ].join(" ")}
        >
          {option.swatch ? (
            <span className="size-4 rounded-full border" style={{ backgroundColor: option.swatch }} />
          ) : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FixedTextLayer({
  layer,
  template,
  previewWidthPx,
  previewHeightPx,
}: {
  layer: TextLayer;
  template: CustomizationTemplate;
  previewWidthPx: number;
  previewHeightPx: number;
}) {
  const block = template.blocks.find((entry) => entry.id === layer.blockId);
  if (!block || !hasRenderablePreview(block)) return null;
  const rect = getBlockPreviewRect({ block, previewWidthPx, previewHeightPx });
  const fontSize = Math.max(7, (layer.fontSizePt * rect.widthPx) / block.production.widthMm / 2.2);
  const isMultiLine = block.type === "text_multi";
  return (
    <Text
      x={rect.centerXPx}
      y={rect.centerYPx}
      width={rect.widthPx}
      height={isMultiLine ? rect.heightPx : fontSize * 1.2}
      text={layer.text}
      fontSize={fontSize}
      fontStyle="bold"
      fill={layer.color}
      align={layer.alignment}
      verticalAlign="middle"
      wrap="none"
      lineHeight={1.15}
      offsetX={rect.widthPx / 2}
      offsetY={isMultiLine ? rect.heightPx / 2 : fontSize * 0.6}
      rotation={layer.rotationDeg}
    />
  );
}

function FixedImageLayer({
  layer,
  template,
  previewWidthPx,
  previewHeightPx,
  editable = false,
  onCropChange,
}: {
  layer: ImageLayer;
  template: CustomizationTemplate;
  previewWidthPx: number;
  previewHeightPx: number;
  editable?: boolean;
  onCropChange?: (crop: Pick<UploadedMediaValue, "cropScale" | "cropXRatio" | "cropYRatio">) => void;
}) {
  const image = useHtmlImage(layer.previewUrl);
  const block = template.blocks.find((entry) => entry.id === layer.blockId);
  if (!block || !hasRenderablePreview(block)) return null;
  const rect = getBlockPreviewRect({ block, previewWidthPx, previewHeightPx });
  const cropRect = getCoverImageRect({
    sourceWidthPx: layer.sourceWidthPx,
    sourceHeightPx: layer.sourceHeightPx,
    frameWidthPx: rect.widthPx,
    frameHeightPx: rect.heightPx,
    cropScale: layer.cropScale,
    cropXRatio: layer.cropXRatio,
    cropYRatio: layer.cropYRatio,
  });
  return (
    <Group
      x={rect.centerXPx}
      y={rect.centerYPx}
      rotation={layer.rotationDeg}
      clipX={-rect.widthPx / 2}
      clipY={-rect.heightPx / 2}
      clipWidth={rect.widthPx}
      clipHeight={rect.heightPx}
    >
      <KonvaImage
        image={image ?? undefined}
        x={cropRect.xPx}
        y={cropRect.yPx}
        width={cropRect.widthPx}
        height={cropRect.heightPx}
        draggable={editable}
        listening={editable}
        dragBoundFunc={(position) => {
          const absoluteCenterX = rect.centerXPx;
          const absoluteCenterY = rect.centerYPx;
          const minX = absoluteCenterX - rect.widthPx / 2 - cropRect.overflowXPx;
          const maxX = absoluteCenterX - rect.widthPx / 2;
          const minY = absoluteCenterY - rect.heightPx / 2 - cropRect.overflowYPx;
          const maxY = absoluteCenterY - rect.heightPx / 2;
          return {
            x: cropRect.overflowXPx > 0 ? Math.min(maxX, Math.max(minX, position.x)) : cropRect.xPx + absoluteCenterX,
            y: cropRect.overflowYPx > 0 ? Math.min(maxY, Math.max(minY, position.y)) : cropRect.yPx + absoluteCenterY,
          };
        }}
        onDragEnd={(event) => {
          const pan = getCropPanFromImagePosition({
            imageXPx: event.target.x(),
            imageYPx: event.target.y(),
            frameWidthPx: rect.widthPx,
            frameHeightPx: rect.heightPx,
            imageWidthPx: cropRect.widthPx,
            imageHeightPx: cropRect.heightPx,
          });
          onCropChange?.({
            cropScale: cropRect.cropScale,
            ...pan,
          });
        }}
      />
    </Group>
  );
}

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-black/5 bg-white p-6 shadow-[0_20px_55px_rgba(35,40,36,0.06)]">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function StatusLine({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3">
      <span>{label}</span>
      <span className={ok ? "text-emerald-700" : "text-rose-700"}>{ok ? "Ready" : "Review"}</span>
    </div>
  );
}
