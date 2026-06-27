import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { reorderWithEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/reorder-with-edge";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  FileImage,
  GripVertical,
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
  type ShapeType,
} from "@trophy/customization";
import { PanelTitle, Input, BackgroundUpload, shapeLabel, type RailTab } from "./customization-template-ui";

const SHAPES: ShapeType[] = ["rectangle", "circle", "ellipse", "rounded_rectangle", "star", "heart"];
type SortableListKind = "layers" | "form";
type DragTargetState = { sourceId: string; targetId: string; closestEdge: Edge | null };

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
  onAddText: () => void;
  onAddTextOnPath: () => void;
  onAddShape: (shape: ShapeType) => void;
  onDrawShape: () => void;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
  onUpdateField: (fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) => void;
  onDelete: () => void;
}) {
  return (
    <aside className="overflow-y-auto border-r border-ui-border-base p-4">
      {props.activeTab === "blocks" ? <BlocksPanel template={props.template} onAddText={props.onAddText} onAddTextOnPath={props.onAddTextOnPath} onAddShape={props.onAddShape} onDrawShape={props.onDrawShape} /> : null}
      {props.activeTab === "layers" ? <LayersPanel template={props.template} selectedLayerId={props.selectedLayerId} onSelectLayer={props.onSelectLayer} onUpdateTemplate={props.onUpdateTemplate} onDelete={props.onDelete} /> : null}
      {props.activeTab === "form" ? <FormPanel template={props.template} onSelectLayer={props.onSelectLayer} onUpdateField={props.onUpdateField} onUpdateTemplate={props.onUpdateTemplate} /> : null}
      {props.activeTab === "background" ? <BackgroundPanel template={props.template} onUpdateTemplate={props.onUpdateTemplate} /> : null}
    </aside>
  );
}

function BlocksPanel({ template, onAddText, onAddTextOnPath, onAddShape, onDrawShape }: { template: CustomizationTemplate; onAddText: () => void; onAddTextOnPath: () => void; onAddShape: (shape: ShapeType) => void; onDrawShape: () => void }) {
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
        <button type="button" disabled={disabled} onClick={onDrawShape} className="flex w-full items-center gap-3 rounded-md border border-dashed border-ui-border-base px-3 py-2 text-sm text-ui-fg-muted disabled:opacity-40">
          <Shapes className="size-4" /> Draw shape
        </button>
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
}: {
  template: CustomizationTemplate;
  selectedLayerId: string;
  onSelectLayer: (layerId: string) => void;
  onUpdateTemplate: (updater: (current: CustomizationTemplate) => CustomizationTemplate) => void;
  onDelete: () => void;
}) {
  const topFirst = [...template.layers].sort((a, b) => b.zIndex - a.zIndex);
  const [dragTarget, setDragTarget] = useState<DragTargetState | null>(null);
  const layerPosition = getInsertionPosition(topFirst, dragTarget);
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
  function reorder(layerId: string, targetId: string, closestEdge: Edge | null) {
    const from = topFirst.findIndex((layer) => layer.id === layerId);
    const to = topFirst.findIndex((layer) => layer.id === targetId);
    if (from < 0 || to < 0) return;
    const ordered = reorderWithEdge({
      list: topFirst,
      startIndex: from,
      indexOfTarget: to,
      closestEdgeOfTarget: closestEdge,
      axis: "vertical",
    });
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
        <SortablePanelItem
          key={layer.id}
          id={layer.id}
          kind="layers"
          isSelected={selectedLayerId === layer.id}
          isMuted={layer.hidden}
          indicator={getDropIndicator(layer.id, dragTarget, layerPosition, topFirst.length, "Layer")}
          onDragTargetChange={setDragTarget}
          onDragEnd={() => setDragTarget(null)}
          onReorder={reorder}
        >
          <div className="flex items-start gap-2">
            <DragHandle label={`Move ${layer.name}`} />
            <button type="button" onClick={() => onSelectLayer(layer.id)} className="block min-w-0 flex-1 text-left text-sm font-medium">
              {layer.name}
            </button>
          </div>
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
        </SortablePanelItem>
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
  const [dragTarget, setDragTarget] = useState<DragTargetState | null>(null);
  const fieldPosition = getInsertionPosition(fields, dragTarget);
  function reorder(fieldId: string, targetId: string, closestEdge: Edge | null) {
    const from = fields.findIndex((field) => field.id === fieldId);
    const to = fields.findIndex((field) => field.id === targetId);
    if (from < 0 || to < 0) return;
    const ordered = reorderWithEdge({
      list: fields,
      startIndex: from,
      indexOfTarget: to,
      closestEdgeOfTarget: closestEdge,
      axis: "vertical",
    });
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
        <SortablePanelItem
          key={field.id}
          id={field.id}
          kind="form"
          indicator={getDropIndicator(field.id, dragTarget, fieldPosition, fields.length, "Form")}
          onDragTargetChange={setDragTarget}
          onDragEnd={() => setDragTarget(null)}
          onReorder={reorder}
        >
          <div className="flex items-start gap-2">
            <DragHandle label={`Move ${field.label}`} />
            <button type="button" onClick={() => onSelectLayer(field.layerId)} className="min-w-0 flex-1 text-left text-sm font-medium">{field.label}</button>
          </div>
          <Input value={field.label} onChange={(label) => onUpdateField(field.id, (current) => ({ ...current, label }))} />
          <Input value={field.placeholder ?? ""} placeholder="Placeholder" onChange={(placeholder) => onUpdateField(field.id, (current) => ({ ...current, placeholder }))} />
          <textarea value={field.helpText ?? ""} placeholder="Help text" onChange={(event) => onUpdateField(field.id, (current) => ({ ...current, helpText: event.target.value }))} className="w-full rounded-md border border-ui-border-base px-2 py-1 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={field.required} onChange={(event) => onUpdateField(field.id, (current) => ({ ...current, required: event.target.checked }))} />
            Required
          </label>
        </SortablePanelItem>
      ))}
    </div>
  );
}

