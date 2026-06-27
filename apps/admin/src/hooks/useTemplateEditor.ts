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
  type CustomShape,
  type ImageShapeFieldValue,
  type ShapeType,
  type TextFieldValue,
} from "@trophy/customization";
import { createId, shapeLabel, type RailTab } from "../components/customization/customization-template-ui";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";

const maxZ = (layers: CustomizationLayer[]) => Math.max(0, ...layers.map((layer) => layer.zIndex));

export function useTemplateEditor(editParam: string | null) {
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

  function addCustomShape(customShape: CustomShape) {
    if (!template.background) return;
    const id = createId("image_shape");
    addLayer(
      {
        id,
        name: customShape.name,
        type: "image_shape",
        hidden: false,
        locked: false,
        zIndex: maxZ(template.layers) + 1,
        geometry: { xRatio: 0.5, yRatio: 0.5, widthRatio: 0.2, heightRatio: 0.2, rotationDeg: 0 },
        shape: { type: "custom_svg", lockAspectRatio: true, customShapeId: customShape.id },
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

  function updateBackground(background: BackgroundAsset) {
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
    addCustomShape,
    deleteSelectedLayer,
    undoDelete,
    saveDraft,
    publish,
    updateBackground,
    handlePreviewChange,
    resetPreviewValues,
  };
}
