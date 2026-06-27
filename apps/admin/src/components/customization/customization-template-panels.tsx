import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileImage,
  Layers,
  Lock,
  PanelRight,
  Plus,
  CircleDashed,
  Shapes,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import {
  type CustomizationFormField,
  type CustomizationTemplate,
  type CustomShape,
  type ShapeType,
} from "@trophy/customization";
import { PanelTitle, Input, BackgroundUpload, shapeLabel, type RailTab } from "./customization-template-ui";

const SHAPES: ShapeType[] = ["rectangle", "circle", "ellipse", "rounded_rectangle", "star", "heart"];

export function Rail({ activeTab, onChange }: { activeTab: RailTab; onChange: (tab: RailTab) => void }) {
  const items = [
    { id: "blocks", label: "Blocks", icon: Plus },
    { id: "layers", label: "Layers", icon: Layers },
    { id: "form", label: "Form", icon: PanelRight },
    { id: "background", label: "Background", icon: FileImage },
  ] as const;
  return (
    <nav className="flex flex-col items-center gap-2 border-r border-ui-border-base bg-ui-bg-subtle py-3">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => onChange(item.id)}
            className={`rounded-md p-3 ${activeTab === item.id ? "bg-ui-bg-base text-ui-fg-base shadow-sm" : "text-ui-fg-muted"}`}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </nav>
  );
}

export function LeftPanel(props: {
  activeTab: RailTab;
  template: CustomizationTemplate;
  selectedLayerId: string;
  customShapes: CustomShape[];
  onAddText: () => void;
  onAddTextOnPath: () => void;
  onAddShape: (shape: ShapeType) => void;
  onAddCustomShape: (shape: CustomShape) => void;
  onOpenShapeLibrary: () => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
  onUpdateField: (fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) => void;
  onDelete: () => void;
}) {
  return (
    <aside className="overflow-y-auto border-r border-ui-border-base p-4">
      {props.activeTab === "blocks" ? <BlocksPanel template={props.template} customShapes={props.customShapes} onAddText={props.onAddText} onAddTextOnPath={props.onAddTextOnPath} onAddShape={props.onAddShape} onAddCustomShape={props.onAddCustomShape} onOpenShapeLibrary={props.onOpenShapeLibrary} /> : null}
      {props.activeTab === "layers" ? <LayersPanel template={props.template} selectedLayerId={props.selectedLayerId} onSelectLayer={props.onSelectLayer} onUpdateTemplate={props.onUpdateTemplate} onDelete={props.onDelete} /> : null}
      {props.activeTab === "form" ? <FormPanel template={props.template} onSelectLayer={props.onSelectLayer} onUpdateField={props.onUpdateField} onUpdateTemplate={props.onUpdateTemplate} /> : null}
      {props.activeTab === "background" ? <BackgroundPanel template={props.template} onUpdateTemplate={props.onUpdateTemplate} /> : null}
    </aside>
  );
}

function BlocksPanel({ template, customShapes, onAddText, onAddTextOnPath, onAddShape, onAddCustomShape, onOpenShapeLibrary }: { template: CustomizationTemplate; customShapes: CustomShape[]; onAddText: () => void; onAddTextOnPath: () => void; onAddShape: (shape: ShapeType) => void; onAddCustomShape: (shape: CustomShape) => void; onOpenShapeLibrary: () => void }) {
  const disabled = !template.background;
  return (
    <div className="space-y-4">
      <PanelTitle title="Blocks" subtitle={disabled ? "Upload a background before creating blocks." : "Create text or image shape layers."} />
      <button type="button" disabled={disabled} onClick={onAddText} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
        <Type className="size-4" /> Text
      </button>
      <button type="button" disabled={disabled} onClick={onAddTextOnPath} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
        <CircleDashed className="size-4" /> Text on path
      </button>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-ui-fg-muted">Image Shapes</p>
        {SHAPES.map((shape) => (
          <button key={shape} type="button" disabled={disabled} onClick={() => onAddShape(shape)} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
            <Shapes className="size-4" /> {shapeLabel(shape)}
          </button>
        ))}
      </div>
      {customShapes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase text-ui-fg-muted">Custom Shapes</p>
          {customShapes.map((shape) => (
            <button key={shape.id} type="button" disabled={disabled} onClick={() => onAddCustomShape(shape)} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
              <svg viewBox="0 0 100 100" className="size-4 shrink-0">
                <path d={shape.svgPathData} fill="currentColor" />
              </svg>
              {shape.name}
            </button>
          ))}
        </div>
      )}
      <button type="button" disabled={disabled} onClick={onOpenShapeLibrary} className="flex w-full items-center gap-3 rounded-md border border-dashed border-ui-border-base px-3 py-2 text-sm text-ui-fg-muted disabled:opacity-40">
        <Plus className="size-4" /> Create custom shape
      </button>
    </div>
  );
}

