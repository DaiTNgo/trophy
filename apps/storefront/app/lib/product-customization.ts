import { createDefaultFormValues, type BackgroundAsset, type CustomizationFormValues, type CustomizationTemplate, type ProductCustomization } from "@trophy/customization";

export type StorefrontVariantMedia = {
  assetId: string;
  contentUrl: string;
  fileName: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
};

export type StorefrontProductVariant = {
  id: number;
  title: string;
  media: StorefrontVariantMedia[];
};

export function buildProductCustomizationTemplate({
  productId,
  productTitle,
  customization,
  selectedVariant,
  selectedMedia,
}: {
  productId: number;
  productTitle: string;
  customization: ProductCustomization;
  selectedVariant: StorefrontProductVariant | null;
  selectedMedia?: StorefrontVariantMedia | null;
}): CustomizationTemplate {
  return {
    id: `product_${productId}`,
    productId: String(productId),
    name: `${productTitle} customization`,
    revision: 1,
    status: "published",
    background: getVariantBackground(selectedVariant, selectedMedia),
    layers: customization.layers,
    formFields: customization.formFields,
  };
}

export function mergeCustomizationValues(
  template: CustomizationTemplate,
  current: CustomizationFormValues | null | undefined,
) {
  const defaults = createDefaultFormValues(template);
  if (!current) return defaults;

  const nextValues: CustomizationFormValues = {};
  for (const field of template.formFields) {
    nextValues[field.id] = current[field.id] ?? defaults[field.id] ?? null;
  }
  return nextValues;
}

function getVariantBackground(
  selectedVariant: StorefrontProductVariant | null,
  selectedMedia?: StorefrontVariantMedia | null,
): BackgroundAsset | null {
  const media = selectedMedia ?? selectedVariant?.media[0];
  if (!media?.contentUrl || media.widthPx == null || media.heightPx == null) {
    return null;
  }

  return {
    assetId: media.assetId,
    previewUrl: media.contentUrl,
    filename: media.fileName,
    mimeType: media.mimeType,
    widthPx: media.widthPx,
    heightPx: media.heightPx,
  };
}
