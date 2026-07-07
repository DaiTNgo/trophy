import { useState } from "react";
import {
  DEFAULT_FONT_FAMILY_OPTIONS,
  DEFAULT_TEXT_COLOR_OPTIONS,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeEditorLayer,
  type TextEditorLayer,
  type VectorPoint,
} from "@trophy/customization";
import { Heading, Text, Input, Select, Label } from "@medusajs/ui";
import { createId, shapeLabel } from "./customization-template-ui";

export function Inspector({
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
      <div>
        <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">Canvas</Heading>
        <Text size="small" className="mt-1 text-ui-fg-muted">No layer selected.</Text>
      </div>
      <Input value={template.name} onChange={(e) => onUpdateTemplate((current) => ({ ...current, name: e.target.value }))} />
      {template.background ? <p className="text-sm text-ui-fg-muted">{template.background.widthPx} x {template.background.heightPx}px</p> : <p className="text-sm text-ui-fg-muted">Upload a background to begin.</p>}
    </div>
  );
}

import { useBrandAssets } from "../../hooks/use-brand-assets";

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
  const isClosedPath = layer.text.path.type === "closed_ellipse";
  const { colors, fonts } = useBrandAssets();

  // Map dynamic fonts/colors to the expected Select options format
  const dynamicColorOptions = [
    ...DEFAULT_TEXT_COLOR_OPTIONS,
    ...colors.map(c => ({ value: c.hexCode, label: c.name }))
  ];
  const dynamicFontOptions = [
    ...DEFAULT_FONT_FAMILY_OPTIONS,
    ...fonts.map(f => ({ value: f.id, label: f.name }))
  ];

  return (
    <div className="space-y-5">
      <div>
        <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">Text</Heading>
        <Text size="small" className="mt-1 text-ui-fg-muted">{layer.name}</Text>
      </div>
      <LayerName layer={layer} onUpdate={onUpdate} />
      <PositionFields template={template} layer={layer} onUpdate={onUpdate} textOnly />
      <Input value={layer.text.sampleText} onChange={(e) => onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, sampleText: e.target.value } }) as CustomizationLayer)} />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Max lines</Label>
          <Input type="number" value={String(isClosedPath ? 1 : layer.text.maxLines)} disabled={isClosedPath} onChange={(e) => updateText(onUpdate, { maxLines: layer.text.path.type === "straight" ? Math.max(1, Math.round(Number(e.target.value))) : 1 })} />
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Min font</Label>
          <Input type="number" value={String(layer.text.minFontSizePt)} onChange={(e) => updateText(onUpdate, { minFontSizePt: Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Max font</Label>
          <Input type="number" value={String(layer.text.maxFontSizePt)} onChange={(e) => updateText(onUpdate, { maxFontSizePt: Number(e.target.value) })} />
        </div>
      </div>
      <TextStyleControls layer={layer} onUpdate={onUpdate} colorOptions={dynamicColorOptions} fontOptions={dynamicFontOptions} />
      <TextPathControls layer={layer} pathEditing={pathEditing} onPathEditingChange={onPathEditingChange} onUpdate={onUpdate} />
    </div>
  );
}

function ImageShapeInspector({ template, layer, onUpdate }: { template: CustomizationTemplate; layer: ImageShapeEditorLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void }) {
  const { icons } = useBrandAssets();
  const activeIcons = icons.filter((icon) => icon.active);
  const selectedIconIds = new Set((layer.allowedIcons ?? []).map((icon) => icon.id));
  const sourcePolicy = layer.sourcePolicy ?? "upload_only";
  const categories = Array.from(
    new Map(
      activeIcons
        .filter((icon) => icon.categoryId && icon.categoryLabel)
        .map((icon) => [icon.categoryId as string, { id: icon.categoryId as string, label: icon.categoryLabel as string }]),
    ).values(),
  );

  function updateImageLayer(next: Partial<ImageShapeEditorLayer>) {
    onUpdate((current) => ({ ...(current as ImageShapeEditorLayer), ...next }) as CustomizationLayer);
  }

  return (
    <div className="space-y-5">
      <div>
        <Heading level="h3" className="text-sm font-semibold text-ui-fg-base">Image Shape</Heading>
        <Text size="small" className="mt-1 text-ui-fg-muted">{layer.name}</Text>
      </div>
      <LayerName layer={layer} onUpdate={onUpdate} />
      <PositionFields template={template} layer={layer} onUpdate={onUpdate} />
      <div className="space-y-1">
        <Label size="small" weight="plus" className="text-ui-fg-subtle">Source policy</Label>
        <Select
          value={sourcePolicy}
          onValueChange={(value) =>
            updateImageLayer({
            sourcePolicy: value as ImageShapeEditorLayer["sourcePolicy"],
            presentation: value === "upload_or_clipart_category" ? layer.presentation ?? "source_select" : undefined,
            fixedIcon: value === "fixed_clipart" ? layer.fixedIcon ?? activeIcons[0] ?? null : null,
            fixedCategory:
              value === "clipart_category_only" || value === "upload_or_clipart_category"
                ? layer.fixedCategory ?? categories[0] ?? null
                : null,
            allowedIcons:
              value === "fixed_clipart"
                ? layer.fixedIcon
                  ? [layer.fixedIcon]
                  : activeIcons[0]
                    ? [activeIcons[0]]
                    : []
                : layer.allowedIcons ?? [],
          })
        }
        >
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="fixed_clipart">Fixed clipart</Select.Item>
            <Select.Item value="upload_only">Upload only</Select.Item>
            <Select.Item value="clipart_category_only">Clipart category only</Select.Item>
            <Select.Item value="upload_or_clipart_category">Upload or clipart category</Select.Item>
          </Select.Content>
        </Select>
      </div>
      {sourcePolicy === "fixed_clipart" ? (
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Fixed clipart</Label>
          <Select
            value={layer.fixedIcon?.id ?? ""}
            onValueChange={(iconId) => {
              const nextIcon = activeIcons.find((icon) => icon.id === iconId) ?? null;
              updateImageLayer({
                fixedIcon: nextIcon,
                allowedIcons: nextIcon ? [nextIcon] : [],
              });
            }}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {activeIcons.map((icon) => (
                <Select.Item key={icon.id} value={icon.id}>{icon.name}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      ) : null}
      {(sourcePolicy === "clipart_category_only" || sourcePolicy === "upload_or_clipart_category") ? (
        <>
          <div className="space-y-1">
            <Label size="small" weight="plus" className="text-ui-fg-subtle">Fixed category</Label>
            <Select
              value={layer.fixedCategory?.id ?? ""}
              onValueChange={(categoryId) => {
                const nextCategory = categories.find((category) => category.id === categoryId) ?? null;
                updateImageLayer({
                  fixedCategory: nextCategory,
                  allowedIcons: activeIcons.filter((icon) => !nextCategory || icon.categoryId === nextCategory.id),
                });
              }}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {categories.map((category) => (
                  <Select.Item key={category.id} value={category.id}>{category.label}</Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-ui-fg-muted">Allowed clipart icons</p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-ui-border-base p-2">
              {activeIcons
                .filter((icon) => !layer.fixedCategory?.id || icon.categoryId === layer.fixedCategory.id)
                .map((icon) => (
                  <label key={icon.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedIconIds.has(icon.id)}
                      onChange={(event) => {
                        const current = layer.allowedIcons ?? [];
                        const next = event.target.checked
                          ? [...current, icon].filter((entry, index, array) => array.findIndex((candidate) => candidate.id === entry.id) === index)
                          : current.filter((entry) => entry.id !== icon.id);
                        updateImageLayer({ allowedIcons: next });
                      }}
                    />
                    <span>{icon.name}</span>
                  </label>
                ))}
            </div>
          </div>
        </>
      ) : null}
      {sourcePolicy === "upload_or_clipart_category" ? (
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Presentation</Label>
          <Select
            value={layer.presentation ?? "source_select"}
            onValueChange={(value) => updateImageLayer({ presentation: value as ImageShapeEditorLayer["presentation"] })}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="source_select">Source select</Select.Item>
              <Select.Item value="side_by_side">Side by side</Select.Item>
            </Select.Content>
          </Select>
        </div>
      ) : null}
      <p className="text-sm text-ui-fg-subtle">Shape: {shapeLabel(layer.shape.type)}</p>
      {layer.shape.type === "vector" && layer.shape.vectorPath ? (
        <VectorPointsTable
          vectorPath={layer.shape.vectorPath}
          onChange={(vectorPath) => onUpdate((current) => ({ ...current, shape: { ...(current as ImageShapeEditorLayer).shape, vectorPath } }) as CustomizationLayer)}
        />
      ) : (
        <>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={layer.shape.lockAspectRatio} onChange={(event) => onUpdate((current) => ({ ...current, shape: { ...(current as ImageShapeEditorLayer).shape, lockAspectRatio: event.target.checked } }) as CustomizationLayer)} />
            Lock aspect ratio
          </label>
          <p className="text-xs text-ui-fg-muted">Uploads use cover fit and clip to this shape. Shape type is fixed after creation.</p>
        </>
      )}
    </div>
  );
}

function VectorPointsTable({
  vectorPath,
  onChange,
}: {
  vectorPath: import("@trophy/customization").VectorPath;
  onChange: (path: import("@trophy/customization").VectorPath) => void;
}) {
  function updatePoint(index: number, updater: (p: VectorPoint) => VectorPoint) {
    const next = [...vectorPath.points];
    next[index] = updater(next[index]!);
    onChange({ ...vectorPath, points: next });
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase text-ui-fg-muted">Vector Points</p>
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {vectorPath.points.map((point, index) => (
          <div key={point.id} className="rounded border border-ui-border-base p-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">Point {index + 1}</span>
              <select
                value={point.type}
                onChange={(e) => updatePoint(index, (p) => ({ ...p, type: e.target.value as "corner" | "smooth", ...(e.target.value === "corner" ? { inHandle: undefined, outHandle: undefined } : { inHandle: { xRatio: -0.08, yRatio: 0 }, outHandle: { xRatio: 0.08, yRatio: 0 } }) }))}
                className="rounded border border-ui-border-base px-1 py-0.5 text-xs"
              >
                <option value="corner">Corner</option>
                <option value="smooth">Smooth</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <div className="space-y-1">
                <Label size="small" weight="plus" className="text-ui-fg-subtle">X</Label>
                <Input type="number" value={String(Math.round(point.xRatio * 1000) / 1000)} onChange={(e) => updatePoint(index, (p) => ({ ...p, xRatio: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label size="small" weight="plus" className="text-ui-fg-subtle">Y</Label>
                <Input type="number" value={String(Math.round(point.yRatio * 1000) / 1000)} onChange={(e) => updatePoint(index, (p) => ({ ...p, yRatio: Number(e.target.value) }))} />
              </div>
            </div>
            {point.type === "corner" && (
              <div className="mt-1 grid grid-cols-1 gap-1">
                <div className="space-y-1">
                  <Label size="small" weight="plus" className="text-ui-fg-subtle">Corner Radius</Label>
                  <Input type="number" value={String(point.cornerRadius ?? 0)} onChange={(e) => updatePoint(index, (p) => ({ ...p, cornerRadius: Math.max(0, Number(e.target.value)) }))} />
                </div>
              </div>
            )}
            {point.type === "smooth" && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <div className="space-y-1">
                  <Label size="small" weight="plus" className="text-ui-fg-subtle">In X</Label>
                  <Input type="number" value={String(Math.round((point.inHandle?.xRatio ?? 0) * 1000) / 1000)} onChange={(e) => updatePoint(index, (p) => ({ ...p, inHandle: { xRatio: Number(e.target.value), yRatio: p.inHandle?.yRatio ?? 0 } }))} />
                </div>
                <div className="space-y-1">
                  <Label size="small" weight="plus" className="text-ui-fg-subtle">In Y</Label>
                  <Input type="number" value={String(Math.round((point.inHandle?.yRatio ?? 0) * 1000) / 1000)} onChange={(e) => updatePoint(index, (p) => ({ ...p, inHandle: { xRatio: p.inHandle?.xRatio ?? 0, yRatio: Number(e.target.value) } }))} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PositionFields({ template, layer, onUpdate, textOnly }: { template: CustomizationTemplate; layer: CustomizationLayer; onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void; textOnly?: boolean }) {
  const background = template.background;
  if (!background) return null;
  const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
  const closedTextPath = layer.type === "text" && layer.text.path.type === "closed_ellipse";
  const updateRect = (next: Partial<typeof rect>) => {
    const merged = { ...rect, ...next };
    const geometry = pixelRectToLayerGeometry({ ...merged, heightPx: textOnly && !closedTextPath ? undefined : merged.heightPx, background });
    onUpdate((current) => ({ ...current, geometry: current.type === "text" ? { ...geometry, heightRatio: closedTextPath ? geometry.heightRatio ?? 0.1 : undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } }) as CustomizationLayer);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label size="small" weight="plus" className="text-ui-fg-subtle">X</Label>
        <Input type="number" value={String(Math.round(rect.xPx))} onChange={(e) => updateRect({ xPx: Number(e.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label size="small" weight="plus" className="text-ui-fg-subtle">Y</Label>
        <Input type="number" value={String(Math.round(rect.yPx))} onChange={(e) => updateRect({ yPx: Number(e.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label size="small" weight="plus" className="text-ui-fg-subtle">W</Label>
        <Input type="number" value={String(Math.round(rect.widthPx))} onChange={(e) => updateRect({ widthPx: Number(e.target.value) })} />
      </div>
      <div className="space-y-1">
        <Label size="small" weight="plus" className="text-ui-fg-subtle">H</Label>
        <Input type="number" value={String(Math.round(textOnly && layer.type === "text" && !closedTextPath ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx))} disabled={textOnly && !closedTextPath} onChange={(e) => updateRect({ heightPx: Number(e.target.value) })} />
      </div>
    </div>
  );
}

function TextStyleControls({ 
  layer, 
  onUpdate,
  colorOptions = DEFAULT_TEXT_COLOR_OPTIONS,
  fontOptions = DEFAULT_FONT_FAMILY_OPTIONS
}: { 
  layer: TextEditorLayer; 
  onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void;
  colorOptions?: { value: string; label: string }[];
  fontOptions?: { value: string; label: string }[];
}) {
  const [pendingColor, setPendingColor] = useState("#2563eb");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Color policy</Label>
          <Select value={layer.text.colorPolicy.mode} onValueChange={(mode) => updateText(onUpdate, { 
            colorPolicy: mode === "fixed" 
              ? { mode: "fixed", color: "#111111" } 
              : { mode: "shopper_selectable", defaultColor: "#111111", options: colorOptions } 
          })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="fixed">Fixed</Select.Item>
              <Select.Item value="shopper_selectable">Shopper selectable</Select.Item>
            </Select.Content>
          </Select>
        </div>
      {layer.text.colorPolicy.mode === "fixed" && (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={layer.text.colorPolicy.color}
            onChange={(e) => updateText(onUpdate, { colorPolicy: { mode: "fixed", color: e.target.value } })}
            className="h-8 w-8 cursor-pointer rounded border border-ui-border-base bg-transparent p-0"
          />
          <input
            type="text"
            value={layer.text.colorPolicy.color}
            onChange={(e) => updateText(onUpdate, { colorPolicy: { mode: "fixed", color: e.target.value } })}
            className="flex-1 rounded-md border border-ui-border-base px-2 py-1 text-sm"
          />
        </div>
      )}
      {layer.text.colorPolicy.mode === "shopper_selectable" && (
        <div className="space-y-3 rounded-md border border-ui-border-base bg-ui-bg-subtle p-3">
          <div>
            <p className="mb-2 text-xs font-medium text-ui-fg-muted">Preset Colors</p>
            <div className="flex flex-wrap gap-2">
              {layer.text.colorPolicy.options.map((option, index) => (
                <div key={index} className="group relative">
                  <button
                    type="button"
                    title={option.label || option.value}
                    className={`size-6 rounded-full border ${layer.text.colorPolicy.mode === "shopper_selectable" && layer.text.colorPolicy.defaultColor === option.value ? "ring-2 ring-ui-fg-interactive ring-offset-1" : "border-ui-border-base"}`}
                    style={{ backgroundColor: option.value }}
                    onClick={() => updateText(onUpdate, { colorPolicy: { ...(layer.text.colorPolicy as any), defaultColor: option.value } })}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const policy = layer.text.colorPolicy as any;
                      const nextOptions = policy.options.filter((_: any, i: number) => i !== index);
                      updateText(onUpdate, { colorPolicy: { ...policy, options: nextOptions, defaultColor: policy.defaultColor === option.value ? nextOptions[0]?.value ?? "#000000" : policy.defaultColor } });
                    }}
                    className="absolute -right-1 -top-1 hidden size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white group-hover:flex"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-ui-fg-muted">Click a color to set as default.</p>
            
            <div className="mt-3 flex items-center gap-2 rounded border border-ui-border-base bg-ui-bg-base p-1">
              <input
                type="color"
                value={pendingColor}
                onChange={(e) => setPendingColor(e.target.value)}
                className="size-6 cursor-pointer rounded bg-transparent p-0"
              />
              <button
                type="button"
                onClick={() => {
                  const policy = layer.text.colorPolicy as any;
                  if (!policy.options.some((o: any) => o.value === pendingColor)) {
                    updateText(onUpdate, { colorPolicy: { ...policy, options: [...policy.options, { value: pendingColor }] } });
                  }
                }}
                className="rounded px-2 py-1 text-xs font-medium text-ui-fg-base hover:bg-ui-bg-subtle"
              >
                Add Color
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-ui-fg-muted">
            <input
              type="checkbox"
              checked={layer.text.colorPolicy.allowCustomColor ?? false}
              onChange={(e) =>
                updateText(onUpdate, {
                  colorPolicy: { ...(layer.text.colorPolicy as any), allowCustomColor: e.target.checked },
                })
              }
            />
            Allow shopper to pick custom color
          </label>
        </div>
      )}
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Font policy</Label>
          <Select value={layer.text.fontPolicy.mode} onValueChange={(mode) => updateText(onUpdate, { 
            fontPolicy: mode === "fixed" 
              ? { mode: "fixed", fontId: "sans" } 
              : { mode: "shopper_selectable", defaultFontId: "sans", options: fontOptions } 
          })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="fixed">Fixed</Select.Item>
              <Select.Item value="shopper_selectable">Shopper selectable</Select.Item>
            </Select.Content>
          </Select>
        </div>
        {layer.text.fontPolicy.mode === "fixed" && (
          <div className="space-y-1">
            <Label size="small" weight="plus" className="text-ui-fg-subtle">Font</Label>
            <Select value={layer.text.fontPolicy.fontId} onValueChange={(fontId) => updateText(onUpdate, { fontPolicy: { mode: "fixed", fontId } })}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {fontOptions.map((opt) => (
                  <Select.Item key={opt.value ?? opt} value={opt.value ?? opt}>
                    {opt.label ?? opt}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        )}
      </div>
      <div className="space-y-2 pt-2 border-t border-ui-border-base">
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Format policy</Label>
          <Select value={layer.text.formatPolicy.mode} onValueChange={(mode) => updateText(onUpdate, { formatPolicy: mode === "fixed" ? { mode: "fixed", isBold: false, isItalic: false } : { mode: "shopper_selectable", defaultBold: false, defaultItalic: false } })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="fixed">Fixed</Select.Item>
              <Select.Item value="shopper_selectable">Shopper selectable</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="flex items-center gap-4 rounded-md border border-ui-border-base p-2 bg-ui-bg-subtle">
           <label className="flex items-center gap-1.5 text-sm font-medium"><input type="checkbox" checked={layer.text.formatPolicy.mode === "fixed" ? layer.text.formatPolicy.isBold : layer.text.formatPolicy.defaultBold} onChange={(e) => updateText(onUpdate, { formatPolicy: { ...layer.text.formatPolicy, ...(layer.text.formatPolicy.mode === "fixed" ? { isBold: e.target.checked } : { defaultBold: e.target.checked }) } as any })} className="rounded" /> B</label>
           <label className="flex items-center gap-1.5 text-sm font-medium italic"><input type="checkbox" checked={layer.text.formatPolicy.mode === "fixed" ? layer.text.formatPolicy.isItalic : layer.text.formatPolicy.defaultItalic} onChange={(e) => updateText(onUpdate, { formatPolicy: { ...layer.text.formatPolicy, ...(layer.text.formatPolicy.mode === "fixed" ? { isItalic: e.target.checked } : { defaultItalic: e.target.checked }) } as any })} className="rounded" /> I</label>
        </div>
        {layer.text.formatPolicy.mode === "shopper_selectable" && <p className="text-[10px] text-ui-fg-muted">Checkboxes set the default state for shoppers.</p>}
      </div>
      <div className="space-y-2 pt-2 border-t border-ui-border-base">
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Align policy</Label>
          <Select value={layer.text.alignPolicy.mode} onValueChange={(mode) => updateText(onUpdate, { alignPolicy: mode === "fixed" ? { mode: "fixed", align: "center" } : { mode: "shopper_selectable", defaultAlign: "center" } })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="fixed">Fixed</Select.Item>
              <Select.Item value="shopper_selectable">Shopper selectable</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Default align</Label>
          <Select value={layer.text.alignPolicy.mode === "fixed" ? layer.text.alignPolicy.align : layer.text.alignPolicy.defaultAlign} onValueChange={(align) => updateText(onUpdate, { alignPolicy: { ...layer.text.alignPolicy, ...(layer.text.alignPolicy.mode === "fixed" ? { align } : { defaultAlign: align }) } as any })}>
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="left">Left</Select.Item>
              <Select.Item value="center">Center</Select.Item>
              <Select.Item value="right">Right</Select.Item>
              <Select.Item value="justified">Justified</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>
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
  const closedPath = layer.text.path.type === "closed_ellipse" ? layer.text.path : null;
  const customPath = layer.text.path.type === "custom" ? layer.text.path : null;
  return (
    <div className="space-y-2">
      {layer.text.path.type === "arc_up" || layer.text.path.type === "arc_down" ? (
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Curve amount</Label>
          <Input
            type="number"
            value={String(layer.text.path.curveAmount)}
            onChange={(e) =>
              updateText(onUpdate, {
                path: { type: layer.text.path.type as "arc_up" | "arc_down", curveAmount: Number(e.target.value) },
              })
            }
          />
        </div>
      ) : null}
      {layer.text.path.type === "circle_top" || layer.text.path.type === "circle_bottom" ? (
        <div className="space-y-1">
          <Label size="small" weight="plus" className="text-ui-fg-subtle">Radius</Label>
          <Input
            type="number"
            value={String(layer.text.path.radiusRatio)}
            onChange={(e) =>
              updateText(onUpdate, {
                path: { type: layer.text.path.type as "circle_top" | "circle_bottom", radiusRatio: Number(e.target.value) },
              })
            }
          />
        </div>
      ) : null}
      {closedPath ? (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label size="small" weight="plus" className="text-ui-fg-subtle">Start angle</Label>
            <Input
              type="number"
              value={String(Math.round(closedPath.startAngleDeg))}
              onChange={(e) =>
                updateText(onUpdate, {
                  path: { ...closedPath, startAngleDeg: Number(e.target.value) },
                  maxLines: 1,
                })
              }
            />
          </div>
          <label className="block text-xs font-medium text-ui-fg-muted">
            Placement
            <select
              value={closedPath.placement}
              onChange={(event) =>
                updateText(onUpdate, {
                  path: { ...closedPath, placement: event.target.value as typeof closedPath.placement },
                  maxLines: 1,
                })
              }
              className="mt-1 w-full rounded-md border border-ui-border-base px-2 py-1 text-sm text-ui-fg-base"
            >
              <option value="over_path">Text over path</option>
              <option value="below_path">Text below path</option>
              <option value="in_path">Text in path</option>
            </select>
          </label>
          <p className="text-xs text-ui-fg-muted">Text follows a closed oval path. Drag the oval handles on the canvas to resize it.</p>
        </div>
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
  return <Input value={layer.name} onChange={(e) => onUpdate((current) => ({ ...current, name: e.target.value }) as CustomizationLayer)} />;
}

function updateText(onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void, patch: Partial<TextEditorLayer["text"]>) {
  onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, ...patch } }) as CustomizationLayer);
}

