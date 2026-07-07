import {
  validateProductCustomizationForPublish,
  type CustomizationTemplate,
} from "@trophy/customization";

export function getProductCustomizationPublishIssue({
  productId,
  template,
  initialCustomization,
}: {
  productId: string;
  template: CustomizationTemplate;
  initialCustomization: {
    canvasWidthPx?: number | null;
    canvasHeightPx?: number | null;
  } | null | undefined;
}) {
  const canvasWidthPx = template.background?.widthPx ?? initialCustomization?.canvasWidthPx ?? null;
  const canvasHeightPx = template.background?.heightPx ?? initialCustomization?.canvasHeightPx ?? null;
  const validation = validateProductCustomizationForPublish({
    productId,
    enabled: true,
    canvasWidthPx,
    canvasHeightPx,
    layers: template.layers,
    formFields: template.formFields,
  });

  return validation.valid ? null : validation.issues[0]?.message ?? "Customization is invalid";
}
