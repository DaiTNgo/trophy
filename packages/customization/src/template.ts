import type {
  ClipartCategory,
  ClipartCategoryMode,
  CustomizationLayer,
  CustomizationTemplate,
  CustomizationClipartAsset,
  ImageClipartSourcePolicy,
  ImageShapeEditorLayer,
  RuntimeImageClipartLayer,
} from "./types";

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

export const isLayerVisible = (layer: CustomizationLayer) => !layer.hidden;

export const getImageShapeSourcePolicy = (layer: ImageShapeEditorLayer): ImageClipartSourcePolicy =>
  layer.sourcePolicy ?? "upload_only";

export const getImageShapeClipartCategoryMode = (
  layer: ImageShapeEditorLayer,
): ClipartCategoryMode =>
  layer.clipartCategoryMode ?? "fixed";

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
  clipartCategoriesById,
  clipartAssets = [],
}: {
  layer: ImageShapeEditorLayer;
  fieldId?: string;
  required: boolean;
  clipartCategoriesById?: Map<string, ClipartCategory>;
  clipartAssets?: CustomizationClipartAsset[];
}): RuntimeImageClipartLayer => {
  const sourcePolicy = getImageShapeSourcePolicy(layer);
  const clipartCategoryMode = getImageShapeClipartCategoryMode(layer);
  const resolveCategory = (category: ClipartCategory | null | undefined) =>
    category ? clipartCategoriesById?.get(category.id) ?? category : undefined;

  const clipartCategory =
    clipartCategoryMode === "fixed" ? resolveCategory(layer.clipartCategory ?? undefined) : undefined;
  const allowedClipartCategories =
    clipartCategoryMode === "allow_list"
      ? (layer.allowedClipartCategories ?? [])
          .map((category) => resolveCategory(category))
          .filter((category): category is ClipartCategory => !!category)
      : [];
  const effectiveCategoryIds = new Set(
    clipartCategoryMode === "fixed"
      ? clipartCategory
        ? [clipartCategory.id]
        : []
      : allowedClipartCategories.map((category) => category.id),
  );

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
    clipartCategoryMode,
    clipartCategory,
    allowedClipartCategories,
    clipartAssets: clipartAssets.filter(
      (asset) => asset.active && effectiveCategoryIds.has(asset.categoryId),
    ),
    upload: {
      enabled: sourcePolicy === "upload_only" || sourcePolicy === "upload_or_clipart_category",
      fit: layer.upload.fit,
      panEnabled: true,
      zoomEnabled: true,
    },
  };
};
