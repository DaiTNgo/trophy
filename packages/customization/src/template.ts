import type {
  CustomizationLayer,
  CustomizationTemplate,
  ImageClipartSourcePolicy,
  ImageShapeEditorLayer,
  RuntimeImageClipartLayer,
} from "./types";

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

export const isLayerVisible = (layer: CustomizationLayer) => !layer.hidden;

export const getImageShapeSourcePolicy = (layer: ImageShapeEditorLayer): ImageClipartSourcePolicy =>
  layer.sourcePolicy ?? "upload_only";

export const layerRequiresShopperInput = (_layer: CustomizationLayer) =>
  true;

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

export const buildRuntimeImageClipartLayer = ({
  layer,
  fieldId,
  required,
}: {
  layer: ImageShapeEditorLayer;
  fieldId?: string;
  required: boolean;
}): RuntimeImageClipartLayer => {
  const sourcePolicy = getImageShapeSourcePolicy(layer);
  const allowedClipartAssets = (layer.allowedClipartAssets ?? []).filter(
    (asset) => asset.active && (!layer.clipartCategory || asset.categoryId === layer.clipartCategory.id),
  );
  const defaultClipartAsset = layer.defaultClipartAsset;

  return {
    id: layer.id,
    layerId: layer.id,
    type: "image_clipart_runtime",
    fieldId,
    required,
    geometry: layer.geometry,
    shape: layer.shape,
    sourcePolicy,
    presentation: layer.presentation,
    clipartCategory: layer.clipartCategory ?? undefined,
    defaultClipartAsset:
      defaultClipartAsset &&
      defaultClipartAsset.active &&
      (!layer.clipartCategory || defaultClipartAsset.categoryId === layer.clipartCategory.id)
        ? defaultClipartAsset
        : undefined,
    allowedClipartAssets,
    upload: {
      enabled: sourcePolicy === "upload_only" || sourcePolicy === "upload_or_clipart_category",
      fit: layer.upload.fit,
      panEnabled: true,
      zoomEnabled: true,
    },
  };
};
