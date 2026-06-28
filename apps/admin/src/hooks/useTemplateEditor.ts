import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  createDefaultFormValues,
  layerGeometryToPixels,
  pixelRectToLayerGeometry,
  validateTemplateForPublish,
  type BackgroundAsset,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationLayer,
  type CustomizationTemplate,
  type ImageShapeFieldValue,
  type ShapeType,
  type TextFieldValue,
  type VectorPoint,
} from "@trophy/customization";
import { createId, shapeLabel, type RailTab } from "../components/customization/customization-template-ui";

import { backendFetch, BACKEND_URL } from "../lib/fetch";

const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

export function useTemplateEditor(editParam: string | null) {
  const [template, setTemplate] = useState<CustomizationTemplate>(DEFAULT_TEMPLATE);
  const [selectedLayerId, setSelectedLayerId] = useState(DEFAULT_TEMPLATE.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
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
        ? `/api/customizations/templates/product/${target}`
        : `/api/customizations/templates/${target}`;
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

  function addTextOnPathLayer() {
    if (!template.background) return;
    const id = createId("text_path");
    addLayer(
      {
        id,
        name: "Text on path",
        type: "text",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.34, heightRatio: 0.18, rotationDeg: 0 },
        text: {
          sampleText: "YOUR TEXT",
          maxLines: 1,
          minFontSizePt: 8,
          maxFontSizePt: 20,
          align: "center",
          colorPolicy: { mode: "fixed", color: "#111111" },
          fontPolicy: { mode: "fixed", fontId: "sans-bold" },
          path: {
            type: "closed_ellipse",
            bounds: { xRatio: 0.5, yRatio: 0.5, widthRatio: 1, heightRatio: 1 },
            startAngleDeg: 180,
            direction: "clockwise",
            placement: "over_path",
          },
        },
      },
      {
        id: createId("field"),
        layerId: id,
        label: "Text on path",
        placeholder: "YOUR TEXT",
        required: true,
        order: template.formFields.length + 1,
      },
    );
    setPathEditingLayerId(id);
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
    const id = createId("image_shape");
    
    // Calculate bounding box of pendingVectorPoints
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    pendingVectorPoints.forEach(p => {
      if (p.xRatio < minX) minX = p.xRatio;
      if (p.xRatio > maxX) maxX = p.xRatio;
      if (p.yRatio < minY) minY = p.yRatio;
      if (p.yRatio > maxY) maxY = p.yRatio;
    });
    
    // Calculate layer geometry
    const widthRatio = Math.max(0.01, maxX - minX);
    const heightRatio = Math.max(0.01, maxY - minY);
    const xRatio = minX + widthRatio / 2;
    const yRatio = minY + heightRatio / 2;
    
    // Normalize points to layer bounds (0 to 1)
    const normalizedPoints = pendingVectorPoints.map(p => ({
      ...p,
      xRatio: (p.xRatio - minX) / widthRatio,
      yRatio: (p.yRatio - minY) / heightRatio,
    }));
    
    addLayer(
      {
        id,
        name: "Vector shape",
        type: "image_shape",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio, yRatio, widthRatio, heightRatio, rotationDeg: 0 },
        shape: { type: "vector", lockAspectRatio: true, vectorPath: { points: normalizedPoints, closed: true } },
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
    setIsDrawing(false);
    setPendingVectorPoints([]);
  }

  function addPolygon(sides: number | any = 6) {
    if (!template.background) return;
    const actualSides = typeof sides === "number" ? sides : 6;
    const id = createId("image_shape");
    // Generate a regular polygon with `actualSides` vertices centered at (0.5, 0.5) with radius 0.4
    const radius = 0.4;
    const cx = 0.5;
    const cy = 0.5;
    const polygonPoints: VectorPoint[] = Array.from({ length: actualSides }, (_, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / actualSides;
      return {
        id: createId("vector_point"),
        type: "corner" as const,
        xRatio: cx + Math.cos(angle) * radius,
        yRatio: cy + Math.sin(angle) * radius,
      };
    });
    addLayer(
      {
        id,
        name: `Polygon (${sides})`,
        type: "image_shape",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.25, heightRatio: 0.25, rotationDeg: 0 },
        shape: { type: "vector", lockAspectRatio: false, vectorPath: { points: polygonPoints, closed: true } },
        upload: { fit: "cover", defaultCrop: { scale: 1, xRatio: 0, yRatio: 0 } },
      },
      {
        id: createId("field"),
        layerId: id,
        label: "Upload image",
        helpText: "Your image will be clipped to the polygon shape.",
        required: false,
        order: template.formFields.length + 1,
      },
    );
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
    const response = await backendFetch(`/api/customizations/templates`, {
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
      formData.append("thumbnail", thumbnailBlob, "preview.png");

      if (template.background.widthPx) formData.append("width", String(template.background.widthPx));
      if (template.background.heightPx) formData.append("height", String(template.background.heightPx));
      if (template.background.pdfPageCount) formData.append("pageCount", String(template.background.pdfPageCount));

      const uploadRes = await backendFetch(`/api/customizations/assets`, {
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
    const response = await backendFetch(`/api/customizations/templates/${saved.id}/publish`, {
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
        const rect = layerGeometryToPixels({ geometry: layer.geometry, background });
        const next = {
          ...rect,
          xPx: rect.xPx + (event.key === "ArrowLeft" ? -delta : event.key === "ArrowRight" ? delta : 0),
          yPx: rect.yPx + (event.key === "ArrowUp" ? -delta : event.key === "ArrowDown" ? delta : 0),
        };
        const geometry = pixelRectToLayerGeometry({
          ...next,
          heightPx: layer.type === "image_shape" || (layer.type === "text" && layer.text.path.type === "closed_ellipse") ? next.heightPx : undefined,
          background,
        });
        return { ...layer, geometry: layer.type === "text" ? { ...geometry, heightRatio: layer.text.path.type === "closed_ellipse" ? geometry.heightRatio ?? 0.1 : undefined } : { ...geometry, heightRatio: geometry.heightRatio ?? 0.1 } } as CustomizationLayer;
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleted, pathEditingLayerId, selectedLayer, template.background]);

  function handlePreviewChange(fieldId: string, value: TextFieldValue | ImageShapeFieldValue | null) {
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
