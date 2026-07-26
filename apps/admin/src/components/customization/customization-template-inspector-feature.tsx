import {
  type CustomizationLayer,
  type CustomizationTemplate,
} from "@trophy/customization";
import {
  CanvasInspector,
  ImageShapeInspector,
  TextInspector,
} from "./customization-template-inspector-sections";

export function Inspector({
  template,
  selectedLayer,
  selectedVectorPointId,
  pathEditingLayerId,
  onUpdateLayer,
  onPathEditingLayerChange,
  onUpdateTemplate,
}: {
  template: CustomizationTemplate;
  selectedLayer: CustomizationLayer | null;
  selectedVectorPointId: string | null;
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
      {selectedLayer?.type === "image_shape" ? <ImageShapeInspector template={template} layer={selectedLayer} selectedVectorPointId={selectedVectorPointId} onUpdate={(updater) => onUpdateLayer(selectedLayer.id, updater)} /> : null}
    </aside>
  );
}
