import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import {
  buildDesignFromForm,
  getOrderedFormFields,
  layerGeometryToPixels,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeFieldValue,
  type TextFieldValue,
} from "@trophy/customization";
import { createId, cssShapeClip, fileToBackground, NumberInput, Select } from "./customization-template-ui";

export function PreviewDialog({ template, values, onChange, onClose, onReset }: { template: CustomizationTemplate; values: CustomizationFormValues; onChange: (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | null) => void; onClose: () => void; onReset: () => void }) {
  const design = useMemo(() => buildDesignFromForm({ template, values, designId: "admin_preview" }), [template, values]);
  return (
    <div className="fixed inset-0 z-50 flex bg-black/40 p-8">
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_360px] overflow-hidden rounded-xl bg-ui-bg-base shadow-xl">
        <div className="overflow-auto bg-ui-bg-subtle p-6">
          <PreviewCanvas template={template} design={design} />
        </div>
        <aside className="overflow-y-auto border-l border-ui-border-base p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Preview</h2>
            <button type="button" onClick={onClose} className="rounded border px-3 py-1 text-sm">Close</button>
          </div>
          <button type="button" onClick={onReset} className="mb-4 inline-flex items-center gap-2 rounded border px-3 py-2 text-sm">
            <RotateCcw className="size-4" /> Reset preview data
          </button>
          <div className="space-y-4">
            {getOrderedFormFields(template).map((field) => {
              const layer = template.layers.find((entry) => entry.id === field.layerId);
              if (!layer) return null;
              return <PreviewField key={field.id} field={field} layer={layer} value={values[field.id]} onChange={(value) => onChange(field.id, value)} />;
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

function PreviewCanvas({ template, design }: { template: CustomizationTemplate; design: ReturnType<typeof buildDesignFromForm> }) {
  const background = template.background;
  const width = background?.widthPx ?? 900;
  const height = background?.heightPx ?? 900;
  const scale = Math.min(720 / width, 720 / height);
  return (
    <div className="relative mx-auto bg-white shadow" style={{ width: width * scale, height: height * scale }}>
      {background ? <img src={background.previewUrl} alt="" className="absolute inset-0 h-full w-full object-fill" /> : null}
      {[...design.layers].sort((a, b) => a.zIndex - b.zIndex).map((layer) => {
        if (layer.type === "text") {
          const left = layer.geometry.xRatio * width * scale;
          const top = layer.geometry.yRatio * height * scale;
          const w = layer.geometry.widthRatio * width * scale;
          return <div key={layer.id} className="absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden text-center" style={{ left, top, width: w, color: layer.color, fontSize: layer.fontSizePt * scale }}>{layer.text}</div>;
        }
        const rect = layerGeometryToPixels({ geometry: layer.geometry, background: { widthPx: width, heightPx: height } });
        const panX = layer.cropXRatio * rect.widthPx * 0.25;
        const panY = layer.cropYRatio * rect.heightPx * 0.25;
        return (
          <div
            key={layer.id}
            className="absolute overflow-hidden"
            style={{
              left: rect.xPx * scale,
              top: rect.yPx * scale,
              width: rect.widthPx * scale,
              height: rect.heightPx * scale,
              clipPath: cssShapeClip(layer.shape.type),
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
      })}
    </div>
  );
}

function PreviewField({ field, layer, value, onChange }: { field: CustomizationFormField; layer: CustomizationLayer; value: unknown; onChange: (value: TextFieldValue | ImageShapeFieldValue | null) => void }) {
  if (layer.type === "text") {
    const textValue = value && typeof value === "object" && "text" in value ? value as TextFieldValue : { text: "" };
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
        <textarea value={textValue.text} placeholder={field.placeholder} onChange={(event) => onChange({ ...textValue, text: event.target.value })} className="w-full rounded-md border border-ui-border-base px-3 py-2 text-sm" rows={layer.text.maxLines} />
        {layer.text.colorPolicy.mode === "shopper_selectable" ? <Select label="Color" value={textValue.color ?? layer.text.colorPolicy.defaultColor} options={layer.text.colorPolicy.options.map((option) => option.value)} onChange={(color) => onChange({ ...textValue, color })} /> : null}
        {layer.text.fontPolicy.mode === "shopper_selectable" ? <Select label="Font" value={textValue.fontId ?? layer.text.fontPolicy.defaultFontId} options={layer.text.fontPolicy.options.map((option) => option.value)} onChange={(fontId) => onChange({ ...textValue, fontId })} /> : null}
      </div>
    );
  }
  const imageValue = value && typeof value === "object" && "assetId" in value ? value as ImageShapeFieldValue : null;
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{field.label}{field.required ? " *" : ""}</label>
      <input type="file" accept="image/*" onChange={(event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void fileToBackground(file).then((asset) => onChange({ assetId: createId("local_asset"), previewUrl: asset.previewUrl, sourceWidthPx: asset.widthPx, sourceHeightPx: asset.heightPx, cropScale: 1, cropXRatio: 0, cropYRatio: 0 }));
      }} />
      {imageValue ? (
        <>
          <NumberInput label="Zoom" value={imageValue.cropScale ?? 1} onChange={(cropScale) => onChange({ ...imageValue, cropScale })} />
          <NumberInput label="Pan X" value={imageValue.cropXRatio ?? 0} onChange={(cropXRatio) => onChange({ ...imageValue, cropXRatio })} />
          <NumberInput label="Pan Y" value={imageValue.cropYRatio ?? 0} onChange={(cropYRatio) => onChange({ ...imageValue, cropYRatio })} />
        </>
      ) : null}
    </div>
  );
}
