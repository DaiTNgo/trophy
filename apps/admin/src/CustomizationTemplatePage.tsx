import {
  buildDesignFromForm,
  createDefaultFormValues,
  DEFAULT_FONT_FAMILY_OPTIONS,
  DEFAULT_TEXT_COLOR_OPTIONS,
  DEFAULT_TEMPLATE,
  getTextBlockValue,
  isBlockVisible,
  limitTextBlockValue,
  type ChoiceBlock,
  type CustomizationBlock,
  type CustomizationFieldValue,
  type CustomizationFormValues,
  type CustomizationTemplate,
  fitPreviewIntoBox,
  getCoverImageRect,
  getBlockPreviewRect,
  getCropPanFromImagePosition,
  hasRenderablePreview,
  type IconOption,
  type IconPickerBlock,
  type ImageLayer,
  type ImageUploadBlock,
  type PreviewBounds,
  type TextBlockValue,
  type TextLayer,
  type TextMultiBlock,
  type TextSingleBlock,
  type UploadedMediaValue,
  validateCustomizationValues,
  validateDesign,
} from "@trophy/customization";
import Konva from "konva";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Stage, Text, Transformer } from "react-konva";
import { Link, useSearchParams } from "react-router";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
const PREVIEW_BOX_SIZE = 680;

type RenderableBlock = Extract<CustomizationBlock, { preview: unknown }>;

function useHtmlImage(source: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = source;
  }, [source]);

  return image;
}

