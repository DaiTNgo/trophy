import { createDefaultFormValues, type BackgroundAsset, type CustomizationFormValues, type CustomizationTemplate, type ProductCustomization } from "@trophy/customization";

export type StorefrontVariantMedia = {
  id: string;
  assetId: string;
  contentUrl: string;
  previewUrl?: string | null;
  fileName: string;
  mimeType: string;
  widthPx: number | null;
  heightPx: number | null;
  position?: number;
};

export type StorefrontProductVariant = {
  id: number;
  title: string;
  media: StorefrontVariantMedia[];
  customizationMedia: StorefrontVariantMedia | null;
};

export function buildProductMediaCarousel({
  customizationMedia,
  galleryMedia,
}: {
  customizationMedia: StorefrontVariantMedia | null | undefined;
  galleryMedia: StorefrontVariantMedia[];
}): StorefrontVariantMedia[] {
  const ordered = [
    ...(customizationMedia ? [customizationMedia] : []),
    ...[...galleryMedia].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
  ];
  const seen = new Set<string>();
  return ordered.filter((media) => {
    const key = media.assetId || media.id;
    if (seen.has(key) || !media.contentUrl) return false;
    seen.add(key);
    return true;
  });
}

export function buildProductCustomizationTemplate({
  productId,
  productTitle,
  customization,
  selectedVariant,
}: {
  productId: number;
  productTitle: string;
  customization: ProductCustomization;
  selectedVariant: StorefrontProductVariant | null;
}): CustomizationTemplate {
  return {
    id: `product_${productId}`,
    productId: String(productId),
    name: `${productTitle} customization`,
    revision: 1,
    status: "published",
    background: getVariantBackground(customization, selectedVariant),
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
  customization: ProductCustomization,
  selectedVariant: StorefrontProductVariant | null,
): BackgroundAsset | null {
  const media = selectedVariant?.customizationMedia;
  if (!media?.contentUrl || media.widthPx == null || media.heightPx == null) {
    return null;
  }

  return {
    assetId: media.assetId,
    previewUrl: media.previewUrl ?? media.contentUrl,
    contentUrl: media.contentUrl,
    filename: media.fileName,
    mimeType: media.mimeType,
    widthPx: customization.canvasWidthPx ?? media.widthPx,
    heightPx: customization.canvasHeightPx ?? media.heightPx,
  };
}
