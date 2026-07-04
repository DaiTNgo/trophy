import { useEffect, useState } from "react";
import {
  DEFAULT_TEMPLATE,
  createDefaultFormValues,
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

const maxZ = (layers: CustomizationLayer[]) => layers.length > 0 ? Math.max(...layers.map((layer) => layer.zIndex)) : 0;

export function useProductCustomizationEditor(
  productId: string,
  initialCustomization: any,
  saveCustomization: (customization: any) => Promise<void>
) {
  const [template, setTemplate] = useState<CustomizationTemplate>(() => {
    if (initialCustomization?.enabled) {
      return {
        id: productId,
        productId,
        name: "Product Customization",
        revision: 1,
        status: "draft",
        background: null,
        layers: initialCustomization.layers || [],
        formFields: initialCustomization.formFields || [],
      };
    }
    return {
      ...DEFAULT_TEMPLATE,
      id: productId,
      productId,
    };
  });
  
  const [selectedLayerId, setSelectedLayerId] = useState(template.layers[0]?.id ?? "");
  const [activeTab, setActiveTab] = useState<RailTab>("blocks");
  const [flash, setFlash] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pathEditingLayerId, setPathEditingLayerId] = useState("");
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
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  useEffect(() => {
    setPreviewValues(createDefaultFormValues(template));
  }, [template]);

  function flashMessage(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(""), 3000);
  }

  function updateTemplate(updater: (current: CustomizationTemplate) => CustomizationTemplate) {
    setTemplate(updater);
  }

  function updateLayer(layerId: string, updater: (layer: CustomizationLayer) => CustomizationLayer) {
    updateTemplate((current) => ({
      ...current,
      layers: current.layers.map((l) => (l.id === layerId ? updater(l) : l)),
    }));
  }

  function updateField(fieldId: string, updater: (field: CustomizationFormField) => CustomizationFormField) {
    updateTemplate((current) => ({
      ...current,
      formFields: current.formFields.map((f) => (f.id === fieldId ? updater(f) : f)),
    }));
  }

  const selectedLayer = template.layers.find((l) => l.id === selectedLayerId);

  function addTextLayer() {
    const id = createId("layer");
    const fieldId = createId("field");
    const newLayer: CustomizationLayer = {
      id,
      type: "text",
      name: "New text",
      geometry: { xRatio: 0.1, yRatio: 0.1, widthRatio: 0.8, rotationDeg: 0 },
      zIndex: maxZ(template.layers) + 1,
      hidden: false,
      locked: false,
      text: {
        sampleText: "Sample",
        maxLines: 1,
        minFontSizePt: 12,
        maxFontSizePt: 72,
        alignPolicy: { mode: "fixed", align: "left" },
        colorPolicy: { mode: "fixed", color: "#000000" },
        fontPolicy: { mode: "fixed", fontId: "inter" },
        formatPolicy: { mode: "fixed", isBold: false, isItalic: false, isUnderline: false },
        path: { type: "straight" },
      }
    };
    const newField: CustomizationFormField = {
      id: fieldId,
      layerId: id,
      type: "text",
      label: "New text",
      required: false,
      order: template.formFields.length + 1,
    } as any;
    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, newLayer],
      formFields: [...current.formFields, newField],
    }));
    setSelectedLayerId(id);
  }

  function addTextOnPathLayer() {
    addTextLayer(); // simplified for now
  }

  function addImageShape(shapeType: ShapeType) {
    const id = createId("layer");
    const fieldId = createId("field");
    const newLayer: CustomizationLayer = {
      id,
      type: "image_shape",
      name: shapeLabel(shapeType),
      geometry: { xRatio: 0.25, yRatio: 0.25, widthRatio: 0.5, heightRatio: 0.5, rotationDeg: 0 },
      zIndex: maxZ(template.layers) + 1,
      hidden: false,
      locked: false,
      shape: {
        type: shapeType,
        lockAspectRatio: false,
      },
      upload: {
        fit: "cover"
      }
    };
    const newField: CustomizationFormField = {
      id: fieldId,
      layerId: id,
      type: "image",
      label: shapeLabel(shapeType),
      required: false,
      order: template.formFields.length + 1,
    } as any;
    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, newLayer],
      formFields: [...current.formFields, newField],
    }));
    setSelectedLayerId(id);
  }

  function addPolygon() {
    setIsDrawing(true);
    setPendingVectorPoints([]);
    setSelectedLayerId("");
  }

  function startDrawMode() {
    setIsDrawing(true);
    setPendingVectorPoints([]);
    setSelectedLayerId("");
  }

  function cancelDrawMode() {
    setIsDrawing(false);
    setPendingVectorPoints([]);
    if (template.layers.length > 0) {
      setSelectedLayerId(template.layers[template.layers.length - 1].id);
    }
  }

  function addVectorPoint(pt: { xRatio: number; yRatio: number }) {
    setPendingVectorPoints((prev) => [
      ...prev,
      {
        id: createId("point"),
        type: "corner",
        xRatio: pt.xRatio,
        yRatio: pt.yRatio,
      },
    ]);
  }

  function undoVectorPoint() {
    setPendingVectorPoints((prev) => prev.slice(0, -1));
  }

  function closeVectorShape() {
    if (pendingVectorPoints.length < 3) {
      cancelDrawMode();
      return;
    }
    const id = createId("layer");
    const fieldId = createId("field");
    const xs = pendingVectorPoints.map((p) => p.xRatio);
    const ys = pendingVectorPoints.map((p) => p.yRatio);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const newLayer: CustomizationLayer = {
      id,
      type: "image_shape",
      name: "Custom Shape",
      geometry: {
        xRatio: minX,
        yRatio: minY,
        widthRatio: maxX - minX,
        heightRatio: maxY - minY,
        rotationDeg: 0,
      },
      zIndex: maxZ(template.layers) + 1,
      hidden: false,
      locked: false,
      shape: {
        type: "vector",
        lockAspectRatio: false,
        vectorPath: {
          closed: true,
          points: pendingVectorPoints.map((p) => ({
            ...p,
            xRatio: (p.xRatio - minX) / (maxX - minX),
            yRatio: (p.yRatio - minY) / (maxY - minY),
          })),
        }
      },
      upload: {
        fit: "cover"
      }
    };

    const newField: CustomizationFormField = {
      id: fieldId,
      layerId: id,
      type: "image",
      label: "Custom Shape",
      required: false,
      order: template.formFields.length + 1,
    } as any;

    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, newLayer],
      formFields: [...current.formFields, newField],
    }));

    setIsDrawing(false);
    setPendingVectorPoints([]);
    setSelectedLayerId(id);
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) return;
    const layer = template.layers.find((l) => l.id === selectedLayerId);
    if (!layer) return;
    
    const field = template.formFields.find((f) => f.layerId === layer.id);

    setDeleted({ layer, field, selectedLayerId });
    updateTemplate((current) => ({
      ...current,
      layers: current.layers.filter((l) => l.id !== selectedLayerId),
      formFields: current.formFields.filter((f) => f.id !== field?.id),
    }));
    setSelectedLayerId("");
    flashMessage("Layer deleted.");
  }

  function undoDelete() {
    if (!deleted) return;
    updateTemplate((current) => ({
      ...current,
      layers: [...current.layers, deleted.layer].sort((a, b) => a.zIndex - b.zIndex),
      formFields: deleted.field ? [...current.formFields, deleted.field] : current.formFields,
    }));
    setSelectedLayerId(deleted.selectedLayerId);
    setDeleted(null);
    flashMessage("Layer restored.");
  }

  async function saveDraft() {
    try {
      await saveCustomization({
        enabled: true,
        canvasWidthPx: template.background?.widthPx || initialCustomization?.canvasWidthPx || 1000,
        canvasHeightPx: template.background?.heightPx || initialCustomization?.canvasHeightPx || 1000,
        layers: template.layers,
        formFields: template.formFields,
      });
      flashMessage("Saved");
    } catch (e: any) {
      console.error(e);
      flashMessage("Error saving");
    }
  }

  async function publish() {
    try {
      await saveDraft();
      flashMessage("Published");
    } catch (e: any) {
      if (e instanceof Error && e.message) {
        alert(e.message);
      } else {
        alert(e.error || "Unknown error");
      }
    }
  }

  function updateBackground(asset: any, pdfFile?: File) {
    if (pdfFile) {
      setPendingPdfFile(pdfFile);
    }
    updateTemplate((current) => ({
      ...current,
      background: {
        ...asset,
        pendingPdfUpload: !!pdfFile,
      },
    }));
  }

  function handlePreviewChange(fieldId: string, value: any) {
    setPreviewValues((prev) => {
      const field = template.formFields.find((f) => f.id === fieldId);
      if (!field) return prev;
      if ((field as any).type === "text") {
        const next = { ...prev };
        next[fieldId] = { ...((next[fieldId] as TextFieldValue) || {}), text: value ?? "" };
        return next;
      }
      if ((field as any).type === "image") {
        const next = { ...prev };
        next[fieldId] = { ...((next[fieldId] as ImageShapeFieldValue) || {}), assetId: value ?? "" };
        return next;
      }
      return prev;
    });
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
