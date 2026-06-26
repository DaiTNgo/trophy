import {
  DEFAULT_FONT_FAMILY_OPTIONS,
  DEFAULT_TEMPLATE,
  DEFAULT_TEXT_COLOR_OPTIONS,
  buildDesignFromForm,
  createDefaultFormValues,
  getOrderedFormFields,
  getVisibleLayers,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  validateTemplateForPublish,
  type BackgroundAsset,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeEditorLayer,
  type ImageShapeFieldValue,
  type ShapeType,
  type TextEditorLayer,
  type TextFieldValue,
  type TextPath,
} from "@trophy/customization";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  FileImage,
  Layers,
  Lock,
  PanelRight,
  Plus,
  RotateCcw,
  Save,
  Shapes,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
const SHAPES: ShapeType[] = ["rectangle", "circle", "ellipse", "rounded_rectangle", "star", "heart"];
type RailTab = "blocks" | "layers" | "form" | "background";

const createId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

export default function CustomizationTemplatePage() {
  const [searchParams] = useSearchParams();
  const editParam = searchParams.get("edit");
  const [template, setTemplate] = useState<CustomizationTemplate>(DEFAULT_TEMPLATE);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_TEMPLATE.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
  const [previewValues, setPreviewValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(DEFAULT_TEMPLATE),
  );
  const [deleted, setDeleted] = useState<{
    layer: CustomizationLayer;
    field?: CustomizationFormField;
    selectedLayerId: string;
  } | null>(null);

  useEffect(() => {
    if (!editParam || editParam === "new") return;
    const target = editParam;
    let active = true;
    async function loadTemplate() {
      const endpoint = /^\d+$/.test(target)
        ? `${BACKEND_URL}/api/customizations/templates/product/${target}`
        : `${BACKEND_URL}/api/customizations/templates/${target}`;
      const response = await fetch(endpoint);
      if (!response.ok) return;
      const data = (await response.json()) as { template: CustomizationTemplate };
      if (!active) return;
      setTemplate(data.template);
      setSelectedLayerId(data.template.layers[0]?.id ?? "");
      setPreviewValues(createDefaultFormValues(data.template));
    }
    void loadTemplate();
    return () => {
      active = false;
    };
  }, [editParam]);

  useEffect(() => {
    setPreviewValues(createDefaultFormValues(template));
  }, [template.id, template.revision]);

  const selectedLayer = template.layers.find((layer) => layer.id === selectedLayerId) ?? null;
  function updateTemplate(updater: (current: CustomizationTemplate) => CustomizationTemplate) {
    setTemplate((current) => ({ ...updater(current), status: "draft" }));
  }

  function updateLayer(layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) {
    updateTemplate((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? updater(layer) : layer)),
    }));
  }

  function updateField(fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) {
    updateTemplate((current) => ({
      ...current,
      formFields: current.formFields.map((field) => (field.id === fieldId ? updater(field) : field)),
    }));
  }

  function addLayer(layer: CustomizationLayer, field: CustomizationFormField) {
    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, layer],
      formFields: [...current.formFields, field],
    }));
    setSelectedLayerId(layer.id);
  }

  function addTextLayer() {
    if (!template.background) return;
    const id = createId("text");
    addLayer(
      {
        id,
        name: "Text layer",
        type: "text",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.28, rotationDeg: 0 },
        text: {
          sampleText: "YOUR TEXT",
          maxLines: 1,
          minFontSizePt: 8,
          maxFontSizePt: 20,
          align: "center",
          colorPolicy: { mode: "fixed", color: "#111111" },
          fontPolicy: { mode: "fixed", fontId: "sans-bold" },
          path: { type: "straight" },
        },
      },
      {
        id: createId("field"),
        layerId: id,
        label: "Text",
        placeholder: "YOUR TEXT",
        required: true,
        order: template.formFields.length + 1,
      },
    );
  }

  function addImageShape(shape: ShapeType) {
    if (!template.background) return;
    const id = createId("image_shape");
    addLayer(
      {
        id,
        name: shapeLabel(shape),
        type: "image_shape",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.2, rotationDeg: 0 },
        shape: { type: shape, lockAspectRatio: ["circle", "star", "heart"].includes(shape) },
        upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
      },
      {
        id: createId("field"),
        layerId: id,
        label: "Upload image",
        helpText: "Your image will be clipped to the selected shape.",
        required: false,
        order: template.formFields.length + 1,
      },
    );
  }

  function deleteSelectedLayer() {
    const layer = selectedLayer;
    if (!layer) return;
    const field = template.formFields.find((entry) => entry.layerId === layer.id);
    setDeleted({ layer, field, selectedLayerId });
    updateTemplate((current) => ({
      ...current,
      layers: current.layers.filter((entry) => entry.id !== layer.id),
      formFields: current.formFields.filter((entry) => entry.layerId !== layer.id),
    }));
    setSelectedLayerId("");
    setFlash(`Deleted "${layer.name}".`);
  }

  function undoDelete() {
    if (!deleted) return;
    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, deleted.layer].sort((a, b) => a.zIndex - b.zIndex),
      formFields: deleted.field
        ? [...current.formFields, deleted.field].sort((a, b) => a.order - b.order)
        : current.formFields,
    }));
    setSelectedLayerId(deleted.selectedLayerId);
    setDeleted(null);
    setFlash("Layer restored.");
  }

  async function saveDraft() {
    const response = await fetch(`${BACKEND_URL}/api/customizations/templates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: Number(template.productId) || 1,
        name: template.name,
        background: template.background,
        layers: template.layers,
        formFields: template.formFields,
      }),
    });
    if (!response.ok) {
      setFlash("Failed to save draft.");
      return null;
    }
    const data = (await response.json()) as { template: CustomizationTemplate };
    setTemplate(data.template);
    setFlash("Draft saved.");
    return data.template;
  }

  async function publish() {
    const validation = validateTemplateForPublish(template);
    if (!validation.valid) {
      setFlash(validation.issues[0]?.message ?? "Template is invalid.");
      return;
    }
    const saved = await saveDraft();
    if (!saved) return;
    const response = await fetch(`${BACKEND_URL}/api/customizations/templates/${saved.id}/publish`, {
      method: "POST",
    });
    setFlash(response.ok ? "Template published." : "Failed to publish template.");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoDelete();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelectedLayer();
        return;
      }
      if (event.key === "Escape") {
        if (pathEditingLayerId) {
          setPathEditingLayerId("");
          return;
        }
        setSelectedLayerId("");
        return;
      }
      if (!selectedLayer || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const delta = event.shiftKey ? 10 : 1;
      const background = template.background;
      if (!background) return;
      updateLayer(selectedLayer.id, (layer) => {
        const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
        const next = {
          ...rect,
          xPx: rect.xPx + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
          yPx: rect.yPx + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
        };
        const geometry = pixelRectToLayerGeometry({
          ...next,
          heightPx: layer.type === "image_shape" ? next.heightPx : undefined,
          background,
        });
        return { ...layer, geometry: layer.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } } as CustomizationLayer;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleted, pathEditingLayerId, selectedLayer, template.background]);

  return (
    <section className="flex min-h-[calc(100vh-96px)] flex-col overflow-hidden rounded-xl border border-ui-border-base bg-ui-bg-base shadow-sm">
      <EditorHeader template={template} onSave={() => void saveDraft()} onPublish={() => void publish()} onPreview={() => setPreviewOpen(true)} />
      {flash ? (
        <div className="flex items-center justify-between border-b border-ui-border-base bg-ui-bg-subtle px-4 py-2 text-sm text-ui-fg-subtle">
          <span>{flash}</span>
          {deleted ? (
            <button type="button" onClick={undoDelete} className="font-medium text-ui-fg-base">
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="grid min-h-0 flex-1 grid-cols-[56px_280px_minmax(0,1fr)_320px]">
        <Rail activeTab={activeTab} onChange={setActiveTab} />
        <LeftPanel
          activeTab={activeTab}
          template={template}
          selectedLayerId={selectedLayerId}
          onAddText={addTextLayer}
          onAddShape={addImageShape}
          onSelectLayer={setSelectedLayerId}
          onUpdateTemplate={updateTemplate}
          onUpdateField={updateField}
          onDelete={deleteSelectedLayer}
          onUndoDelete={undoDelete}
        />
        <EditorCanvas
          template={template}
          selectedLayerId={selectedLayerId}
          pathEditingLayerId={pathEditingLayerId}
          onSelectLayer={setSelectedLayerId}
          onPathEditingLayerChange={setPathEditingLayerId}
          onUpdateLayer={updateLayer}
          onUploadBackground={(background) =>
            updateTemplate((current) => ({ ...current, background }))
          }
        />
        <Inspector
          template={template}
          selectedLayer={selectedLayer}
          pathEditingLayerId={pathEditingLayerId}
          onUpdateLayer={updateLayer}
          onPathEditingLayerChange={setPathEditingLayerId}
          onUpdateTemplate={updateTemplate}
        />
      </div>
      {previewOpen ? (
        <PreviewDialog
          template={template}
          values={previewValues}
          onChange={(fieldId, value) => setPreviewValues((current) => ({ ...current, [fieldId]: value }))}
          onClose={() => setPreviewOpen(false)}
          onReset={() => setPreviewValues(createDefaultFormValues(template))}
        />
      ) : null}
    </section>
  );
}

function EditorHeader({
  template,
  onSave,
  onPublish,
  onPreview,
}: {
  template: CustomizationTemplate;
  onSave: () => void;
  onPublish: () => void;
  onPreview: () => void;
}) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-ui-border-base px-4">
      <div className="flex items-center gap-3">
        <Link to="/customization-templates" className="rounded-md border border-ui-border-base p-2 text-ui-fg-subtle">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="text-sm font-medium text-ui-fg-base">{template.name}</p>
          <p className="text-xs text-ui-fg-muted">Product {template.productId} · Rev {template.revision} · {template.status}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onPreview} className="rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">
          Preview
        </button>
        <button type="button" onClick={onSave} className="inline-flex items-center gap-2 rounded-md border border-ui-border-base px-3 py-2 text-sm font-medium">
          <Save className="size-4" /> Save draft
        </button>
        <button type="button" onClick={onPublish} className="rounded-md bg-ui-bg-interactive px-3 py-2 text-sm font-medium text-ui-fg-on-color">
          Publish
        </button>
      </div>
    </header>
  );
}

function Rail({ activeTab, onChange }: { activeTab: RailTab; onChange: (tab: RailTab) => void }) {
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

function LeftPanel(props: {
  activeTab: RailTab;
  template: CustomizationTemplate;
  selectedLayerId: string;
  onAddText: () => void;
  onAddShape: (shape: ShapeType) => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
  onUpdateField: (fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) => void;
  onDelete: () => void;
  onUndoDelete: () => void;
}) {
  return (
    <aside className="overflow-y-auto border-r border-ui-border-base p-4">
      {props.activeTab === "blocks" ? <BlocksPanel template={props.template} onAddText={props.onAddText} onAddShape={props.onAddShape} /> : null}
      {props.activeTab === "layers" ? <LayersPanel {...props} /> : null}
      {props.activeTab === "form" ? <FormPanel {...props} /> : null}
      {props.activeTab === "background" ? <BackgroundPanel template={props.template} onUpdateTemplate={props.onUpdateTemplate} /> : null}
    </aside>
  );
}

function BlocksPanel({ template, onAddText, onAddShape }: { template: CustomizationTemplate; onAddText: () => void; onAddShape: (shape: ShapeType) => void }) {
  const disabled = !template.background;
  return (
    <div className="space-y-4">
      <PanelTitle title="Blocks" subtitle={disabled ? "Upload a background before creating blocks." : "Create text or image shape layers."} />
      <button type="button" disabled={disabled} onClick={onAddText} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
        <Type className="size-4" /> Text
      </button>
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-ui-fg-muted">Image Shapes</p>
        {SHAPES.map((shape) => (
          <button key={shape} type="button" disabled={disabled} onClick={() => onAddShape(shape)} className="flex w-full items-center gap-3 rounded-md border border-ui-border-base px-3 py-2 text-sm disabled:opacity-40">
            <Shapes className="size-4" /> {shapeLabel(shape)}
          </button>
        ))}
      </div>
    </div>
  );
}

function LayersPanel({
  template,
  selectedLayerId,
  onSelectLayer,
  onUpdateTemplate,
  onDelete,
}: Parameters<typeof LeftPanel>[0]) {
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

function FormPanel({ template, onSelectLayer, onUpdateField, onUpdateTemplate }: Parameters<typeof LeftPanel>[0]) {
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

function EditorCanvas({
  template,
  selectedLayerId,
  pathEditingLayerId,
  onSelectLayer,
  onPathEditingLayerChange,
  onUpdateLayer,
  onUploadBackground,
}: {
  template: CustomizationTemplate;
  selectedLayerId: string;
  pathEditingLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onPathEditingLayerChange: (layerId: string) => void;
  onUpdateLayer: (layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  onUploadBackground: (background: BackgroundAsset) => void;
}) {
  const [zoom, setZoom] = useState(0.72);
  const background = template.background;
  if (!background) {
    return (
      <main className="flex items-center justify-center bg-ui-bg-subtle p-8">
        <label className="flex h-full min-h-[420px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-ui-border-base bg-ui-bg-base text-ui-fg-muted">
          <FileImage className="mb-3 size-8" />
          Upload background image
          <BackgroundUpload onUpload={onUploadBackground} hidden />
        </label>
      </main>
    );
  }
  const width = background.widthPx * zoom;
  const height = background.heightPx * zoom;
  return (
    <main className="overflow-auto bg-ui-bg-subtle p-6">
      <div className="mb-3 flex items-center gap-2">
        <button type="button" onClick={() => setZoom((current) => Math.max(0.2, current - 0.1))} className="rounded border px-2 py-1 text-sm">-</button>
        <button type="button" onClick={() => setZoom(0.72)} className="rounded border px-2 py-1 text-sm">Fit</button>
        <button type="button" onClick={() => setZoom((current) => Math.min(2, current + 0.1))} className="rounded border px-2 py-1 text-sm">+</button>
        <span className="text-xs text-ui-fg-muted">{Math.round(zoom * 100)}%</span>
      </div>
      <div
        className="relative mx-auto bg-white shadow-lg"
        style={{ width, height }}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) onSelectLayer("");
        }}
        onDoubleClick={(event) => {
          const layer = template.layers.find((entry) => entry.id === pathEditingLayerId);
          if (!layer || layer.type !== "text" || layer.text.path.type !== "custom") return;
          const bounds = event.currentTarget.getBoundingClientRect();
          const xRatio = (event.clientX - bounds.left) / bounds.width;
          const yRatio = (event.clientY - bounds.top) / bounds.height;
          const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
          const point = {
            id: createId("path_point"),
            xRatio: Math.max(0, Math.min(1, (xRatio * background.widthPx - rect.xPx) / rect.widthPx)),
            yRatio: Math.max(0, Math.min(1, (yRatio * background.heightPx - rect.yPx) / Math.max(1, layer.text.maxFontSizePt * layer.text.maxLines * 1.35))),
            inHandle: { xRatio: -0.08, yRatio: 0 },
            outHandle: { xRatio: 0.08, yRatio: 0 },
          };
          onUpdateLayer(layer.id, (current) =>
            current.type === "text" && current.text.path.type === "custom"
              ? { ...current, text: { ...current.text, path: { ...current.text.path, points: [...current.text.path.points, point] } } }
              : current,
          );
        }}
      >
        <img src={background.previewUrl} alt="" className="absolute inset-0 h-full w-full select-none object-fill" draggable={false} />
        {getVisibleLayers(template).map((layer) => (
          <CanvasLayer
            key={layer.id}
            layer={layer}
            background={background}
            zoom={zoom}
            selected={selectedLayerId === layer.id}
            pathEditing={pathEditingLayerId === layer.id}
            onSelect={() => onSelectLayer(layer.id)}
            onEditPath={() => onPathEditingLayerChange(layer.id)}
            onUpdate={(updater) => onUpdateLayer(layer.id, updater)}
          />
        ))}
      </div>
    </main>
  );
}

function CanvasLayer({
  layer,
  background,
  zoom,
  selected,
  pathEditing,
  onSelect,
  onEditPath,
  onUpdate,
}: {
  layer: CustomizationLayer;
  background: BackgroundAsset;
  zoom: number;
  selected: boolean;
  pathEditing: boolean;
  onSelect: () => void;
  onEditPath: () => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
  const textHeight = layer.type === "text" ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx;
  const h = layer.type === "text" ? textHeight : rect.heightPx;
  const top = layer.type === "text" ? layer.geometry.yRatio * background.heightPx - h / 2 : rect.yPx;
  const drag = useRef<{ x: number; y: number; rect: typeof rect } | null>(null);
  function startDrag(event: React.PointerEvent) {
    if (layer.locked) return;
    onSelect();
    drag.current = { x: event.clientX, y: event.clientY, rect };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent) {
    if (!drag.current || layer.locked) return;
    const dx = (event.clientX - drag.current.x) / zoom;
    const dy = (event.clientY - drag.current.y) / zoom;
    const geometry = pixelRectToLayerGeometry({
      xPx: drag.current.rect.xPx + dx,
      yPx: (layer.type === "text" ? top : drag.current.rect.yPx) + dy,
      widthPx: drag.current.rect.widthPx,
      heightPx: layer.type === "image_shape" ? drag.current.rect.heightPx : undefined,
      background,
    });
    onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
  }
  return (
    <div
      className={`absolute ${selected ? "ring-2 ring-ui-fg-interactive" : "ring-1 ring-teal-500/70"} ${layer.locked ? "cursor-not-allowed" : "cursor-move"}`}
      style={{
        left: rect.xPx * zoom,
        top: top * zoom,
        width: rect.widthPx * zoom,
        height: h * zoom,
        transform: `rotate(${layer.geometry.rotationDeg}deg)`,
        zIndex: layer.zIndex,
      }}
      onPointerDown={startDrag}
      onPointerMove={move}
      onPointerUp={() => {
        drag.current = null;
      }}
      onDoubleClick={(event) => {
        if (layer.type === "text" && layer.text.path.type === "custom") {
          event.stopPropagation();
          onEditPath();
        }
      }}
    >
      {layer.type === "text" ? (
        <div className="flex h-full items-center justify-center overflow-hidden bg-teal-500/10 text-center text-xs font-medium text-teal-900">
          {layer.text.sampleText}
        </div>
      ) : (
        <div className="h-full w-full bg-teal-500/10" style={{ borderRadius: layer.shape.type === "circle" ? "999px" : layer.shape.type === "rounded_rectangle" ? "12%" : undefined, clipPath: cssShapeClip(layer.shape.type) }} />
      )}
      {pathEditing && layer.type === "text" && layer.text.path.type === "custom" ? (
        <PathPointOverlay
          layer={layer}
          onUpdate={onUpdate}
        />
      ) : null}
      {selected && !layer.locked ? <ResizeHandles layer={layer} background={background} zoom={zoom} onUpdate={onUpdate} /> : null}
    </div>
  );
}

function PathPointOverlay({
  layer,
  onUpdate,
}: {
  layer: TextEditorLayer;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  if (layer.text.path.type !== "custom") return null;
  const points = layer.text.path.points;
  return (
    <>
      {points.map((point, index) => (
        <div key={point.id}>
          <PathHandle
            pointId={point.id}
            kind="anchor"
            xRatio={point.xRatio}
            yRatio={point.yRatio}
            onMove={(xRatio, yRatio) => {
              onUpdate((current) =>
                current.type === "text" && current.text.path.type === "custom"
                  ? {
                      ...current,
                      text: {
                        ...current.text,
                        path: {
                          ...current.text.path,
                          points: current.text.path.points.map((entry) =>
                            entry.id === point.id ? { ...entry, xRatio, yRatio } : entry,
                          ),
                        },
                      },
                    }
                  : current,
              );
            }}
          />
          {point.inHandle ? (
            <PathHandle
              pointId={point.id}
              kind="in"
              xRatio={point.xRatio + point.inHandle.xRatio}
              yRatio={point.yRatio + point.inHandle.yRatio}
              onMove={(xRatio, yRatio) => updatePathHandle(onUpdate, point.id, "inHandle", xRatio - point.xRatio, yRatio - point.yRatio)}
            />
          ) : null}
          {point.outHandle ? (
            <PathHandle
              pointId={point.id}
              kind="out"
              xRatio={point.xRatio + point.outHandle.xRatio}
              yRatio={point.yRatio + point.outHandle.yRatio}
              onMove={(xRatio, yRatio) => updatePathHandle(onUpdate, point.id, "outHandle", xRatio - point.xRatio, yRatio - point.yRatio)}
            />
          ) : null}
          {index > 0 ? (
            <div
              className="pointer-events-none absolute h-px bg-amber-500"
              style={{
                left: `${points[index - 1]!.xRatio * 100}%`,
                top: `${points[index - 1]!.yRatio * 100}%`,
                width: `${Math.hypot(point.xRatio - points[index - 1]!.xRatio, point.yRatio - points[index - 1]!.yRatio) * 100}%`,
              }}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}

function PathHandle({
  kind,
  xRatio,
  yRatio,
  onMove,
}: {
  pointId: string;
  kind: "anchor" | "in" | "out";
  xRatio: number;
  yRatio: number;
  onMove: (xRatio: number, yRatio: number) => void;
}) {
  return (
    <button
      type="button"
      className={`absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white ${kind === "anchor" ? "bg-amber-500" : "bg-sky-500"}`}
      style={{ left: `${xRatio * 100}%`, top: `${yRatio * 100}%` }}
      onPointerDown={(event) => {
        event.stopPropagation();
        const target = event.currentTarget.parentElement?.parentElement as HTMLElement | null;
        if (!target) return;
        const bounds = target.getBoundingClientRect();
        function move(pointer: PointerEvent) {
          onMove(
            Math.max(0, Math.min(1, (pointer.clientX - bounds.left) / bounds.width)),
            Math.max(0, Math.min(1, (pointer.clientY - bounds.top) / bounds.height)),
          );
        }
        function stop() {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
        }
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
    />
  );
}

function ResizeHandles({ layer, background, zoom, onUpdate }: { layer: CustomizationLayer; background: BackgroundAsset; zoom: number; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  const handles = layer.type === "text" ? ["left", "right"] : layer.shape.lockAspectRatio ? ["nw", "ne", "sw", "se"] : ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  return (
    <>
      {handles.map((handle) => (
        <button
          key={handle}
          type="button"
          className="absolute size-2 rounded-full bg-ui-fg-interactive"
          style={handleStyle(handle)}
          onPointerDown={(event) => {
            event.stopPropagation();
            const startX = event.clientX;
            const startY = event.clientY;
            const start = layerGeometryToPixels({ geometry: layer.geometry, background });
            function move(pointer: PointerEvent) {
              const dx = (pointer.clientX - startX) / zoom;
              const dy = (pointer.clientY - startY) / zoom;
              const next = resizeRect(start, handle, dx, dy, layer.type === "image_shape" && layer.shape.lockAspectRatio);
              const geometry = pixelRectToLayerGeometry({ ...next, heightPx: layer.type === "image_shape" ? next.heightPx : undefined, background });
              onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
            }
            function stop() {
              window.removeEventListener("pointermove", move);
              window.removeEventListener("pointerup", stop);
            }
            window.addEventListener("pointermove", move);
            window.addEventListener("pointerup", stop);
          }}
        />
      ))}
    </>
  );
}

function Inspector({
  template,
  selectedLayer,
  pathEditingLayerId,
  onUpdateLayer,
  onPathEditingLayerChange,
  onUpdateTemplate,
}: {
  template: CustomizationTemplate;
  selectedLayer: CustomizationLayer | null;
  pathEditingLayerId: string;
  onUpdateLayer: (layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  onPathEditingLayerChange: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
}) {
  return (
    <aside className="overflow-y-auto border-l border-ui-border-base p-4">
      {!selectedLayer ? <CanvasInspector template={template} onUpdateTemplate={onUpdateTemplate} /> : null}
      {selectedLayer?.type === "text" ? (
        <TextInspector
          template={template}
          layer={selectedLayer}
          pathEditing={pathEditingLayerId === selectedLayer.id}
          onPathEditingChange={(active) => onPathEditingLayerChange(active ? selectedLayer.id : "")}
          onUpdate={(updater) => onUpdateLayer(selectedLayer.id, updater)}
        />
      ) : null}
      {selectedLayer?.type === "image_shape" ? <ImageShapeInspector template={template} layer={selectedLayer} onUpdate={(updater) => onUpdateLayer(selectedLayer.id, updater)} /> : null}
    </aside>
  );
}

function CanvasInspector({ template, onUpdateTemplate }: { template: CustomizationTemplate; onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void }) {
  return (
    <div className="space-y-4">
      <PanelTitle title="Canvas" subtitle="No layer selected." />
      <Input value={template.name} onChange={(name) => onUpdateTemplate((current) => ({ ...current, name }))} />
      {template.background ? <p className="text-sm text-ui-fg-muted">{template.background.widthPx} x {template.background.heightPx}px</p> : <p className="text-sm text-ui-fg-muted">Upload a background to begin.</p>}
    </div>
  );
}

function TextInspector({
  template,
  layer,
  pathEditing,
  onPathEditingChange,
  onUpdate,
}: {
  template: CustomizationTemplate;
  layer: TextEditorLayer;
  pathEditing: boolean;
  onPathEditingChange: (active: boolean) => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  return (
    <div className="space-y-5">
      <PanelTitle title="Text" subtitle={layer.name} />
      <LayerName layer={layer} onUpdate={onUpdate} />
      <PositionFields template={template} layer={layer} onUpdate={onUpdate} textOnly />
      <Input value={layer.text.sampleText} onChange={(sampleText) => onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, sampleText } }) as CustomizationLayer)} />
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Max lines" value={layer.text.maxLines} onChange={(maxLines) => updateText(onUpdate, { maxLines: layer.text.path.type === "straight" ? Math.max(1, Math.round(maxLines)) : 1 })} />
        <NumberInput label="Min font" value={layer.text.minFontSizePt} onChange={(minFontSizePt) => updateText(onUpdate, { minFontSizePt })} />
        <NumberInput label="Max font" value={layer.text.maxFontSizePt} onChange={(maxFontSizePt) => updateText(onUpdate, { maxFontSizePt })} />
        <Select label="Align" value={layer.text.align} options={["left", "center", "right"]} onChange={(align) => updateText(onUpdate, { align: align as TextEditorLayer["text"]["align"] })} />
      </div>
      <TextStyleControls layer={layer} onUpdate={onUpdate} />
      <TextPathControls layer={layer} pathEditing={pathEditing} onPathEditingChange={onPathEditingChange} onUpdate={onUpdate} />
    </div>
  );
}

function ImageShapeInspector({ template, layer, onUpdate }: { template: CustomizationTemplate; layer: ImageShapeEditorLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  return (
    <div className="space-y-5">
      <PanelTitle title="Image Shape" subtitle={layer.name} />
      <LayerName layer={layer} onUpdate={onUpdate} />
      <PositionFields template={template} layer={layer} onUpdate={onUpdate} />
      <p className="text-sm text-ui-fg-subtle">Shape: {shapeLabel(layer.shape.type)}</p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={layer.shape.lockAspectRatio} onChange={(event) => onUpdate((current) => ({ ...current, shape: { ...(current as ImageShapeEditorLayer).shape, lockAspectRatio: event.target.checked } }) as CustomizationLayer)} />
        Lock aspect ratio
      </label>
      <p className="text-xs text-ui-fg-muted">Uploads use cover fit and clip to this shape. Shape type is fixed after creation.</p>
    </div>
  );
}

function PreviewDialog({ template, values, onChange, onClose, onReset }: { template: CustomizationTemplate; values: CustomizationFormValues; onChange: (fieldId: string, value: TextFieldValue | ImageShapeFieldValue | null) => void; onClose: () => void; onReset: () => void }) {
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

function PositionFields({ template, layer, onUpdate, textOnly }: { template: CustomizationTemplate; layer: CustomizationLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void; textOnly?: boolean }) {
  const background = template.background;
  if (!background) return null;
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
  const updateRect = (next: Partial<typeof rect>) => {
    const merged = { ...rect, ...next };
    const geometry = pixelRectToLayerGeometry({ ...merged, heightPx: textOnly ? undefined : merged.heightPx, background });
    onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput label="X" value={Math.round(rect.xPx)} onChange={(xPx) => updateRect({ xPx })} />
      <NumberInput label="Y" value={Math.round(rect.yPx)} onChange={(yPx) => updateRect({ yPx })} />
      <NumberInput label="W" value={Math.round(rect.widthPx)} onChange={(widthPx) => updateRect({ widthPx })} />
      <NumberInput label="H" value={Math.round(textOnly && layer.type === "text" ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx)} disabled={textOnly} onChange={(heightPx) => updateRect({ heightPx })} />
    </div>
  );
}

function TextStyleControls({ layer, onUpdate }: { layer: TextEditorLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  return (
    <div className="space-y-2">
      <Select label="Color mode" value={layer.text.colorPolicy.mode} options={["fixed", "shopper_selectable"]} onChange={(mode) => updateText(onUpdate, { colorPolicy: mode === "fixed" ? { mode: "fixed", color: "#111111" } : { mode: "shopper_selectable", defaultColor: "#111111", options: DEFAULT_TEXT_COLOR_OPTIONS } })} />
      <Select label="Font mode" value={layer.text.fontPolicy.mode} options={["fixed", "shopper_selectable"]} onChange={(mode) => updateText(onUpdate, { fontPolicy: mode === "fixed" ? { mode: "fixed", fontId: "sans-bold" } : { mode: "shopper_selectable", defaultFontId: "sans-bold", options: DEFAULT_FONT_FAMILY_OPTIONS } })} />
    </div>
  );
}

function TextPathControls({
  layer,
  pathEditing,
  onPathEditingChange,
  onUpdate,
}: {
  layer: TextEditorLayer;
  pathEditing: boolean;
  onPathEditingChange: (active: boolean) => void;
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
}) {
  const customPath = layer.text.path.type === "custom" ? layer.text.path : null;
  return (
    <div className="space-y-2">
      <Select label="Text path" value={layer.text.path.type} options={["straight", "arc_up", "arc_down", "circle_top", "circle_bottom", "custom"]} onChange={(type) => {
        const path = defaultPath(type as TextPath["type"]);
        updateText(onUpdate, { path, maxLines: type === "straight" ? layer.text.maxLines : 1 });
      }} />
      {layer.text.path.type === "arc_up" || layer.text.path.type === "arc_down" ? (
        <NumberInput
          label="Curve amount"
          value={layer.text.path.curveAmount}
          onChange={(curveAmount) =>
            updateText(onUpdate, {
              path: { type: layer.text.path.type as "arc_up" | "arc_down", curveAmount },
            })
          }
        />
      ) : null}
      {layer.text.path.type === "circle_top" || layer.text.path.type === "circle_bottom" ? (
        <NumberInput
          label="Radius"
          value={layer.text.path.radiusRatio}
          onChange={(radiusRatio) =>
            updateText(onUpdate, {
              path: { type: layer.text.path.type as "circle_top" | "circle_bottom", radiusRatio },
            })
          }
        />
      ) : null}
      {customPath ? (
        <div className="space-y-2">
          <button type="button" onClick={() => onPathEditingChange(!pathEditing)} className="rounded border px-3 py-2 text-sm">
            {pathEditing ? "Done" : "Edit path"}
          </button>
          <button
            type="button"
            onClick={() =>
              updateText(onUpdate, {
                path: {
                  ...customPath,
                  points: [
                    ...customPath.points,
                    {
                      id: createId("path_point"),
                      xRatio: 0.5,
                      yRatio: 0.5,
                      inHandle: { xRatio: -0.08, yRatio: 0 },
                      outHandle: { xRatio: 0.08, yRatio: 0 },
                    },
                  ],
                },
              })
            }
            className="ml-2 rounded border px-3 py-2 text-sm"
          >
            Add point
          </button>
          <p className="text-xs text-ui-fg-muted">Double click the canvas to add anchors. Drag anchors or blue handles to shape the path.</p>
        </div>
      ) : null}
    </div>
  );
}

function LayerName({ layer, onUpdate }: { layer: CustomizationLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  return <Input value={layer.name} onChange={(name) => onUpdate((current) => ({ ...current, name }) as CustomizationLayer)} />;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-ui-fg-base">{title}</p>
      <p className="mt-1 text-xs text-ui-fg-muted">{subtitle}</p>
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-md border border-ui-border-base px-2 py-1 text-sm" />;
}

function NumberInput({ label, value, onChange, disabled }: { label: string; value: number; onChange: (value: number) => void; disabled?: boolean }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <input type="number" disabled={disabled} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base disabled:bg-ui-bg-subtle" />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-medium text-ui-fg-muted">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base">
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function BackgroundUpload({ onUpload, hidden }: { onUpload: (background: BackgroundAsset) => void; hidden?: boolean }) {
  return (
    <label className={hidden ? "sr-only" : "inline-flex cursor-pointer rounded-md border border-ui-border-base px-3 py-2 text-sm"}>
      {hidden ? "Upload" : "Upload / replace"}
      <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        void fileToBackground(file).then(onUpload);
      }} />
    </label>
  );
}

function updateText(onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void, patch: Partial<TextEditorLayer["text"]>) {
  onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, ...patch } }) as CustomizationLayer);
}

function updatePathHandle(
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void,
  pointId: string,
  handle: "inHandle" | "outHandle",
  xRatio: number,
  yRatio: number,
) {
  onUpdate((current) =>
    current.type === "text" && current.text.path.type === "custom"
      ? {
          ...current,
          text: {
            ...current.text,
            path: {
              ...current.text.path,
              points: current.text.path.points.map((point) =>
                point.id === pointId ? { ...point, [handle]: { xRatio, yRatio } } : point,
              ),
            },
          },
        }
      : current,
  );
}

function defaultPath(type: TextPath["type"]): TextPath {
  if (type === "arc_up") return { type, curveAmount: 0.35 };
  if (type === "arc_down") return { type, curveAmount: 0.35 };
  if (type === "circle_top") return { type, radiusRatio: 0.5 };
  if (type === "circle_bottom") return { type, radiusRatio: 0.5 };
  if (type === "custom") return { type, points: [] };
  return { type: "straight" };
}

async function fileToBackground(file: File): Promise<BackgroundAsset> {
  const previewUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = previewUrl;
  });
  return {
    assetId: createId("background"),
    filename: file.name,
    mimeType: file.type,
    previewUrl,
    widthPx: image.naturalWidth || 900,
    heightPx: image.naturalHeight || 900,
  };
}

function shapeLabel(shape: ShapeType) {
  return shape.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function cssShapeClip(shape: ShapeType) {
  if (shape === "circle") return "circle(50% at 50% 50%)";
  if (shape === "ellipse") return "ellipse(50% 40% at 50% 50%)";
  if (shape === "star") return "polygon(50% 0%, 61% 34%, 98% 35%, 68% 56%, 79% 91%, 50% 70%, 21% 91%, 32% 56%, 2% 35%, 39% 34%)";
  if (shape === "heart") return "path('M 50 88 C 20 62 4 45 12 25 C 20 6 42 10 50 27 C 58 10 80 6 88 25 C 96 45 80 62 50 88 Z')";
  return "inset(0)";
}

function handleStyle(handle: string): React.CSSProperties {
  const base: React.CSSProperties = { transform: "translate(-50%, -50%)" };
  const map: Record<string, React.CSSProperties> = {
    nw: { left: 0, top: 0 },
    n: { left: "50%", top: 0 },
    ne: { left: "100%", top: 0 },
    e: { left: "100%", top: "50%" },
    se: { left: "100%", top: "100%" },
    s: { left: "50%", top: "100%" },
    sw: { left: 0, top: "100%" },
    w: { left: 0, top: "50%" },
    left: { left: 0, top: "50%" },
    right: { left: "100%", top: "50%" },
  };
  return { ...base, ...map[handle] };
}

function resizeRect(rect: ReturnType<typeof layerGeometryToPixels>, handle: string, dx: number, dy: number, lockRatio: boolean) {
  let xPx = rect.xPx;
  let yPx = rect.yPx;
  let widthPx = rect.widthPx;
  let heightPx = rect.heightPx;
  if (handle.includes("e") || handle === "right") widthPx += dx;
  if (handle.includes("s")) heightPx += dy;
  if (handle.includes("w") || handle === "left") {
    xPx += dx;
    widthPx -= dx;
  }
  if (handle.includes("n")) {
    yPx += dy;
    heightPx -= dy;
  }
  widthPx = Math.max(18, widthPx);
  heightPx = Math.max(18, heightPx);
  if (lockRatio && rect.widthPx > 0 && rect.heightPx > 0) {
    const ratio = rect.heightPx / rect.widthPx;
    heightPx = widthPx * ratio;
  }
  return { ...rect, xPx, yPx, widthPx, heightPx };
}
