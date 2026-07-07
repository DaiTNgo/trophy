import type {
  CustomizationDesign,
  CustomizationFormValues,
  CustomizationTemplate,
  IconFieldValue,
  RuntimeLayer,
} from "./types";
import { normalizeCropScale, normalizeCropPan } from "./geometry";
import { getFormFieldForLayer, getImageShapeSourcePolicy, getVisibleLayers } from "./template";
import { getTextValue, fitTextToLayer, normalizeTextPath } from "./text";

export const buildDesignFromForm = ({
  template,
  values,
  designId = `design_${crypto.randomUUID()}`,
  measureText,
  dynamicFonts = [],
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  designId?: string;
  measureText?: (text: string, fontSizePt: number, fontId: string) => number;
  dynamicFonts?: import("./constants").DynamicFontFamily[];
}): CustomizationDesign => {
  const layers: RuntimeLayer[] = [];
  const background = template.background ?? { widthPx: 1, heightPx: 1 };

  for (const layer of getVisibleLayers(template)) {
    if (layer.type === "text") {
      const field = getFormFieldForLayer(template, layer.id);
      if (!field) continue;
      const value = values[field.id];
      const fitted = fitTextToLayer({
        layer,
        value: getTextValue(layer, value),
        availableWidthPx: layer.geometry.widthRatio * background.widthPx,
        availableHeightPx: (layer.geometry.heightRatio ?? layer.geometry.widthRatio) * background.heightPx,
        measure: measureText,
        dynamicFonts,
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

    const sourcePolicy = getImageShapeSourcePolicy(layer);
    const field = getFormFieldForLayer(template, layer.id);
    const value = field ? values[field.id] : null;

    if (sourcePolicy === "fixed_clipart") {
      const icon = layer.fixedIcon;
      if (!icon) continue;
      layers.push({
        id: layer.id,
        layerId: layer.id,
        type: "image_shape",
        zIndex: layer.zIndex,
        geometry: layer.geometry,
        shape: layer.shape,
        assetId: icon.sourceAssetId,
        previewUrl: icon.previewUrl,
        sourceWidthPx: icon.sourceWidthPx ?? background.widthPx,
        sourceHeightPx: icon.sourceHeightPx ?? background.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        contentSource: "icon",
        iconAssetId: icon.id,
        iconName: icon.name,
        mimeType: icon.mimeType,
      });
      continue;
    }

    if (!value) continue;

    if ("source" in value && value.source === "icon") {
      const iconValue = value as IconFieldValue;
      layers.push({
        id: layer.id,
        layerId: layer.id,
        type: "image_shape",
        zIndex: layer.zIndex,
        geometry: layer.geometry,
        shape: layer.shape,
        assetId: iconValue.sourceAssetId,
        previewUrl: iconValue.previewUrl,
        sourceWidthPx: iconValue.sourceWidthPx ?? background.widthPx,
        sourceHeightPx: iconValue.sourceHeightPx ?? background.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        contentSource: "icon",
        iconAssetId: iconValue.iconAssetId,
        iconName: iconValue.iconName,
        mimeType: iconValue.mimeType,
      });
      continue;
    }

    if (!("assetId" in value) || !value.assetId) continue;
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
      contentSource: "upload",
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
