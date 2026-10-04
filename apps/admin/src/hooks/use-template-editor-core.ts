import {
  createDefaultFormValues,
  getLayerPixelRect,
  layerPixelRectToGeometry,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ClipartFieldValue,
  type ImageShapeFieldValue,
  type ShapeType,
  type TextFieldValue,
  type VectorPoint,
} from "@trophy/customization";
import { useEffect, useState } from "react";
import {
  type RailTab,
  createDefaultTextLayer,
  createDefaultTextOnPathLayer,
  createDefaultImageShapeLayer,
  createDefaultPolygonLayer,
  createDefaultVectorShapeLayer,
} from "../components/customization/customization-template-ui";

const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

export type TemplateUpdater = (current: CustomizationTemplate) => CustomizationTemplate;

/**
 * Editor behaviour shared by the standalone product editor and the embedded
 * (create / detail) editor. The host owns where the template lives (local
 * state + save API, or a draft + onDraftChange) and exposes it through
 * `template` and `applyTemplateUpdate`.
 */
export function useTemplateEditorCore({
  template,
  applyTemplateUpdate,
}: {
  template: CustomizationTemplate;
  applyTemplateUpdate: (updater: TemplateUpdater) => void;
}) {
  const [selectedLayerId, setSelectedLayerId] = useState(template.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
  const [selectedVectorPointId, setSelectedVectorPointId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingVectorPoints, setPendingVectorPoints] = useState<VectorPoint[]>([]);
  const [previewValues, setPreviewValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(template),
  );
  const [deleted, setDeleted] = useState<{
    layer: CustomizationLayer;
    field?: CustomizationFormField;
    selectedLayerId: string;
  } | null>(null);

  useEffect(() => {
    setPreviewValues(createDefaultFormValues(template));
  }, [template.id, template.revision, template.layers, template.formFields]);

  const selectedLayer = template.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  function flashMessage(message: string) {
    setFlash(message);
    setTimeout(() => setFlash(""), 3000);
  }

  function updateTemplate(updater: TemplateUpdater) {
    applyTemplateUpdate((current) => ({ ...updater(current), status: "draft" as const }));
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

  function nextLayerPlacement() {
    return {
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    };
  }

  function addTextLayer() {
    if (!template.background) return;
    const { layer, field } = createDefaultTextLayer(nextLayerPlacement());
    addLayer(layer, field);
  }

  function addTextOnPathLayer() {
    if (!template.background) return;
    const { layer, field } = createDefaultTextOnPathLayer(nextLayerPlacement());
    addLayer(layer, field);
    setPathEditingLayerId(layer.id);
  }

  function addImageShape(shape: ShapeType) {
    if (!template.background) return;
    const { layer, field } = createDefaultImageShapeLayer(shape, nextLayerPlacement());
    addLayer(layer, field);
  }

  function addPolygon(sides: number = 6) {
    if (!template.background) return;
    const { layer, field } = createDefaultPolygonLayer(sides, nextLayerPlacement());
    addLayer(layer, field);
  }

  function startDrawMode() {
    if (!template.background) return;
    setIsDrawing(true);
    setPendingVectorPoints([]);
  }

  function cancelDrawMode() {
    setIsDrawing(false);
    setPendingVectorPoints([]);
  }

  function addVectorPoint(point: VectorPoint) {
    setPendingVectorPoints((prev) => [...prev, point]);
  }

  function undoVectorPoint() {
    setPendingVectorPoints((prev) => prev.slice(0, -1));
  }

  function closeVectorShape() {
    if (!template.background || pendingVectorPoints.length < 3) return;
    const { layer, field } = createDefaultVectorShapeLayer(pendingVectorPoints, nextLayerPlacement());
    addLayer(layer, field);
    setIsDrawing(false);
    setPendingVectorPoints([]);
  }

  function deleteSelectedLayer(id?: string) {
    const layerIdToDelete = typeof id === "string" ? id : selectedLayer?.id;
    if (!layerIdToDelete) return;
    const layer = template.layers.find((entry) => entry.id === layerIdToDelete);
    if (!layer) return;
    const field = template.formFields.find((entry) => entry.layerId === layer.id);
    setDeleted({ layer, field, selectedLayerId });
    updateTemplate((current) => ({
      ...current,
      layers: current.layers.filter((entry) => entry.id !== layer.id),
      formFields: current.formFields.filter((entry) => entry.layerId !== layer.id),
    }));
    if (selectedLayerId === layer.id) {
      setSelectedLayerId("");
    }
    flashMessage(`Deleted "${layer.name}".`);
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
    flashMessage("Layer restored.");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (isDrawing) {
          undoVectorPoint();
        } else {
          undoDelete();
        }
        return;
      }
      if (isDrawing) {
        if (event.key === "Escape") cancelDrawMode();
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
      const localBackground = template.background;
      if (!localBackground) return;
      updateLayer(selectedLayer.id, (layer) => {
        const rect = getLayerPixelRect({ layer, background: localBackground });
        const next = {
          ...rect,
          xPx: rect.xPx + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
          yPx: rect.yPx + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
        };
        const geometry = layerPixelRectToGeometry({ rect: next, layer, background: localBackground });
        return { ...layer, geometry } as CustomizationLayer;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleted, isDrawing, pathEditingLayerId, pendingVectorPoints, selectedLayer, template.background]);

  function handlePreviewChange(
    fieldId: string,
    value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null,
  ) {
    setPreviewValues((current) => ({ ...current, [fieldId]: value }));
  }

  function resetPreviewValues() {
    setPreviewValues(createDefaultFormValues(template));
  }

  return {
    template,
    selectedLayerId,
    activeTab,
    flash,
    flashMessage,
    previewOpen,
    pathEditingLayerId,
    selectedVectorPointId,
    previewValues,
    deleted,
    selectedLayer,
    isDrawing,
    pendingVectorPoints,
    setSelectedLayerId,
    setActiveTab,
    setPreviewOpen,
    setPathEditingLayerId,
    setSelectedVectorPointId,
    updateTemplate,
    updateLayer,
    updateField,
    addTextLayer,
    addTextOnPathLayer,
    addImageShape,
    addPolygon,
    startDrawMode,
    cancelDrawMode,
    addVectorPoint,
    undoVectorPoint,
    closeVectorShape,
    deleteSelectedLayer,
    undoDelete,
    handlePreviewChange,
    resetPreviewValues,
  };
}

export type TemplateEditorCore = ReturnType<typeof useTemplateEditorCore>;
