import type {
  CustomizationDesign,
  CustomizationFormValues,
  CustomizationTemplate,
  RuntimeLayer,
} from "./types";
import { normalizeCropScale, normalizeCropPan } from "./geometry";
import { getVisibleLayers } from "./template";
import { getTextValue, fitTextToLayer, normalizeTextPath } from "./text";

export const buildDesignFromForm = ({
  template,
  values,
  designId = `design_${crypto.randomUUID()}`,
  measureText,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  designId?: string;
  measureText?: (text: string, fontSizePt: number, fontId: string) => number;
}): CustomizationDesign => {
  const layers: RuntimeLayer[] = [];
  const fieldsByLayerId = new Map(template.formFields.map((field) => [field.layerId, field]));
  const background = template.background ?? { widthPx: 1, heightPx: 1 };

  for (const layer of getVisibleLayers(template)) {
    const field = fieldsByLayerId.get(layer.id);
    if (!field) continue;
    const value = values[field.id];
    if (layer.type === "text") {
      const fitted = fitTextToLayer({
        layer,
        value: getTextValue(layer, value),
        availableWidthPx: layer.geometry.widthRatio * background.widthPx,
        measure: measureText,
      });
      if (!fitted.text) continue;
      layers.push({
        id: layer.id,
        layerId: layer.id,
        type: "text",
        geometry: layer.geometry,
        zIndex: layer.zIndex,
        path: normalizeTextPath(layer.text.path),
        ...fitted,
      });
      continue;
    }

    if (!value || !("assetId" in value) || !value.assetId) continue;
    layers.push({
      id: layer.id,
      layerId: layer.id,
      type: "image_shape",
      zIndex: layer.zIndex,
      geometry: layer.geometry,
      shape: layer.shape,
      assetId: value.assetId,
      previewUrl: value.previewUrl,
      sourceWidthPx: value.sourceWidthPx,
      sourceHeightPx: value.sourceHeightPx,
      cropScale: normalizeCropScale(value.cropScale),
      cropXRatio: normalizeCropPan(value.cropXRatio),
      cropYRatio: normalizeCropPan(value.cropYRatio),
    });
  }

  return {
    id: designId,
    productId: template.productId,
    templateId: template.id,
    templateRevision: template.revision,
    revision: 1,
    status: "draft",
    values,
    layers,
  };
};
