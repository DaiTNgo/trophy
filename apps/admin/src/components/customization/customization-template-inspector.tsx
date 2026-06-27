import {
  DEFAULT_FONT_FAMILY_OPTIONS,
  DEFAULT_TEXT_COLOR_OPTIONS,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeEditorLayer,
  type TextEditorLayer,
  type TextPath,
  type VectorPoint,
} from "@trophy/customization";
import { Input, NumberInput, PanelTitle, Select, createId, shapeLabel } from "./customization-template-ui";

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
  const isClosedPath = layer.text.path.type === "closed_ellipse";
  return (
    <div className="space-y-5">
      <PanelTitle title="Text" subtitle={layer.name} />
      <LayerName layer={layer} onUpdate={onUpdate} />
      <PositionFields template={template} layer={layer} onUpdate={onUpdate} textOnly />
      <Input value={layer.text.sampleText} onChange={(sampleText) => onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, sampleText } }) as CustomizationLayer)} />
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="Max lines" value={isClosedPath ? 1 : layer.text.maxLines} disabled={isClosedPath} onChange={(maxLines) => updateText(onUpdate, { maxLines: layer.text.path.type === "straight" ? Math.max(1, Math.round(maxLines)) : 1 })} />
        <NumberInput label="Min font" value={layer.text.minFontSizePt} onChange={(minFontSizePt) => updateText(onUpdate, { minFontSizePt })} />
        <NumberInput label="Max font" value={layer.text.maxFontSizePt} onChange={(maxFontSizePt) => updateText(onUpdate, { maxFontSizePt })} />
        <Select label="Align" value={layer.text.align} options={["left", "center", "right", "justified"]} onChange={(align) => updateText(onUpdate, { align: align as TextEditorLayer["text"]["align"] })} />
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
              <NumberInput label="X" value={Math.round(point.xRatio * 1000) / 1000} onChange={(xRatio) => updatePoint(index, (p) => ({ ...p, xRatio }))} />
              <NumberInput label="Y" value={Math.round(point.yRatio * 1000) / 1000} onChange={(yRatio) => updatePoint(index, (p) => ({ ...p, yRatio }))} />
            </div>
            {point.type === "corner" && (
              <div className="mt-1 grid grid-cols-1 gap-1">
                <NumberInput label="Corner Radius" value={point.cornerRadius ?? 0} onChange={(cornerRadius) => updatePoint(index, (p) => ({ ...p, cornerRadius: Math.max(0, cornerRadius) }))} />
              </div>
            )}
            {point.type === "smooth" && (
              <div className="mt-1 grid grid-cols-2 gap-1">
                <NumberInput label="In X" value={Math.round((point.inHandle?.xRatio ?? 0) * 1000) / 1000} onChange={(xRatio) => updatePoint(index, (p) => ({ ...p, inHandle: { xRatio, yRatio: p.inHandle?.yRatio ?? 0 } }))} />
                <NumberInput label="In Y" value={Math.round((point.inHandle?.yRatio ?? 0) * 1000) / 1000} onChange={(yRatio) => updatePoint(index, (p) => ({ ...p, inHandle: { xRatio: p.inHandle?.xRatio ?? 0, yRatio } }))} />
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
      <NumberInput label="X" value={Math.round(rect.xPx)} onChange={(xPx) => updateRect({ xPx })} />
      <NumberInput label="Y" value={Math.round(rect.yPx)} onChange={(yPx) => updateRect({ yPx })} />
      <NumberInput label="W" value={Math.round(rect.widthPx)} onChange={(widthPx) => updateRect({ widthPx })} />
      <NumberInput label="H" value={Math.round(textOnly && layer.type === "text" && !closedTextPath ? layer.text.maxLines * layer.text.maxFontSizePt * 1.35 : rect.heightPx)} disabled={textOnly && !closedTextPath} onChange={(heightPx) => updateRect({ heightPx })} />
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
  const closedPath = layer.text.path.type === "closed_ellipse" ? layer.text.path : null;
  const customPath = layer.text.path.type === "custom" ? layer.text.path : null;
  return (
    <div className="space-y-2">
      <Select label="Text path" value={layer.text.path.type} options={["straight", "closed_ellipse"]} onChange={(type) => {
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
      {closedPath ? (
        <div className="space-y-2">
          <NumberInput
            label="Start angle"
            value={Math.round(closedPath.startAngleDeg)}
            onChange={(startAngleDeg) =>
              updateText(onUpdate, {
                path: { ...closedPath, startAngleDeg },
                maxLines: 1,
              })
            }
          />
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
  return <Input value={layer.name} onChange={(name) => onUpdate((current) => ({ ...current, name }) as CustomizationLayer)} />;
}

function updateText(onUpdate: (updater: (layer: CustomizationLayer) => CustomizationLayer) => void, patch: Partial<TextEditorLayer["text"]>) {
  onUpdate((current) => ({ ...current, text: { ...(current as TextEditorLayer).text, ...patch } }) as CustomizationLayer);
}

function defaultPath(type: TextPath["type"]): TextPath {
  if (type === "arc_up") return { type, curveAmount: 0.35 };
  if (type === "arc_down") return { type, curveAmount: 0.35 };
  if (type === "circle_top") return { type, radiusRatio: 0.5 };
  if (type === "circle_bottom") return { type, radiusRatio: 0.5 };
  if (type === "custom") return { type, points: [] };
  if (type === "closed_ellipse") {
    return {
      type,
      bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
      startAngleDeg: 180,
      direction: "clockwise",
      placement: "over_path",
    };
  }
  return { type: "straight" };
}
