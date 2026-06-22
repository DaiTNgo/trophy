import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  createDefaultFormValues,
  isBlockVisible,
  limitTextBlockValue,
  renderZoneSvg,
  validateCustomizationValues,
  validateDesign,
  type ChoiceBlock,
  type CustomizationBlock,
  type CustomizationFieldValue,
  type CustomizationFormValues,
  type CustomizationTemplate,
  type ImageLayer,
  type MediaSelectBlock,
  type MediaUploadBlock,
  type TextBlock,
  type TextLayer,
  type UploadedMediaValue,
} from "@trophy/customization";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Image as KonvaImage, Layer, Rect, Stage, Text } from "react-konva";

const STAGE_SIZE = 680;
const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

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
  const [activeZoneId, setActiveZoneId] = useState(template.zones[0]!.id);
  const [values, setValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(template),
  );
  const [uploadingBlockId, setUploadingBlockId] = useState("");
  const [message, setMessage] = useState("");
  const cupImage = useHtmlImage(template.previewUrl);
  const activeZone = template.zones.find((zone) => zone.id === activeZoneId)!;
  const visibleBlocks = [...activeZone.blocks]
    .sort((a, b) => a.order - b.order)
    .filter((block) => isBlockVisible(block, values));
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
    setValues((current) => ({ ...current, [blockId]: value }));
    if (blockId !== "design_confirmation") {
      setValues((current) => ({ ...current, design_confirmation: false }));
    }
    setMessage("");
  }

  async function uploadImage(block: MediaUploadBlock, file: File) {
    if (!block.accept.includes(file.type as "image/png" | "image/jpeg")) {
      setMessage("Use a PNG or JPEG production image.");
      return;
    }
    if (file.size > block.maxBytes) {
      setMessage(`Image exceeds the ${Math.round(block.maxBytes / 1024 / 1024)} MB limit.`);
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
      };
      updateValue(block.id, uploaded);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingBlockId("");
    }
  }

  function downloadZoneSvg() {
    const svg = renderZoneSvg({ template, design, zoneId: activeZone.id });
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${design.id}-${activeZone.id}-preview.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const zoneIssues = [
    ...formValidation.issues.filter((issue) => issue.zoneId === activeZone.id),
    ...productionValidation.issues.filter((issue) => issue.zoneId === activeZone.id),
  ];

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
              Complete the form and review the live preview. Layout and production sizing are fixed
              by the workshop template.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm">
            Template revision <span className="font-semibold">{template.revision}</span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
          <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-[0_24px_70px_rgba(35,40,36,0.08)]">
            <div className="mb-5 flex flex-wrap gap-2">
              {template.zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  onClick={() => setActiveZoneId(zone.id)}
                  className={[
                    "rounded-full px-5 py-2.5 text-sm font-semibold transition",
                    activeZoneId === zone.id
                      ? "bg-[#13231d] text-white"
                      : "bg-stone-100 text-slate-600",
                  ].join(" ")}
                >
                  {zone.name}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-[28px] bg-stone-100">
              <Stage width={STAGE_SIZE} height={STAGE_SIZE} className="mx-auto max-w-full">
                <Layer listening={false}>
                  {cupImage ? (
                    <KonvaImage image={cupImage} width={STAGE_SIZE} height={STAGE_SIZE} />
                  ) : null}
                  <Rect
                    x={activeZone.previewBounds.xRatio * STAGE_SIZE}
                    y={activeZone.previewBounds.yRatio * STAGE_SIZE}
                    width={activeZone.previewBounds.widthRatio * STAGE_SIZE}
                    height={activeZone.previewBounds.heightRatio * STAGE_SIZE}
                    rotation={activeZone.previewBounds.rotationDeg}
                    fill="rgba(255,255,255,0.08)"
                    stroke="#f59e0b"
                    dash={[8, 6]}
                    strokeWidth={2}
                  />
                  {design.layers
                    .filter((layer) => layer.zoneId === activeZone.id)
                    .map((layer) =>
                      layer.type === "text" ? (
                        <FixedTextLayer key={layer.id} layer={layer} zone={activeZone} />
                      ) : (
                        <FixedImageLayer key={layer.id} layer={layer} zone={activeZone} />
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
            <Panel
              title={activeZone.name}
              description={`${activeZone.widthMm} × ${activeZone.heightMm} mm · complete the fields below`}
            >
              <div className="space-y-5">
                {visibleBlocks.map((block) => (
                  <BlockField
                    key={block.id}
                    block={block}
                    value={values[block.id]}
                    issue={
                      zoneIssues.find((issue) =>
                        "blockId" in issue
                          ? issue.blockId === block.id
                          : issue.layerId.startsWith(block.id),
                      )?.message
                    }
                    uploading={uploadingBlockId === block.id}
                    onChange={(value) => updateValue(block.id, value)}
                    onUpload={(file) =>
                      block.type === "media-upload" ? uploadImage(block, file) : Promise.resolve()
                    }
                  />
                ))}
              </div>
            </Panel>

            <Panel title="Production check" description="Review all fields before checkout.">
              <div className="space-y-3 text-sm">
                {template.zones.map((zone) => {
                  const invalid =
                    formValidation.issues.some((issue) => issue.zoneId === zone.id) ||
                    productionValidation.issues.some((issue) => issue.zoneId === zone.id);
                  return <StatusLine key={zone.id} label={zone.name} ok={!invalid} />;
                })}
              </div>
              {message ? (
                <p className="mt-4 rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{message}</p>
              ) : null}
              <button
                type="button"
                onClick={downloadZoneSvg}
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
          {(block.type === "text" || block.type === "textarea") && typeof value === "string" ? (
            <span className="text-xs text-slate-400">
              {value.length}/{block.maxChars}
            </span>
          ) : null}
        </div>
      ) : null}

      {block.type === "text" ? (
        <TextControl block={block} value={value} onChange={onChange} />
      ) : block.type === "textarea" ? (
        <TextareaControl block={block} value={value} onChange={onChange} />
      ) : block.type === "media-select" ? (
        <MediaSelectControl block={block} value={value} onChange={onChange} />
      ) : block.type === "media-upload" ? (
        <UploadControl block={block} value={value} uploading={uploading} onUpload={onUpload} />
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
      ) : block.type === "select" || block.type === "radio" || block.type === "color" ? (
        <ChoiceControl block={block} value={value} onChange={onChange} />
      ) : null}

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
  block: TextBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={typeof value === "string" ? value : ""}
      maxLength={block.maxChars}
      placeholder={block.placeholder}
      onChange={(event) => onChange(limitTextBlockValue(block, event.target.value))}
      className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
    />
  );
}

function TextareaControl({
  block,
  value,
  onChange,
}: {
  block: TextBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <textarea
        rows={Math.min(block.maxLines + 1, 6)}
        value={typeof value === "string" ? value : ""}
        maxLength={block.maxChars}
        placeholder={block.placeholder}
        onChange={(event) => onChange(limitTextBlockValue(block, event.target.value))}
        className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
      />
      <p className="mt-2 text-xs text-slate-400">Maximum {block.maxLines} lines</p>
    </>
  );
}

function MediaSelectControl({
  block,
  value,
  onChange,
}: {
  block: MediaSelectBlock;
  value: CustomizationFieldValue | undefined;
  onChange: (value: string) => void;
}) {
  return (
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
  );
}

function UploadControl({
  block,
  value,
  uploading,
  onUpload,
}: {
  block: MediaUploadBlock;
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const uploaded = value && typeof value === "object" ? value : null;
  return (
    <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-stone-50 p-4 text-center text-sm font-semibold text-slate-700">
      {uploaded ? (
        <img
          src={uploaded.previewUrl}
          alt="Uploaded logo"
          className="mx-auto mb-3 h-24 object-contain"
        />
      ) : null}
      {uploading ? "Uploading…" : uploaded ? "Replace artwork" : "Choose PNG or JPEG"}
      <input
        type="file"
        accept={block.accept.join(",")}
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
            <span
              className="size-4 rounded-full border"
              style={{ backgroundColor: option.swatch }}
            />
          ) : null}
          {option.label}
        </button>
      ))}
    </div>
  );
}

