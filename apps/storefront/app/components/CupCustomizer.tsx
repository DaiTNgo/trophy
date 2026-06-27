import {
  DEFAULT_TEMPLATE,
  buildDesignFromForm,
  createDefaultFormValues,
  getTextPathRenderAttributes,
  getTextPathSvgD,
  getOrderedFormFields,
  layerGeometryToPixels,
  validateCustomizationValues,
  vectorPointsToSvgPathD,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeFieldValue,
  type RuntimeLayer,
  type TextFieldValue,
} from "@trophy/customization";
import { useMemo, useState } from "react";

const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ??
  "http://127.0.0.1:8787";

function getUploadToken() {
  const storageKey = "trophy-customization-upload-token";
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) return existing;
  const token = crypto.randomUUID();
  window.sessionStorage.setItem(storageKey, token);
  return token;
}

export default function CupCustomizer({ template: templateProp }: { template?: CustomizationTemplate } = {}) {
  const template = templateProp ?? DEFAULT_TEMPLATE;
  const [values, setValues] = useState<CustomizationFormValues>(() => createDefaultFormValues(template));
  const [uploadingFieldId, setUploadingFieldId] = useState("");
  const [message, setMessage] = useState("");

  const validation = useMemo(() => validateCustomizationValues({ template, values }), [template, values]);
  const design = useMemo(
    () => buildDesignFromForm({ template, values, designId: "storefront_preview" }),
    [template, values],
  );

  function updateValue(fieldId: string, value: CustomizationFieldValue) {
    setValues((current) => ({ ...current, [fieldId]: value }));
    setMessage("");
  }

  async function uploadImage(field: CustomizationFormField, file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage("Use a PNG or JPEG image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image exceeds the 20 MB limit.");
      return;
    }

    setUploadingFieldId(field.id);
    try {
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
      updateValue(field.id, {
        assetId: payload.asset.id,
        previewUrl: `${BACKEND_URL}${payload.asset.contentUrl}`,
        sourceWidthPx: payload.asset.widthPx,
        sourceHeightPx: payload.asset.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingFieldId("");
    }
  }

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
              Complete the form and review the live preview. Placement is controlled by the
              production template.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-sm">
            Template revision <span className="font-semibold">{template.revision}</span>
          </div>
        </header>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(420px,0.8fr)]">
          <section className="rounded-[34px] border border-black/5 bg-white p-5 shadow-[0_24px_70px_rgba(35,40,36,0.08)]">
            <PreviewCanvas template={template} layers={design.layers} />
            <p className="mt-4 text-center text-xs text-slate-400">
              Preview only. The visible result is what will be produced.
            </p>
          </section>

          <aside className="space-y-5">
            <Panel title={template.name} description="Complete the fields below.">
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
                      onChange={(value) => updateValue(field.id, value)}
                      onUpload={(file) => uploadImage(field, file)}
                    />
                  );
                })}
              </div>
            </Panel>

            <Panel title="Review" description="Check the live preview before checkout.">
              {message ? <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{message}</p> : null}
              {validation.issues.length > 0 ? (
                <div className="space-y-2">
                  {validation.issues.map((issue) => (
                    <p key={`${issue.fieldId}-${issue.code}`} className="text-sm text-rose-700">
                      {issue.message}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-emerald-700">All required fields are complete.</p>
              )}
              <button
                type="button"
                disabled={!validation.valid}
                className="mt-5 w-full rounded-2xl bg-[#13231d] px-5 py-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
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

function PreviewCanvas({ template, layers }: { template: CustomizationTemplate; layers: RuntimeLayer[] }) {
  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const scale = Math.min(680 / width, 680 / height);

  return (
    <div className="overflow-auto rounded-[28px] bg-stone-100 p-4">
      <div className="relative mx-auto bg-white shadow" style={{ width: width * scale, height: height * scale }}>
        {background ? <img src={background.previewUrl} alt="" className="absolute inset-0 h-full w-full object-fill" /> : null}
        {[...layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
          if (layer.type === "text") {
            return <PreviewText key={layer.id} layer={layer} width={width} height={height} scale={scale} />;
          }
          return <PreviewImageShape key={layer.id} layer={layer} width={width} height={height} scale={scale} />;
        })}
      </div>
    </div>
  );
}

function PreviewText({ layer, width, height, scale }: { layer: Extract<RuntimeLayer, { type: "text" }>; width: number; height: number; scale: number }) {
  const closedTextPath = layer.path.type === "closed_ellipse";
  const layerWidthPx = layer.geometry.widthRatio * width;
  const layerHeightPx = closedTextPath
    ? Math.max(1, (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * height)
    : layer.fontSizePt * Math.max(1, layer.text.split("\n").length) * 1.35;
  const left = (layer.geometry.xRatio * width - layerWidthPx / 2) * scale;
  const top = (layer.geometry.yRatio * height - layerHeightPx / 2) * scale;
  if (layer.path.type !== "straight") {
    const pathId = `storefront_text_path_${layer.id}`;
    const textWidthPx = layer.text.length * layer.fontSizePt * 0.55;
    const wordCount = layer.text.trim() ? layer.text.trim().split(/\s+/).length : 0;
    const pathAttrs = getTextPathRenderAttributes({ path: layer.path, align: layer.align, widthPx: layerWidthPx, heightPx: layerHeightPx, textWidthPx, charCount: layer.text.length, wordCount });
    const renderPath = pathAttrs.pathStartAngleDeg != null
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
        <text fontSize={layer.fontSizePt} fill={layer.color} textAnchor={pathAttrs.textAnchor} dominantBaseline="middle" textLength={pathAttrs.textLength} lengthAdjust={pathAttrs.lengthAdjust} wordSpacing={pathAttrs.wordSpacingPx ?? 0}>
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
        textAlign: layer.align === "justified" ? "justify" : layer.align,
        transform: `translate(-50%, -50%) rotate(${layer.geometry.rotationDeg}deg)`,
      }}
    >
      {layer.text}
    </div>
  );
}

function PreviewImageShape({ layer, width, height, scale }: { layer: Extract<RuntimeLayer, { type: "image_shape" }>; width: number; height: number; scale: number }) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: width, heightPx: height } });
  const zoom = layer.cropScale;
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
        clipPath: cssShapeClip(layer.shape.type, layer.shape.type === "vector" ? layer.shape.vectorPath : undefined),
        transform: `rotate(${layer.geometry.rotationDeg}deg)`,
      }}
    >
      <img
        src={layer.previewUrl}
        alt=""
        className="h-full w-full object-cover"
        style={{
          transform: `translate(${panX * scale}px, ${panY * scale}px) scale(${zoom})`,
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
  onChange: (value: CustomizationFieldValue) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">
        {field.label} {field.required ? <span className="text-rose-600">*</span> : null}
      </label>
      {layer.type === "text" ? (
        <TextField field={field} layer={layer} value={value} onChange={onChange} />
      ) : (
        <ImageField value={value} uploading={uploading} onChange={onChange} onUpload={onUpload} />
      )}
      {field.helpText ? <p className="mt-2 text-xs text-slate-400">{field.helpText}</p> : null}
      {issue ? <p className="mt-2 text-xs font-medium text-rose-700">{issue}</p> : null}
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
        onChange={(event) => onChange({ ...textValue, text: pathText ? event.target.value.replace(/\s*\n+\s*/g, " ") : event.target.value })}
        className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-amber-400"
      />
      {layer.text.colorPolicy.mode === "shopper_selectable" ? (
        <select
          value={textValue.color ?? layer.text.colorPolicy.defaultColor}
          onChange={(event) => onChange({ ...textValue, color: event.target.value })}
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
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
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm"
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
  value,
  uploading,
  onChange,
  onUpload,
}: {
  value: CustomizationFieldValue | undefined;
  uploading: boolean;
  onChange: (value: ImageShapeFieldValue | null) => void;
  onUpload: (file: File) => void;
}) {
  const uploaded = value && "assetId" in value ? value : null;
  return (
    <div className="space-y-3">
      <label className="block cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-stone-50 p-4 text-center text-sm font-semibold text-slate-700">
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
        <div className="rounded-2xl bg-stone-50 p-4">
          <Range label="Zoom" min={1} max={4} value={uploaded.cropScale ?? 1} onChange={(cropScale) => onChange({ ...uploaded, cropScale })} />
          <Range label="Pan X" min={-1} max={1} value={uploaded.cropXRatio ?? 0} onChange={(cropXRatio) => onChange({ ...uploaded, cropXRatio })} />
          <Range label="Pan Y" min={-1} max={1} value={uploaded.cropYRatio ?? 0} onChange={(cropYRatio) => onChange({ ...uploaded, cropYRatio })} />
          <button type="button" onClick={() => onChange(null)} className="mt-3 text-xs font-semibold text-rose-700">
            Remove image
          </button>
        </div>
      ) : null}
    </div>
  );
}

function Range({ label, min, max, value, onChange }: { label: string; min: number; max: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="mb-3 block text-xs font-semibold text-slate-600">
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full accent-[#13231d]"
      />
    </label>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_18px_50px_rgba(35,40,36,0.06)]">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function cssShapeClip(shape: string, vectorPath?: { points: import("@trophy/customization").VectorPoint[]; closed: boolean }) {
  if (shape === "circle") return "circle(50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") return "polygon(50% 0%, 61% 34%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 34%)";
  if (shape === "heart") return "path('M 50 88 C 20 62 4 45 12 25 C 20 6 42 10 50 27 C 58 10 80 6 88 25 C 96 45 80 62 50 88 Z')";
  if (shape === "vector" && vectorPath) return `path('${vectorPointsToSvgPathD(vectorPath.points, vectorPath.closed)}')`;
  return "inset(0)";
}