function SortablePanelItem({
  id,
  kind,
  isSelected = false,
  isMuted = false,
  indicator,
  children,
  onDragTargetChange,
  onDragEnd,
  onReorder,
}: {
  id: string;
  kind: SortableListKind;
  isSelected?: boolean;
  isMuted?: boolean;
  indicator: { edge: Edge; label: string } | null;
  children: ReactNode;
  onDragTargetChange: (target: DragTargetState | null) => void;
  onDragEnd: () => void;
  onReorder: (sourceId: string, targetId: string, closestEdge: Edge | null) => void;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    const dragHandle = dragHandleRef.current;
    if (!element || !dragHandle) return;
    const data = { kind, itemId: id };
    return combine(
      draggable({
        element,
        dragHandle,
        getInitialData: () => data,
        onDragStart: () => setIsDragging(true),
        onDrop: () => {
          setIsDragging(false);
          onDragEnd();
        },
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.kind === kind && source.data.itemId !== id,
        getData: ({ input }) => attachClosestEdge(data, { element, input, allowedEdges: ["top", "bottom"] }),
        onDrag: ({ self, source }) => {
          if (source.data.kind !== kind || typeof source.data.itemId !== "string") return;
          onDragTargetChange({
            sourceId: source.data.itemId,
            targetId: id,
            closestEdge: extractClosestEdge(self.data),
          });
        },
        onDragLeave: () => onDragTargetChange(null),
        onDrop: ({ self, source }) => {
          if (source.data.kind !== kind || typeof source.data.itemId !== "string") return;
          onReorder(source.data.itemId, id, extractClosestEdge(self.data));
          onDragTargetChange(null);
        },
      }),
    );
  }, [id, kind, onDragEnd, onDragTargetChange, onReorder]);

  return (
    <div
      ref={elementRef}
      className={`relative space-y-2 rounded-md border p-3 transition ${isSelected ? "border-ui-fg-interactive" : "border-ui-border-base"} ${isMuted ? "opacity-50" : ""} ${isDragging ? "opacity-40" : ""}`}
    >
      <SortableIndicator indicator={indicator} />
      <SortableHandleContext.Provider value={dragHandleRef}>{children}</SortableHandleContext.Provider>
    </div>
  );
}

const SortableHandleContext = createContext<RefObject<HTMLButtonElement | null> | null>(null);

function DragHandle({ label }: { label: string }) {
  const handleRef = useContext(SortableHandleContext);
  return (
    <button ref={handleRef} type="button" aria-label={label} className="mt-0.5 cursor-grab rounded border border-ui-border-base p-1 text-ui-fg-muted active:cursor-grabbing">
      <GripVertical className="size-3" />
    </button>
  );
}

function SortableIndicator({ indicator }: { indicator: { edge: Edge; label: string } | null }) {
  if (!indicator) return null;
  const placement = indicator.edge === "top" ? "-top-2" : "-bottom-2";
  return (
    <div className={`pointer-events-none absolute left-2 right-2 z-10 ${placement}`}>
      <div className="h-0.5 rounded-full bg-ui-fg-interactive" />
      <div className="mt-1 inline-flex rounded bg-ui-fg-interactive px-1.5 py-0.5 text-[10px] font-medium text-ui-bg-base shadow-sm">
        {indicator.label}
      </div>
    </div>
  );
}

function getInsertionPosition<T extends { id: string }>(items: T[], target: DragTargetState | null) {
  if (!target) return null;
  const startIndex = items.findIndex((item) => item.id === target.sourceId);
  const indexOfTarget = items.findIndex((item) => item.id === target.targetId);
  if (startIndex < 0 || indexOfTarget < 0) return null;
  return getReorderDestinationIndex({
    startIndex,
    indexOfTarget,
    closestEdgeOfTarget: target.closestEdge,
    axis: "vertical",
  });
}

function getDropIndicator(id: string, target: DragTargetState | null, position: number | null, total: number, label: string) {
  if (!target || target.targetId !== id || target.sourceId === id || !target.closestEdge || position === null) return null;
  return {
    edge: target.closestEdge,
    label: `${label} position ${position + 1} of ${total}`,
  };
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
