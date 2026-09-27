import {
  createDefaultFormValues,
  getLayerPixelRect,
  layerPixelRectToGeometry,
  type BackgroundAsset,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ClipartFieldValue,
  type ImageShapeFieldValue,
  type ProductCustomization,
  type ShapeType,
  type TextFieldValue,
  type VectorPoint,
} from "@trophy/customization";
import { useEffect, useMemo, useState } from "react";
import {
  type RailTab,
  createDefaultTextLayer,
  createDefaultTextOnPathLayer,
  createDefaultImageShapeLayer,
  createDefaultPolygonLayer,
  createDefaultVectorShapeLayer,
} from "../components/customization/customization-template-ui";

type EmbeddedCustomizationDraft = Pick<
  ProductCustomization,
  "enabled" | "canvasWidthPx" | "canvasHeightPx" | "layers" | "formFields"
>;

const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

const toTemplate = ({
  productTitle,
  productId,
  background,
  draft,
}: {
  productTitle: string;
  productId: string;
  background: BackgroundAsset | null;
  draft: EmbeddedCustomizationDraft;
}): CustomizationTemplate => ({
  id: `embedded_${productId || "draft"}`,
  productId,
  name: productTitle.trim() || "Product customization",
  revision: 1,
  status: "draft",
  background,
  layers: draft.layers,
  formFields: draft.formFields,
});

export function useEmbeddedProductCustomizationEditor({
  productTitle,
  productId,
  background,
  draft,
  onDraftChange,
}: {
  productTitle: string;
  productId: string;
  background: BackgroundAsset | null;
  draft: EmbeddedCustomizationDraft;
  onDraftChange: (draft: EmbeddedCustomizationDraft) => void;
}) {
  const baseTemplate = useMemo(
    () => toTemplate({ productTitle, productId, background, draft }),
    [background, draft, productId, productTitle],
  );
  const [template, setTemplate] = useState<CustomizationTemplate>(baseTemplate);
  const [selectedLayerId, setSelectedLayerId] = useState(baseTemplate.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
  const [selectedVectorPointId, setSelectedVectorPointId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingVectorPoints, setPendingVectorPoints] = useState<VectorPoint[]>([]);
  const [previewValues, setPreviewValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(baseTemplate),
  );
  const [deleted, setDeleted] = useState<{
    layer: CustomizationLayer;
    field?: CustomizationFormField;
    selectedLayerId: string;
  } | null>(null);

  useEffect(() => {
    setTemplate((current) => ({
      ...current,
      name: baseTemplate.name,
      productId: baseTemplate.productId,
      background: baseTemplate.background,
      layers: draft.layers,
      formFields: draft.formFields,
    }));
  }, [baseTemplate.background, baseTemplate.name, baseTemplate.productId, draft.formFields, draft.layers]);

  useEffect(() => {
    setPreviewValues(createDefaultFormValues(template));
  }, [template.id, template.revision, template.layers, template.formFields]);

  const selectedLayer = template.layers.find((layer) => layer.id === selectedLayerId) ?? null;

  function pushDraft(nextTemplate: CustomizationTemplate) {
    onDraftChange({
      enabled: true,
      canvasWidthPx: nextTemplate.background?.widthPx ?? draft.canvasWidthPx,
      canvasHeightPx: nextTemplate.background?.heightPx ?? draft.canvasHeightPx,
      layers: nextTemplate.layers,
      formFields: nextTemplate.formFields,
    });
  }

  function updateTemplate(updater: (current: CustomizationTemplate) => CustomizationTemplate) {
    setTemplate((current) => {
      const nextTemplate = { ...updater(current), status: "draft" as const };
      pushDraft(nextTemplate);
      return nextTemplate;
    });
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
    const { layer, field } = createDefaultTextLayer({
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    });
    addLayer(layer, field);
  }

  function addTextOnPathLayer() {
    if (!template.background) return;
    const { layer, field } = createDefaultTextOnPathLayer({
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    });
    addLayer(layer, field);
    setPathEditingLayerId(layer.id);
  }

  function addImageShape(shape: ShapeType) {
    if (!template.background) return;
    const { layer, field } = createDefaultImageShapeLayer(shape, {
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    });
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
    const { layer, field } = createDefaultVectorShapeLayer(pendingVectorPoints, {
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    });
    addLayer(layer, field);
    setIsDrawing(false);
    setPendingVectorPoints([]);
  }

  function addPolygon(sides: number = 6) {
    if (!template.background) return;
    const { layer, field } = createDefaultPolygonLayer(sides, {
      zIndex: maxZ(template.layers) + 1,
      order: template.formFields.length + 1,
    });
    addLayer(layer, field);
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

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoDelete();
        return;
      }
      if (isDrawing) {
        if (event.key === "Escape") {
          cancelDrawMode();
          return;
        }
        if (event.key === "z" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          undoVectorPoint();
          return;
        }
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
        return {
          ...layer,
          geometry,
        } as CustomizationLayer;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleted, isDrawing, pathEditingLayerId, selectedLayer, template.background]);

  function handlePreviewChange(fieldId: string, value: TextFieldValue | ImageShapeFieldValue | ClipartFieldValue | null) {
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
    pathEditingLayerId,
    selectedVectorPointId,
    previewValues,
    deleted,
    selectedLayer,
    isDrawing,
    pendingVectorPoints,
    setSelectedLayerId,
    setActiveTab,
    setFlash,
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
