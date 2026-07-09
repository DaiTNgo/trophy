import type {
  ClipartFieldValue,
  CustomizationDesign,
  CustomizationFormValues,
  CustomizationTemplate,
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

    const clipartValue =
      value && typeof value === "object" && "source" in value && value.source === "clipart"
        ? (value as ClipartFieldValue)
        : null;
    const fallbackClipartAsset =
      !clipartValue &&
      (sourcePolicy === "clipart_category_only" || sourcePolicy === "upload_or_clipart_category")
        ? layer.defaultClipartAsset
        : null;

    if (!value && !fallbackClipartAsset) continue;

    if (clipartValue || fallbackClipartAsset) {
      const selectedClipart = clipartValue
        ? {
            assetId: clipartValue.sourceAssetId,
            previewUrl: clipartValue.previewUrl,
            sourceWidthPx: clipartValue.sourceWidthPx,
            sourceHeightPx: clipartValue.sourceHeightPx,
            clipartAssetId: clipartValue.clipartAssetId,
            clipartAssetName: clipartValue.clipartAssetName,
            categoryId: clipartValue.categoryId,
            mimeType: clipartValue.mimeType,
          }
        : {
            assetId: fallbackClipartAsset!.sourceAssetId,
            previewUrl: fallbackClipartAsset!.previewUrl,
            sourceWidthPx: fallbackClipartAsset!.sourceWidthPx,
            sourceHeightPx: fallbackClipartAsset!.sourceHeightPx,
            clipartAssetId: fallbackClipartAsset!.id,
            clipartAssetName: fallbackClipartAsset!.name,
            categoryId: fallbackClipartAsset!.categoryId,
            mimeType: fallbackClipartAsset!.mimeType,
          };
      layers.push({
        id: layer.id,
        layerId: layer.id,
        type: "image_shape",
        zIndex: layer.zIndex,
        geometry: layer.geometry,
        shape: layer.shape,
        assetId: selectedClipart.assetId,
        previewUrl: selectedClipart.previewUrl,
        sourceWidthPx: selectedClipart.sourceWidthPx ?? background.widthPx,
        sourceHeightPx: selectedClipart.sourceHeightPx ?? background.heightPx,
        cropScale: 1,
        cropXRatio: 0,
        cropYRatio: 0,
        contentSource: "clipart",
        clipartAssetId: selectedClipart.clipartAssetId,
        clipartAssetName: selectedClipart.clipartAssetName,
        categoryId: selectedClipart.categoryId,
        mimeType: selectedClipart.mimeType,
      });
      continue;
    }

    if (!value) continue;
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
