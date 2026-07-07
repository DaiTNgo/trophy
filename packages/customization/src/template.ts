import type {
  CustomizationLayer,
  CustomizationTemplate,
  ImageIconSourcePolicy,
  ImageShapeEditorLayer,
  RuntimeImageIconLayer,
} from "./types";

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

export const isLayerVisible = (layer: CustomizationLayer) => !layer.hidden;

export const getImageShapeSourcePolicy = (layer: ImageShapeEditorLayer): ImageIconSourcePolicy =>
  layer.sourcePolicy ?? "upload_only";

export const isFixedClipartLayer = (layer: CustomizationLayer) =>
  layer.type === "image_shape" && getImageShapeSourcePolicy(layer) === "fixed_clipart";

export const layerRequiresShopperInput = (layer: CustomizationLayer) =>
  !(layer.type === "image_shape" && getImageShapeSourcePolicy(layer) === "fixed_clipart");

export const getVisibleLayers = (template: CustomizationTemplate) =>
  template.layers.filter(isLayerVisible).sort((a, b) => a.zIndex - b.zIndex);

export const getOrderedFormFields = (template: CustomizationTemplate) => {
  const visibleLayerIds = new Set(
    getVisibleLayers(template)
      .filter(layerRequiresShopperInput)
      .map((layer) => layer.id),
  );
  return template.formFields
    .filter((field) => visibleLayerIds.has(field.layerId))
    .sort((a, b) => a.order - b.order);
};

export const getLayerById = (template: CustomizationTemplate, layerId: string) =>
  template.layers.find((layer) => layer.id === layerId);

export const getFormFieldForLayer = (template: CustomizationTemplate, layerId: string) =>
  template.formFields.find((field) => field.layerId === layerId);

export const buildRuntimeImageIconLayer = ({
  layer,
  fieldId,
  required,
}: {
  layer: ImageShapeEditorLayer;
  fieldId?: string;
  required: boolean;
}): RuntimeImageIconLayer => {
  const sourcePolicy = getImageShapeSourcePolicy(layer);

  return {
    id: layer.id,
    layerId: layer.id,
    type: "image_icon_runtime",
    fieldId,
    required,
    geometry: layer.geometry,
    shape: layer.shape,
    sourcePolicy,
    presentation: layer.presentation,
    fixedIcon: layer.fixedIcon ?? undefined,
    fixedCategory: layer.fixedCategory ?? undefined,
    allowedIcons: (layer.allowedIcons ?? []).filter((icon) => icon.active),
    upload: {
      enabled: sourcePolicy === "upload_only" || sourcePolicy === "upload_or_clipart_category",
      fit: layer.upload.fit,
      panEnabled: true,
      zoomEnabled: true,
    },
  };
};
