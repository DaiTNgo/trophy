import type { CustomizationLayer, CustomizationTemplate } from "./types";

export const normalizeSingleLine = (value: string) =>
  value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();

export const isLayerVisible = (layer: CustomizationLayer) => !layer.hidden;

export const getVisibleLayers = (template: CustomizationTemplate) =>
  template.layers.filter(isLayerVisible).sort((a, b) => a.zIndex - b.zIndex);

export const getOrderedFormFields = (template: CustomizationTemplate) => {
  const visibleLayerIds = new Set(getVisibleLayers(template).map((layer) => layer.id));
  return template.formFields
    .filter((field) => visibleLayerIds.has(field.layerId))
    .sort((a, b) => a.order - b.order);
};

export const getLayerById = (template: CustomizationTemplate, layerId: string) =>
  template.layers.find((layer) => layer.id === layerId);

export const getFormFieldForLayer = (template: CustomizationTemplate, layerId: string) =>
  template.formFields.find((field) => field.layerId === layerId);