function FixedTextLayer({
  layer,
  zone,
}: {
  layer: TextLayer;
  zone: (typeof DEFAULT_TEMPLATE.zones)[number];
}) {
  const bounds = zone.previewBounds;
  const zoneX = bounds.xRatio * STAGE_SIZE;
  const zoneY = bounds.yRatio * STAGE_SIZE;
  const zoneWidth = bounds.widthRatio * STAGE_SIZE;
  const zoneHeight = bounds.heightRatio * STAGE_SIZE;
  const fontSize = Math.max(7, (layer.fontSizePt * zoneWidth) / zone.widthMm / 2.2);
  return (
    <Text
      x={zoneX + layer.xRatio * zoneWidth}
      y={zoneY + layer.yRatio * zoneHeight}
      text={layer.text}
      fontSize={fontSize}
      fontStyle="bold"
      fill={layer.color}
      align="center"
      offsetX={(layer.text.length * fontSize * 0.55) / 2}
      offsetY={fontSize / 2}
      rotation={layer.rotationDeg}
    />
  );
}

function FixedImageLayer({
  layer,
  zone,
}: {
  layer: ImageLayer;
  zone: (typeof DEFAULT_TEMPLATE.zones)[number];
}) {
  const image = useHtmlImage(layer.previewUrl);
  const bounds = zone.previewBounds;
  const zoneX = bounds.xRatio * STAGE_SIZE;
  const zoneY = bounds.yRatio * STAGE_SIZE;
  const zoneWidth = bounds.widthRatio * STAGE_SIZE;
  const zoneHeight = bounds.heightRatio * STAGE_SIZE;
  const width = layer.widthRatio * zoneWidth;
  const height = layer.heightRatio * zoneHeight;
  return (
    <KonvaImage
      image={image ?? undefined}
      x={zoneX + layer.xRatio * zoneWidth}
      y={zoneY + layer.yRatio * zoneHeight}
      width={width}
      height={height}
      offsetX={width / 2}
      offsetY={height / 2}
      rotation={layer.rotationDeg}
    />
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