function numberValue(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

function isUploadedMediaValue(value: CustomizationFieldValue | undefined): value is UploadedMediaValue {
  return Boolean(value && typeof value === "object" && "assetId" in value);
}

export default function CustomizationTemplatePage() {
  const [searchParams] = useSearchParams();
  const edit = searchParams.get("edit");
  const [template, setTemplate] = useState<CustomizationTemplate>(DEFAULT_TEMPLATE);
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [previewSelectedBlockId, setPreviewSelectedBlockId] = useState("");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [previewValues, setPreviewValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(DEFAULT_TEMPLATE),
  );
  const [uploadingPreviewBlockId, setUploadingPreviewBlockId] = useState("");
  const [flash, setFlash] = useState("");
  const previewImage = useHtmlImage(template.previewUrl);

  const previewSize = useMemo(
    () =>
      fitPreviewIntoBox({
        intrinsicWidthPx: previewImage?.naturalWidth || template.previewWidthPx || PREVIEW_BOX_SIZE,
        intrinsicHeightPx:
          previewImage?.naturalHeight || template.previewHeightPx || PREVIEW_BOX_SIZE,
        maxWidthPx: PREVIEW_BOX_SIZE,
        maxHeightPx: PREVIEW_BOX_SIZE,
      }),
    [previewImage?.naturalHeight, previewImage?.naturalWidth, template.previewHeightPx, template.previewWidthPx],
  );

  const renderableBlocks = useMemo(
    () =>
      template.blocks
        .filter(hasRenderablePreview)
        .sort((a, b) => a.order - b.order),
    [template.blocks],
  );

  const visiblePreviewBlocks = useMemo(
    () =>
      [...template.blocks]
        .sort((a, b) => a.order - b.order)
        .filter((block) => isBlockVisible(block, previewValues)),
    [template.blocks, previewValues],
  );

  const previewRenderableBlocks = useMemo(
    () =>
      template.blocks
        .filter(
          (block): block is RenderableBlock =>
            hasRenderablePreview(block) && isBlockVisible(block, previewValues),
        )
        .sort((a, b) => a.order - b.order),
    [template.blocks, previewValues],
  );

  const previewDesign = useMemo(
    () => buildDesignFromForm({ template, values: previewValues, designId: "admin_preview" }),
    [template, previewValues],
  );

  const previewFormValidation = useMemo(
    () => validateCustomizationValues({ template, values: previewValues }),
    [template, previewValues],
  );

  const previewProductionValidation = useMemo(
    () => validateDesign({ template, design: previewDesign }),
    [template, previewDesign],
  );

  useEffect(() => {
    setSelectedBlockId((current) =>
      template.blocks.some((block) => block.id === current)
        ? current
        : (template.blocks[0]?.id ?? ""),
    );
  }, [template.blocks]);

  useEffect(() => {
    const editParam = edit ?? "";
    if (!editParam || editParam === "new") return;
    let active = true;

    async function loadTemplate() {
      try {
        const isTemplateId = editParam.includes("-");
        const url = isTemplateId
          ? `${BACKEND_URL}/api/customizations/templates/${editParam}`
          : `${BACKEND_URL}/api/customizations/templates/product/${editParam}`;
        const response = await fetch(url);
        if (!response.ok) {
          setFlash("Template not found.");
          return;
        }
        const data = await response.json();
        if (active) {
          setTemplate(data.template);
          setSelectedBlockId(data.template.blocks[0]?.id ?? "");
          setPreviewValues(createDefaultFormValues(data.template));
        }
      } catch {
        if (active) setFlash("Failed to load template.");
      }
    }

    void loadTemplate();
    return () => {
      active = false;
    };
  }, [edit]);

  const selectedBlock = template.blocks.find((block) => block.id === selectedBlockId) ?? null;

  useEffect(() => {
    if (mode === "preview") {
      setPreviewValues(createDefaultFormValues(template));
    }
  }, [mode, template]);

  function updateBlock(
    blockId: string,
    updater: (block: CustomizationBlock) => CustomizationBlock,
  ) {
    setTemplate((current) => ({
      ...current,
      status: "draft",
      blocks: current.blocks.map((block) => (block.id === blockId ? updater(block) : block)),
    }));
  }

  function findDependentBlocks(blockId: string) {
    return template.blocks.filter((block) => block.visibleWhen?.blockId === blockId);
  }

  function updatePreviewValue(blockId: string, value: CustomizationFieldValue) {
    setPreviewValues((current) => ({ ...current, [blockId]: value, design_confirmation: false }));
  }

  function updatePreviewUploadedCrop(
    blockId: string,
    crop: Pick<UploadedMediaValue, "cropScale" | "cropXRatio" | "cropYRatio">,
  ) {
    setPreviewValues((current) => {
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

  async function uploadCustomizationAsset({
    file,
    accept,
    maxBytes,
  }: {
    file: File;
    accept: Array<"image/png" | "image/jpeg">;
    maxBytes: number;
  }) {
    if (!accept.includes(file.type as "image/png" | "image/jpeg")) {
      setFlash("Use a PNG or JPEG production image.");
      return null;
    }
    if (file.size > maxBytes) {
      setFlash(`Image exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB limit.`);
      return null;
    }

    const response = await fetch(`${BACKEND_URL}/api/customizations/assets`, {
      method: "POST",
      headers: { "Content-Type": file.type, "X-Upload-Token": getUploadToken() },
      body: file,
    });
    const payload = (await response.json()) as {
      asset?: { id: string; widthPx: number; heightPx: number; contentUrl: string };
      error?: string;
    };
    if (!response.ok || !payload.asset) throw new Error(payload.error ?? "Upload failed.");

    return {
      assetId: payload.asset.id,
      previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
      sourceWidthPx: payload.asset.widthPx,
      sourceHeightPx: payload.asset.heightPx,
      cropScale: 1,
      cropXRatio: 0,
      cropYRatio: 0,
    } satisfies UploadedMediaValue;
  }

  async function uploadPreviewImage(block: ImageUploadBlock, file: File) {
    setUploadingPreviewBlockId(block.id);
    try {
      const uploaded = await uploadCustomizationAsset({
        file,
        accept: block.accept,
        maxBytes: block.maxBytes,
      });
      if (!uploaded) return;
      updatePreviewValue(block.id, uploaded);
      setFlash("");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingPreviewBlockId("");
    }
  }

  async function uploadPreviewIcon(block: IconPickerBlock, file: File) {
    setUploadingPreviewBlockId(block.id);
    try {
      const uploaded = await uploadCustomizationAsset({
        file,
        accept: block.accept ?? ["image/png", "image/jpeg"],
        maxBytes: block.maxBytes ?? 20 * 1024 * 1024,
      });
      if (!uploaded) return;
      updatePreviewValue(block.id, uploaded);
      setFlash("");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingPreviewBlockId("");
    }
  }

  function loadPreview(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      const image = new Image();
      image.onload = () => {
        setTemplate((current) => ({
          ...current,
          previewUrl: reader.result as string,
          previewWidthPx: image.naturalWidth,
          previewHeightPx: image.naturalHeight,
          status: "draft",
        }));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  const saveToServer = useCallback(async () => {
    const response = await fetch(`${BACKEND_URL}/api/customizations/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: Number(template.productId),
        name: template.name,
        previewUrl: template.previewUrl,
        previewWidthPx: template.previewWidthPx,
        previewHeightPx: template.previewHeightPx,
        blocks: template.blocks,
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.template as CustomizationTemplate;
  }, [template]);

  async function handleSaveDraft() {
    const serverTemplate = await saveToServer();
    if (!serverTemplate) {
      setFlash("Failed to save template.");
      return;
    }
    setTemplate(serverTemplate);
    setFlash("Draft saved.");
  }

  async function handlePublish() {
    const serverTemplate = await saveToServer();
    if (!serverTemplate) {
      setFlash("Failed to save before publishing.");
      return;
    }
    setTemplate(serverTemplate);

    const publishResponse = await fetch(
      `${BACKEND_URL}/api/customizations/templates/${serverTemplate.id}/publish`,
      { method: "POST" },
    );
    if (!publishResponse.ok) {
      setFlash("Failed to publish revision.");
      return;
    }
    setFlash("Template revision published.");
  }

  return (
    <section className="space-y-6">
      <header className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Customization
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Cup production template
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Add custom blocks, place them on the preview, and switch to preview mode to test the
              draft without leaving admin.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-stone-300 bg-white p-1">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  mode === "edit" ? "bg-slate-950 text-white" : "text-slate-700",
                ].join(" ")}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold",
                  mode === "preview" ? "bg-slate-950 text-white" : "text-slate-700",
                ].join(" ")}
              >
                Preview
              </button>
            </div>
            <Link
              to="/customization-templates"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Back to list
            </Link>
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => void handlePublish()}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
            >
              Publish revision
            </button>
          </div>
        </div>
      </header>

      {flash ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,0.75fr)]">
        <div className="rounded-[32px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {mode === "edit" ? "Preview placement" : "Draft preview"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {mode === "edit"
                  ? "Move and resize each custom block directly on the uploaded preview."
                  : "Simulate the shopper experience against the current draft template."}
              </p>
            </div>
            {mode === "edit" ? (
              <label className="cursor-pointer rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700">
                Upload cup image
                <input type="file" accept="image/*" onChange={loadPreview} className="sr-only" />
              </label>
            ) : (
              <button
                type="button"
                onClick={() => setPreviewValues(createDefaultFormValues(template))}
                className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Reset test data
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-stone-100">
            <Stage
              width={previewSize.widthPx}
              height={previewSize.heightPx}
              className="mx-auto max-w-full"
              onClick={() => setPreviewSelectedBlockId("")}
              onTap={() => setPreviewSelectedBlockId("")}
            >
              <Layer>
                {previewImage ? (
                  <KonvaImage
                    image={previewImage}
                    width={previewSize.widthPx}
                    height={previewSize.heightPx}
                  />
                ) : null}
                {mode === "edit"
                  ? renderableBlocks.map((block) => (
                      <EditableBlock
                        key={block.id}
                        block={block}
                        previewWidthPx={previewSize.widthPx}
                        previewHeightPx={previewSize.heightPx}
                        selected={block.id === selectedBlockId}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onChange={(nextBlock) => updateBlock(block.id, () => nextBlock)}
                      />
                    ))
                  : previewDesign.layers.map((layer) =>
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
                          editable={isUploadedMediaValue(previewValues[layer.blockId])}
                          selected={previewSelectedBlockId === layer.blockId}
                          onSelect={() => setPreviewSelectedBlockId(layer.blockId)}
                          onCropChange={(crop) => updatePreviewUploadedCrop(layer.blockId, crop)}
                        />
                      ),
                    )}
              </Layer>
            </Stage>
          </div>
        </div>

        <aside className="space-y-6">
          {mode === "edit" ? (
            <>
              <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
                <p className="font-semibold text-slate-900">Template</p>
                <div className="mt-5 space-y-4">
                  <Field
                    label="Template name"
                    value={template.name}
                    onChange={(value) =>
                      setTemplate((current) => ({ ...current, name: value, status: "draft" }))
                    }
                  />
                  <ProductSelector
                    value={template.productId}
                    onChange={(productId) =>
                      setTemplate((current) => ({ ...current, productId, status: "draft" }))
                    }
                  />
                  <div className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-600">
                    Revision {template.revision} · {template.status}
                  </div>
                </div>
              </div>

              <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
                <BlockEditor
                  blocks={template.blocks}
                  selectedId={selectedBlockId}
                  onSelect={setSelectedBlockId}
                  onChange={(blocks) =>
                    setTemplate((current) => ({ ...current, blocks, status: "draft" }))
                  }
                />
              </div>

              {selectedBlock ? (
                <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
                  <p className="font-semibold text-slate-900">Block settings</p>
                  <div className="mt-5 space-y-4">
                    <Field
                      label="Field label"
                      value={selectedBlock.label}
                      onChange={(label) =>
                        updateBlock(selectedBlock.id, (block) => ({ ...block, label }))
                      }
                    />
                    <Field
                      label="Help text"
                      value={selectedBlock.helpText ?? ""}
                      onChange={(helpText) =>
                        updateBlock(selectedBlock.id, (block) => ({ ...block, helpText }))
                      }
                    />
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedBlock.required}
                        onChange={(event) =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            required: event.target.checked,
                          }))
                        }
                      />
                      Required field
                    </label>
                    <ConditionEditor
                      block={selectedBlock}
                      blocks={template.blocks}
                      onChange={(visibleWhen) =>
                        updateBlock(selectedBlock.id, (block) => ({ ...block, visibleWhen }))
                      }
                    />

                    {selectedBlock.type === "text_single" || selectedBlock.type === "text_multi" ? (
                      <TextBlockSettings
                        block={selectedBlock}
                        onChange={(block) => updateBlock(selectedBlock.id, () => block)}
                      />
                    ) : null}

                    {selectedBlock.type === "icon_picker" ? (
                      <IconPickerSettings
                        block={selectedBlock}
                        onChange={(block) => updateBlock(selectedBlock.id, () => block)}
                      />
                    ) : null}

                    {selectedBlock.type === "image_upload" ? (
                      <ImageUploadSettings
                        block={selectedBlock}
                        onChange={(block) => updateBlock(selectedBlock.id, () => block)}
                      />
                    ) : null}

                    {(selectedBlock.type === "select" ||
                      selectedBlock.type === "radio" ||
                      selectedBlock.type === "color") ? (
                      <ChoiceSettings
                        block={selectedBlock}
                        onChange={(block) => updateBlock(selectedBlock.id, () => block)}
                      />
                    ) : null}
                    <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          updateBlock(selectedBlock.id, (block) => ({
                            ...block,
                            hidden: !block.hidden,
                          }))
                        }
                        className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
                      >
                        {selectedBlock.hidden ? "Unhide block" : "Hide block"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const dependents = findDependentBlocks(selectedBlock.id);
                          if (dependents.length > 0) {
                            setFlash(
                              `Delete blocked. Update dependent blocks first: ${dependents
                                .map((block) => block.label)
                                .join(", ")}.`,
                            );
                            return;
                          }
                          if (!window.confirm(`Delete "${selectedBlock.label}" permanently?`))
                            return;
                          setTemplate((current) => ({
                            ...current,
                            status: "draft",
                            blocks: current.blocks.filter((block) => block.id !== selectedBlock.id),
                          }));
                          setFlash(`Deleted block "${selectedBlock.label}".`);
                        }}
                        className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
                      >
                        Delete block
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <AdminPreviewPanel
              visibleBlocks={visiblePreviewBlocks}
              renderableBlocks={previewRenderableBlocks}
              values={previewValues}
              uploadingBlockId={uploadingPreviewBlockId}
              formIssues={[
                ...previewFormValidation.issues,
                ...previewProductionValidation.issues,
              ]}
              onChange={updatePreviewValue}
              onUpload={(file, block) => uploadPreviewImage(block, file)}
              onIconUpload={(file, block) => uploadPreviewIcon(block, file)}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

function AdminPreviewPanel({
  visibleBlocks,
  renderableBlocks,
  values,
  uploadingBlockId,
  formIssues,
  onChange,
  onUpload,
  onIconUpload,
}: {
  visibleBlocks: CustomizationBlock[];
  renderableBlocks: RenderableBlock[];
  values: CustomizationFormValues;
  uploadingBlockId: string;
  formIssues: Array<{ blockId: string; message: string }>;
  onChange: (blockId: string, value: CustomizationFieldValue) => void;
  onUpload: (file: File, block: ImageUploadBlock) => Promise<void>;
  onIconUpload: (file: File, block: IconPickerBlock) => Promise<void>;
}) {
  return (
    <div className="rounded-[32px] border border-stone-200 bg-white p-6 shadow-sm">
      <p className="font-semibold text-slate-900">Preview mode</p>
      <p className="mt-1 text-sm text-slate-500">
        Test the current draft as a shopper without publishing it.
      </p>
      <div className="mt-5 space-y-5">
        {visibleBlocks.length === 0 ? (
          <div className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-500">
            No shopper-previewable blocks yet.
          </div>
        ) : (
          visibleBlocks.map((block) => (
            <PreviewBlockField
              key={block.id}
              block={block}
              value={values[block.id]}
              issue={formIssues.find((issue) => issue.blockId === block.id)?.message}
              uploading={uploadingBlockId === block.id}
              onChange={(value) => onChange(block.id, value)}
              onUpload={(file) =>
                block.type === "image_upload" ? onUpload(file, block) : Promise.resolve()
              }
              onIconUpload={(file) =>
                block.type === "icon_picker"
                  ? onIconUpload(file, block)
                  : Promise.resolve()
              }
            />
          ))
        )}

        <div className="rounded-2xl bg-stone-50 p-4 text-sm text-slate-600">
          Renderable blocks in preview: {renderableBlocks.length}
        </div>
      </div>
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
      listening={false}
    />
  );
}

function FixedImageLayer({
  layer,
  template,
  previewWidthPx,
  previewHeightPx,
  editable = false,
  selected = false,
  onSelect,
  onCropChange,
}: {
  layer: ImageLayer;
  template: CustomizationTemplate;
  previewWidthPx: number;
  previewHeightPx: number;
  editable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onCropChange?: (crop: Pick<UploadedMediaValue, "cropScale" | "cropXRatio" | "cropYRatio">) => void;
}) {
  const image = useHtmlImage(layer.previewUrl);
  const block = template.blocks.find((entry) => entry.id === layer.blockId);
  const overlayRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
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

  useEffect(() => {
    if (selected && overlayRef.current && transformerRef.current) {
      transformerRef.current.nodes([overlayRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  return (
    <>
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
      {editable ? (
        <>
          <Rect
            ref={overlayRef}
            x={rect.centerXPx - rect.widthPx / 2}
            y={rect.centerYPx - rect.heightPx / 2}
            width={rect.widthPx}
            height={rect.heightPx}
            fill="transparent"
            stroke={selected ? "#0f766e" : undefined}
            strokeWidth={selected ? 2 : undefined}
            dash={selected ? [4, 4] : undefined}
            onClick={(e) => {
              onSelect?.();
              e.cancelBubble = true;
            }}
            onTap={(e) => {
              onSelect?.();
              e.cancelBubble = true;
            }}
          />
          {selected ? (
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              keepRatio={true}
              boundBoxFunc={(oldBox, newBox) => {
                const s = (layer.cropScale ?? 1) * (newBox.width / rect.widthPx);
                return s >= 1 && s <= 4 ? newBox : oldBox;
              }}
              onTransformEnd={() => {
                const node = overlayRef.current;
                if (!node) return;
                const scale = node.scaleX();
                node.scaleX(1);
                node.scaleY(1);
                const newCropScale = Math.max(1, (layer.cropScale ?? 1) * scale);
                onCropChange?.({
                  cropScale: Math.min(4, newCropScale),
                  cropXRatio: layer.cropXRatio ?? 0,
                  cropYRatio: layer.cropYRatio ?? 0,
                });
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}

function PreviewBlockField({
  block,
  value,
  issue,
  uploading,
  onChange,
  onUpload,
  onIconUpload,
}: {
  block: CustomizationBlock;
  value: CustomizationFieldValue | undefined;
  issue?: string;
  uploading: boolean;
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => Promise<void>;
  onIconUpload: (file: File) => Promise<void>;
}) {
  return (
    <div>
      {block.type !== "checkbox" ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-slate-800">
            {block.label} {block.required ? <span className="text-rose-600">*</span> : null}
          </label>
          {(block.type === "text_single" || block.type === "text_multi") ? (
            <span className="text-xs text-slate-400">
              {getTextBlockValue(block, value).text.length}/{block.maxChars}
            </span>
          ) : null}
        </div>
      ) : null}

      {block.type === "text_single" ? (
        <PreviewTextControl block={block} value={value} onChange={onChange} />
      ) : block.type === "text_multi" ? (
        <PreviewTextareaControl block={block} value={value} onChange={onChange} />
      ) : block.type === "icon_picker" ? (
        <PreviewIconPickerControl
          block={block}
          value={value}
          uploading={uploading}
          onChange={onChange}
          onUpload={onIconUpload}
        />
      ) : block.type === "image_upload" ? (
        <PreviewImageChoiceControl
          block={block}
          value={value}
          uploading={uploading}
          onChange={onChange}
          onUpload={onUpload}
        />
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
        <PreviewChoiceControl block={block} value={value} onChange={onChange} />
      )}

      {block.helpText ? <p className="mt-2 text-xs text-slate-400">{block.helpText}</p> : null}
      {issue ? <p className="mt-2 text-xs font-medium text-rose-700">{issue}</p> : null}
    </div>
  );
}

function PreviewTextControl({
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
      <PreviewTextStyleControls block={block} value={textValue} onChange={onChange} />
    </div>
  );
}

function PreviewTextareaControl({
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
      <PreviewTextStyleControls block={block} value={textValue} onChange={onChange} />
      <p className="mt-2 text-xs text-slate-400">Maximum {block.maxLines} lines</p>
    </>
  );
}

function PreviewTextStyleControls({
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

function PreviewIconPickerControl({
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
      <div className="grid grid-cols-2 gap-3">
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
          <PreviewUploadButton
            uploaded={uploaded}
            uploading={uploading}
            accept={(block.accept ?? ["image/png", "image/jpeg"]).join(",")}
            emptyLabel="Upload custom icon"
            replaceLabel="Replace custom icon"
            onUpload={onUpload}
          />
          {uploaded ? (
            <p className="text-xs text-slate-400">Click the icon on the preview, then drag corners to resize. Drag the icon itself to adjust position.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PreviewImageChoiceControl({
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
        <div className="grid grid-cols-2 gap-3">
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
          <PreviewUploadButton
            uploaded={uploaded}
            uploading={uploading}
            accept={block.accept.join(",")}
            emptyLabel={hasOptions ? "Upload custom image" : "Choose PNG or JPEG"}
            replaceLabel="Replace custom image"
            onUpload={onUpload}
          />
          {uploaded ? (
            <p className="text-xs text-slate-400">Click the image on the preview, then drag corners to resize. Drag the image itself to adjust position.</p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PreviewUploadButton({
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

function PreviewChoiceControl({
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

function EditableBlock({
  block,
  previewWidthPx,
  previewHeightPx,
  selected,
  onSelect,
  onChange,
}: {
  block: RenderableBlock;
  previewWidthPx: number;
  previewHeightPx: number;
  selected: boolean;
  onSelect: () => void;
  onChange: (block: RenderableBlock) => void;
}) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (selected && shapeRef.current && transformerRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [selected]);

  const rect = getBlockPreviewRect({ block, previewWidthPx, previewHeightPx });

  return (
    <>
      <Rect
        ref={shapeRef}
        x={rect.xPx}
        y={rect.yPx}
        width={rect.widthPx}
        height={rect.heightPx}
        rotation={rect.rotationDeg}
        stroke={selected ? "#0f766e" : "#14b8a6"}
        strokeWidth={selected ? 3 : 2}
        dash={[6, 4]}
        fill="rgba(20,184,166,0.08)"
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(event) =>
          onChange({
            ...block,
            preview: {
              ...block.preview,
              xRatio: (event.target.x() + rect.widthPx / 2) / previewWidthPx,
              yRatio: (event.target.y() + rect.heightPx / 2) / previewHeightPx,
            },
          })
        }
        onTransformEnd={() => {
          const node = shapeRef.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          const widthPx = Math.max(18, node.width() * scaleX);
          const heightPx = Math.max(18, node.height() * scaleY);
          node.scaleX(1);
          node.scaleY(1);
          onChange({
            ...block,
            preview: {
              ...block.preview,
              xRatio: (node.x() + widthPx / 2) / previewWidthPx,
              yRatio: (node.y() + heightPx / 2) / previewHeightPx,
              widthRatio: widthPx / previewWidthPx,
              heightRatio: heightPx / previewHeightPx,
              rotationDeg: block.preview.rotationDeg,
            },
          });
        }}
      />
      <Text
        x={rect.xPx}
        y={rect.yPx - 18}
        text={block.label}
        fontSize={12}
        fill="#115e59"
        listening={false}
      />
      {selected ? (
        <Transformer
          ref={transformerRef}
          flipEnabled={false}
          rotateEnabled={false}
          boundBoxFunc={(oldBox, nextBox) =>
            nextBox.width < 18 || nextBox.height < 18 ? oldBox : nextBox
          }
        />
      ) : null}
    </>
  );
}

function createPreview(order: number): PreviewBounds {
  return {
    xRatio: 0.5,
    yRatio: 0.5,
    widthRatio: 0.25,
    heightRatio: 0.1,
    rotationDeg: 0,
    zIndex: order,
  };
}

function createBlock(type: CustomizationBlock["type"], order: number): CustomizationBlock {
  const id = `block_${crypto.randomUUID()}`;
  const preview = createPreview(order);
  const production = {
    widthMm: 40,
    heightMm: 20,
    safeMarginMm: 2,
    bleedMm: 1,
    method: "engrave" as const,
    colorMode: "monochrome" as const,
    minImageDpi: 300,
  };
  const common = { id, label: "New field", helpText: "", hidden: false, required: false, order };

  if (type === "text_single") {
    return {
      ...common,
      type,
      defaultValue: "",
      maxChars: 30,
      fontId: "sans-bold",
      minFontSizePt: 8,
      maxFontSizePt: 20,
      color: "#111111",
      alignment: "center",
      uppercase: true,
      colorMode: "fixed",
      colorOptions: DEFAULT_TEXT_COLOR_OPTIONS,
      fontFamilyMode: "fixed",
      fontFamilyOptions: DEFAULT_FONT_FAMILY_OPTIONS,
      preview,
      production,
    };
  }

  if (type === "text_multi") {
    return {
      ...common,
      type,
      defaultValue: "",
      maxChars: 60,
      maxLines: 3,
      fontId: "sans-bold",
      minFontSizePt: 8,
      maxFontSizePt: 20,
      color: "#111111",
      alignment: "center",
      colorMode: "fixed",
      colorOptions: DEFAULT_TEXT_COLOR_OPTIONS,
      fontFamilyMode: "fixed",
      fontFamilyOptions: DEFAULT_FONT_FAMILY_OPTIONS,
      preview,
      production,
    };
  }

  if (type === "icon_picker") {
    return {
      ...common,
      type,
      defaultOptionId: "none",
      allowNone: true,
      allowUpload: true,
      accept: ["image/png", "image/jpeg"],
      maxBytes: 20 * 1024 * 1024,
      fit: "contain",
      preview,
      production,
      options: [
        {
          id: "none",
          label: "None",
          previewUrl:
            "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'/%3E",
          productionAssetId: "preset_none_v1",
          sourceWidthPx: 100,
          sourceHeightPx: 100,
        },
      ],
    };
  }

  if (type === "image_upload") {
    return {
      ...common,
      type,
      defaultOptionId: "",
      allowUpload: true,
      options: [],
      accept: ["image/png", "image/jpeg"],
      maxBytes: 20 * 1024 * 1024,
      minDpi: 300,
      fit: "contain",
      monochromePreview: true,
      productionMode: "monochrome",
      requireArtworkRights: true,
      preview,
      production,
    };
  }

  if (type === "checkbox") {
    return { ...common, type, defaultValue: false };
  }

  return {
    ...common,
    type,
    defaultValue: "option-1",
    options: [{ value: "option-1", label: "Option 1" }],
  };
}

function BlockEditor({
  blocks,
  selectedId,
  onSelect,
  onChange,
}: {
  blocks: CustomizationBlock[];
  selectedId: string;
  onSelect: (blockId: string) => void;
  onChange: (blocks: CustomizationBlock[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Custom blocks</p>
          <p className="mt-1 text-xs text-slate-500">Each block is one shopper-customizable area.</p>
        </div>
        <select
          value=""
          onChange={(event) => {
            if (!event.target.value) return;
            const block = createBlock(event.target.value as CustomizationBlock["type"], blocks.length + 1);
            onChange([...blocks, block]);
            onSelect(block.id);
          }}
          className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-semibold"
        >
          <option value="">+ Add block</option>
          <option value="text_single">Single-line text</option>
          <option value="text_multi">Multi-line text</option>
          <option value="icon_picker">Icon picker</option>
          <option value="image_upload">Artwork upload</option>
          <option value="radio">Radio options</option>
          <option value="color">Color options</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {blocks.map((block) => (
          <button
            key={block.id}
            type="button"
            onClick={() => onSelect(block.id)}
            className={[
              "rounded-full border px-3 py-2 text-xs font-semibold",
              selectedId === block.id
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-stone-200 text-slate-600",
            ].join(" ")}
          >
            {block.label} · {block.type}
            {block.hidden ? " · Hidden" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function TextBlockSettings({
  block,
  onChange,
}: {
  block: TextSingleBlock | TextMultiBlock;
  onChange: (block: TextSingleBlock | TextMultiBlock) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max characters"
          value={block.maxChars}
          onChange={(maxChars) => onChange({ ...block, maxChars: Math.max(1, Math.round(maxChars)) })}
        />
        {block.type === "text_multi" ? (
          <NumberField
            label="Max lines"
            value={block.maxLines}
            onChange={(maxLines) => onChange({ ...block, maxLines: Math.max(1, Math.round(maxLines)) })}
          />
        ) : (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={block.uppercase}
              onChange={(event) => onChange({ ...block, uppercase: event.target.checked })}
            />
            Uppercase
          </label>
        )}
      </div>
      <Field
        label="Default value"
        value={block.defaultValue}
        onChange={(defaultValue) => onChange({ ...block, defaultValue })}
      />
      <TextStyleSettings block={block} onChange={onChange} />
    </>
  );
}

function IconPickerSettings({
  block,
  onChange,
}: {
  block: IconPickerBlock;
  onChange: (block: IconPickerBlock) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max upload size (MB)"
          value={Math.round((block.maxBytes ?? 20 * 1024 * 1024) / 1024 / 1024)}
          onChange={(megabytes) =>
            onChange({ ...block, maxBytes: Math.max(1, Math.round(megabytes)) * 1024 * 1024 })
          }
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={block.allowUpload !== false}
            onChange={(event) => onChange({ ...block, allowUpload: event.target.checked })}
          />
          Allow shopper upload
        </label>
      </div>
      <MediaOptionEditor
        title="Preset icons"
        blockId={block.id}
        defaultOptionId={block.defaultOptionId}
        options={block.options}
        onDefaultChange={(defaultOptionId) => onChange({ ...block, defaultOptionId })}
        onChange={(options) => onChange({ ...block, options })}
      />
    </div>
  );
}

function ImageUploadSettings({
  block,
  onChange,
}: {
  block: ImageUploadBlock;
  onChange: (block: ImageUploadBlock) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Max size (MB)"
          value={Math.round(block.maxBytes / 1024 / 1024)}
          onChange={(megabytes) =>
            onChange({ ...block, maxBytes: Math.max(1, Math.round(megabytes)) * 1024 * 1024 })
          }
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={block.allowUpload !== false}
            onChange={(event) => onChange({ ...block, allowUpload: event.target.checked })}
          />
          Allow shopper upload
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={block.monochromePreview}
            onChange={(event) => onChange({ ...block, monochromePreview: event.target.checked })}
          />
          Monochrome preview
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={block.requireArtworkRights}
            onChange={(event) => onChange({ ...block, requireArtworkRights: event.target.checked })}
          />
          Require artwork rights
        </label>
      </div>
      <MediaOptionEditor
        title="Preset images"
        blockId={block.id}
        defaultOptionId={block.defaultOptionId ?? ""}
        options={block.options ?? []}
        onDefaultChange={(defaultOptionId) => onChange({ ...block, defaultOptionId })}
        onChange={(options) => onChange({ ...block, options })}
      />
    </div>
  );
}

function MediaOptionEditor({
  title,
  blockId,
  defaultOptionId,
  options,
  onDefaultChange,
  onChange,
}: {
  title: string;
  blockId: string;
  defaultOptionId: string;
  options: IconOption[];
  onDefaultChange: (optionId: string) => void;
  onChange: (options: IconOption[]) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <button
          type="button"
          onClick={() => {
            const id = `option_${crypto.randomUUID()}`;
            onChange([
              ...options,
              {
                id,
                label: `Option ${options.length + 1}`,
                category: "",
                previewUrl: "",
                productionAssetId: `pending_${id}`,
                sourceWidthPx: 1200,
                sourceHeightPx: 1200,
              },
            ]);
          }}
          className="text-xs font-semibold text-amber-800"
        >
          + Add option
        </button>
      </div>
      <div className="mt-3 space-y-3">
        {options.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 p-3 text-xs text-slate-500">
            No preset options yet.
          </div>
        ) : null}
        {options.map((option) => (
          <div key={option.id} className="rounded-xl border border-stone-200 bg-white p-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="radio"
                name={`${blockId}-default`}
                checked={defaultOptionId === option.id}
                onChange={() => onDefaultChange(option.id)}
              />
              Default option
            </label>
            <div className="mt-2 space-y-2">
              <Field
                label="Option label"
                value={option.label}
                onChange={(label) =>
                  onChange(options.map((entry) => (entry.id === option.id ? { ...entry, label } : entry)))
                }
              />
              <Field
                label="Category"
                value={option.category ?? ""}
                onChange={(category) =>
                  onChange(options.map((entry) => (entry.id === option.id ? { ...entry, category } : entry)))
                }
              />
              <Field
                label="Preview/asset URL"
                value={option.previewUrl}
                onChange={(previewUrl) =>
                  onChange(
                    options.map((entry) =>
                      entry.id === option.id
                        ? { ...entry, previewUrl, productionAssetId: previewUrl || entry.productionAssetId }
                        : entry,
                    ),
                  )
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChoiceSettings({
  block,
  onChange,
}: {
  block: ChoiceBlock;
  onChange: (block: ChoiceBlock) => void;
}) {
  return (
    <>
      <Field
        label="Default value"
        value={block.defaultValue}
        onChange={(defaultValue) => onChange({ ...block, defaultValue })}
      />
      <div className="space-y-2">
        {block.options.map((option) => (
          <Field
            key={option.value}
            label="Option label"
            value={option.label}
            onChange={(label) =>
              onChange({
                ...block,
                options: block.options.map((entry) =>
                  entry.value === option.value ? { ...entry, label } : entry,
                ),
              })
            }
          />
        ))}
      </div>
    </>
  );
}

function TextStyleSettings({
  block,
  onChange,
}: {
  block: TextSingleBlock | TextMultiBlock;
  onChange: (block: TextSingleBlock | TextMultiBlock) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl bg-stone-50 p-4">
      <div className="grid grid-cols-2 gap-3">
        <StyleModeField
          label="Color mode"
          value={block.colorMode}
          onChange={(colorMode) => onChange({ ...block, colorMode })}
        />
        <StyleModeField
          label="Font family mode"
          value={block.fontFamilyMode}
          onChange={(fontFamilyMode) => onChange({ ...block, fontFamilyMode })}
        />
      </div>

      {block.colorMode === "fixed" ? (
        <label className="block text-sm font-medium text-slate-700">
          Fixed color
          <input
            type="color"
            value={block.color}
            onChange={(event) => onChange({ ...block, color: event.target.value })}
            className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white px-2 py-1"
          />
        </label>
      ) : (
        <ChoiceOptionEditor
          label="Allowed colors"
          options={block.colorOptions}
          onChange={(colorOptions) => onChange({ ...block, colorOptions })}
          swatches
        />
      )}

      {block.fontFamilyMode === "fixed" ? (
        <SelectField
          label="Fixed font family"
          value={block.fontId}
          options={DEFAULT_FONT_FAMILY_OPTIONS}
          onChange={(fontId) => onChange({ ...block, fontId })}
        />
      ) : (
        <ChoiceOptionEditor
          label="Allowed font families"
          options={block.fontFamilyOptions}
          onChange={(fontFamilyOptions) => onChange({ ...block, fontFamilyOptions })}
        />
      )}
    </div>
  );
}

function ConditionEditor({
  block,
  blocks,
  onChange,
}: {
  block: CustomizationBlock;
  blocks: CustomizationBlock[];
  onChange: (visibleWhen?: CustomizationBlock["visibleWhen"]) => void;
}) {
  const candidates = blocks.filter(
    (entry) =>
      entry.order < block.order &&
      (entry.type === "checkbox" ||
        entry.type === "select" ||
        entry.type === "radio" ||
        entry.type === "color"),
  ) as Array<ChoiceBlock | Extract<CustomizationBlock, { type: "checkbox" }>>;
  const selectedSource =
    candidates.find((entry) => entry.id === block.visibleWhen?.blockId) ?? null;

  return (
    <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
      <label className="block text-sm font-medium text-slate-700">
        Visibility source
        <select
          value={block.visibleWhen?.blockId ?? ""}
          onChange={(event) => {
            const sourceId = event.target.value;
            if (!sourceId) {
              onChange(undefined);
              return;
            }
            const source = candidates.find((entry) => entry.id === sourceId);
            if (!source) return;
            onChange({
              blockId: source.id,
              equals:
                source.type === "checkbox"
                  ? true
                  : source.options[0]?.value ?? "",
            });
          }}
          className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none"
        >
          <option value="">Always visible</option>
          {candidates.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
        </select>
      </label>

      {selectedSource ? (
        selectedSource.type === "checkbox" ? (
          <SelectField
            label="Show when"
            value={String(block.visibleWhen?.equals ?? true)}
            options={[
              { value: "true", label: "Checked" },
              { value: "false", label: "Unchecked" },
            ]}
            onChange={(value) =>
              onChange({ blockId: selectedSource.id, equals: value === "true" })
            }
          />
        ) : "options" in selectedSource ? (
          <SelectField
            label="Show when"
            value={String(block.visibleWhen?.equals ?? selectedSource.options[0]?.value ?? "")}
            options={selectedSource.options}
            onChange={(value) => onChange({ blockId: selectedSource.id, equals: value })}
          />
        ) : null
      ) : null}
    </div>
  );
}

function StyleModeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "fixed" | "user_selectable";
  onChange: (value: "fixed" | "user_selectable") => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as "fixed" | "user_selectable")}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none"
      >
        <option value="fixed">Fixed</option>
        <option value="user_selectable">User selectable</option>
      </select>
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChoiceOptionEditor({
  label,
  options,
  onChange,
  swatches = false,
}: {
  label: string;
  options: Array<{ value: string; label: string; swatch?: string }>;
  onChange: (options: Array<{ value: string; label: string; swatch?: string }>) => void;
  swatches?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <button
          type="button"
          onClick={() =>
            onChange([
              ...options,
              {
                value: swatches ? "#000000" : `option_${options.length + 1}`,
                label: `Option ${options.length + 1}`,
                swatch: swatches ? "#000000" : undefined,
              },
            ])
          }
          className="text-xs font-semibold text-amber-800"
        >
          + Add option
        </button>
      </div>
      {options.map((option, index) => (
        <div key={`${option.value}:${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3">
          <Field
            label="Label"
            value={option.label}
            onChange={(labelValue) =>
              onChange(
                options.map((entry, entryIndex) =>
                  entryIndex === index ? { ...entry, label: labelValue } : entry,
                ),
              )
            }
          />
          {swatches ? (
            <label className="block text-sm font-medium text-slate-700">
              Color
              <input
                type="color"
                value={option.value}
                onChange={(event) =>
                  onChange(
                    options.map((entry, entryIndex) =>
                      entryIndex === index
                        ? { ...entry, value: event.target.value, swatch: event.target.value }
                        : entry,
                    ),
                  )
                }
                className="mt-2 h-11 w-full rounded-2xl border border-stone-200 bg-white px-2 py-1"
              />
            </label>
          ) : (
            <Field
              label="Value"
              value={option.value}
              onChange={(nextValue) =>
                onChange(
                  options.map((entry, entryIndex) =>
                    entryIndex === index ? { ...entry, value: nextValue } : entry,
                  ),
                )
              }
            />
          )}
          <button
            type="button"
            onClick={() => onChange(options.filter((_, entryIndex) => entryIndex !== index))}
            className="self-end rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

function ProductSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (productId: string) => void;
}) {
  const [products, setProducts] = useState<Array<{ id: number; title: string; handle: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/products?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.items)) setProducts(data.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <label className="block text-sm font-medium text-slate-700">
      Product
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      >
        {loading ? (
          <option value="">Loading...</option>
        ) : products.length === 0 ? (
          <option value="">No products found</option>
        ) : (
          products.map((product) => (
            <option key={product.id} value={String(product.id)}>
              {product.title} ({product.handle})
            </option>
          ))
        )}
      </select>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(event) => onChange(numberValue(event.target.value, value))}
        className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 outline-none focus:border-amber-400"
      />
    </label>
  );
}
