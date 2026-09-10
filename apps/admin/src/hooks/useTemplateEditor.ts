import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  createDefaultFormValues,
  getLayerPixelRect,
  layerPixelRectToGeometry,
  validateTemplateForPublish,
  type BackgroundAsset,
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
import {
  type RailTab,
  createDefaultTextLayer,
  createDefaultTextOnPathLayer,
  createDefaultImageShapeLayer,
  createDefaultPolygonLayer,
  createDefaultVectorShapeLayer,
} from "../components/customization/customization-template-ui";

import { backendFetch, BACKEND_URL } from "../lib/fetch";

const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

export function useTemplateEditor(editParam: string | null) {
  const [template, setTemplate] = useState<CustomizationTemplate>(DEFAULT_TEMPLATE);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_TEMPLATE.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
  const [selectedVectorPointId, setSelectedVectorPointId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [pendingVectorPoints, setPendingVectorPoints] = useState<VectorPoint[]>([]);
  const [previewValues, setPreviewValues] = useState<CustomizationFormValues>(() =>
    createDefaultFormValues(DEFAULT_TEMPLATE),
  );
  const [deleted, setDeleted] = useState<{
    layer: CustomizationLayer;
    field?: CustomizationFormField;
    selectedLayerId: string;
  } | null>(null);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  useEffect(() => {
    if (!editParam || editParam === "new") return;
    const target = editParam;
    let active = true;
    async function loadTemplate() {
      const endpoint = /^\d+$/.test(target)
        ? `/api/admin/customizations/templates/product/${target}`
        : `/api/admin/customizations/templates/${target}`;
      const response = await backendFetch(endpoint);
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

  async function saveDraft() {
    const response = await backendFetch(`/api/admin/customizations/templates`, {
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
    if (template.background?.pendingPdfUpload && pendingPdfFile) {
      const formData = new FormData();
      formData.append("file", pendingPdfFile);
      const thumbnailRes = await fetch(template.background.previewUrl);
      const thumbnailBlob = await thumbnailRes.blob();
      formData.append("thumbnail", thumbnailBlob, "preview.webp");

      if (template.background.widthPx) formData.append("width", String(template.background.widthPx));
      if (template.background.heightPx) formData.append("height", String(template.background.heightPx));
      if (template.background.pdfPageCount) formData.append("pageCount", String(template.background.pdfPageCount));

      const uploadRes = await backendFetch(`/api/admin/customizations/assets`, {
        method: "POST",
        headers: { "X-Upload-Token": `publish_${Date.now()}` },
        body: formData,
      });

      if (!uploadRes.ok) {
        setFlash("Failed to upload PDF background.");
        return;
      }
      const data = (await uploadRes.json()) as { asset: { id: string; contentUrl: string; previewUrl?: string } };
      updateTemplate((current) => ({
        ...current,
        background: current.background ? {
          ...current.background,
          pdfAssetId: data.asset.id,
          previewUrl: data.asset.previewUrl ? `${BACKEND_URL}${data.asset.previewUrl}` : current.background.previewUrl,
          pendingPdfUpload: false,
        } : current.background,
      }));
      setPendingPdfFile(null);
      // Let the state update, then publish in next effect or just use updated bg
      // For simplicity, we just use the updated bg directly
      template.background.pdfAssetId = data.asset.id;
      template.background.previewUrl = data.asset.previewUrl ? `${BACKEND_URL}${data.asset.previewUrl}` : template.background.previewUrl;
      template.background.pendingPdfUpload = false;
    }

    const validation = validateTemplateForPublish(template);
    if (!validation.valid) {
      setFlash(validation.issues[0]?.message ?? "Template is invalid.");
      return;
    }
    const saved = await saveDraft();
    if (!saved) return;
    const response = await backendFetch(`/api/admin/customizations/templates/${saved.id}/publish`, {
      method: "POST",
    });
    setFlash(response.ok ? "Template published." : "Failed to publish template.");
  }

  function updateBackground(background: BackgroundAsset, file?: File) {
    if (file && file.type === "application/pdf") {
      setPendingPdfFile(file);
    } else {
      setPendingPdfFile(null);
    }
    updateTemplate((current) => ({ ...current, background }));
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
      const background = template.background;
      if (!background) return;
      updateLayer(selectedLayer.id, (layer) => {
        const rect = getLayerPixelRect({ layer, background });
        const next = {
          ...rect,
          xPx: rect.xPx + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
          yPx: rect.yPx + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
        };
        const geometry = layerPixelRectToGeometry({ rect: next, layer, background });
        return { ...layer, geometry } as CustomizationLayer;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleted, pathEditingLayerId, selectedLayer, template.background]);

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
    setFlash,
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
    saveDraft,
    publish,
    updateBackground,
    handlePreviewChange,
    resetPreviewValues,
    pendingPdfFile,
  };
}
