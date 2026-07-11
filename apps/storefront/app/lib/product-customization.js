import { createDefaultFormValues } from "@trophy/customization";
export function buildProductCustomizationTemplate({ productId, productTitle, customization, selectedVariant, selectedMedia, }) {
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
export function mergeCustomizationValues(template, current) {
    const defaults = createDefaultFormValues(template);
    if (!current)
        return defaults;
    const nextValues = {};
    for (const field of template.formFields) {
        nextValues[field.id] = current[field.id] ?? defaults[field.id] ?? null;
    }
    return nextValues;
}
function getVariantBackground(selectedVariant, selectedMedia) {
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