function LayersPanel({
  template,
  selectedLayerId,
  onSelectLayer,
  onUpdateTemplate,
  onDelete,
}: {
  template: CustomizationTemplate;
  selectedLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
  onDelete: () => void;
}) {
  const topFirst = [...template.layers].sort((a, b) => b.zIndex - a.zIndex);
  function move(layerId: string, direction: -1 | 1) {
    const ordered = [...topFirst];
    const index = ordered.findIndex((layer) => layer.id === layerId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex]!, ordered[index]!];
    onUpdateTemplate((current) => ({
      ...current,
      layers: current.layers.map((layer) => ({
        ...layer,
        zIndex: ordered.length - ordered.findIndex((entry) => entry.id === layer.id),
      })),
    }));
  }
  return (
    <div className="space-y-4">
      <PanelTitle title="Layers" subtitle="Top item renders above lower layers." />
      {topFirst.map((layer) => (
        <div key={layer.id} className={`rounded-md border p-2 ${selectedLayerId === layer.id ? "border-ui-fg-interactive" : "border-ui-border-base"} ${layer.hidden ? "opacity-50" : ""}`}>
          <button type="button" onClick={() => onSelectLayer(layer.id)} className="block w-full text-left text-sm font-medium">
            {layer.name}
          </button>
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={() => move(layer.id, -1)} className="rounded border p-1"><ArrowUp className="size-3" /></button>
            <button type="button" onClick={() => move(layer.id, 1)} className="rounded border p-1"><ArrowDown className="size-3" /></button>
            <button type="button" onClick={() => onUpdateTemplate((current) => ({ ...current, layers: current.layers.map((entry) => entry.id === layer.id ? { ...entry, hidden: !entry.hidden } : entry) }))} className="rounded border p-1">
              {layer.hidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
            </button>
            <button type="button" onClick={() => onUpdateTemplate((current) => ({ ...current, layers: current.layers.map((entry) => entry.id === layer.id ? { ...entry, locked: !entry.locked } : entry) }))} className="rounded border p-1">
              {layer.locked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
            </button>
            <button type="button" onClick={onDelete} className="ml-auto rounded border border-rose-200 p-1 text-rose-600"><Trash2 className="size-3" /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FormPanel({
  template,
  onSelectLayer,
  onUpdateField,
  onUpdateTemplate,
}: {
  template: CustomizationTemplate;
  onSelectLayer: (layerId: string) => void;
  onUpdateField: (fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
}) {
  const fields = [...template.formFields].sort((a, b) => a.order - b.order);
  const [draggedId, setDraggedId] = useState("");
  function reorder(targetId: string) {
    if (!draggedId || draggedId === targetId) return;
    const ordered = [...fields];
    const from = ordered.findIndex((field) => field.id === draggedId);
    const to = ordered.findIndex((field) => field.id === targetId);
    if (from < 0 || to < 0) return;
    const [item] = ordered.splice(from, 1);
    ordered.splice(to, 0, item!);
    onUpdateTemplate((current) => ({
      ...current,
      formFields: current.formFields.map((field) => ({
        ...field,
        order: ordered.findIndex((entry) => entry.id === field.id) + 1,
      })),
    }));
  }
  return (
    <div className="space-y-4">
      <PanelTitle title="Form" subtitle="Shopper field order and copy." />
      {fields.map((field) => (
        <div key={field.id} draggable onDragStart={() => setDraggedId(field.id)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(field.id)} className="space-y-2 rounded-md border border-ui-border-base p-3">
          <button type="button" onClick={() => onSelectLayer(field.layerId)} className="text-sm font-medium">{field.label}</button>
          <Input value={field.label} onChange={(label) => onUpdateField(field.id, (current) => ({ ...current, label }))} />
          <Input value={field.placeholder ?? ""} placeholder="Placeholder" onChange={(placeholder) => onUpdateField(field.id, (current) => ({ ...current, placeholder }))} />
          <textarea value={field.helpText ?? ""} placeholder="Help text" onChange={(event) => onUpdateField(field.id, (current) => ({ ...current, helpText: event.target.value }))} className="w-full rounded-md border border-ui-border-base px-2 py-1 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={field.required} onChange={(event) => onUpdateField(field.id, (current) => ({ ...current, required: event.target.checked }))} />
            Required
          </label>
        </div>
      ))}
    </div>
  );
}

function BackgroundPanel({ template, onUpdateTemplate }: { template: CustomizationTemplate; onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void }) {
  return (
    <div className="space-y-4">
      <PanelTitle title="Background" subtitle="Single template coordinate image." />
      {template.background ? (
        <div className="space-y-3">
          <img src={template.background.previewUrl} alt="" className="aspect-video w-full rounded-md border object-contain" />
          <p className="text-sm text-ui-fg-subtle">{template.background.filename ?? template.background.assetId}</p>
          <p className="text-xs text-ui-fg-muted">{template.background.widthPx} x {template.background.heightPx}px</p>
        </div>
      ) : (
        <p className="text-sm text-ui-fg-muted">No background uploaded.</p>
      )}
      <BackgroundUpload onUpload={(background) => onUpdateTemplate((current) => ({ ...current, background }))} />
      <button type="button" onClick={() => onUpdateTemplate((current) => ({ ...current, background: null }))} className="rounded-md border border-ui-border-base px-3 py-2 text-sm">
        Remove background
      </button>
    </div>
  );
}
