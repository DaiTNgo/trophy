import type {
  CustomizationFormField,
  CustomizationFormValues,
  CustomizationTemplate,
  DynamicFontFamily,
  ImageShapeFieldValue,
} from "@trophy/customization";
import { ProductCustomizationForm } from "@trophy/customization-react";
import { QuantityInput } from "../ui/quantity-input";

export function ProductCustomizationPurchase({
  template,
  values,
  dynamicFonts,
  locale,
  message,
  quantity,
  onMessageChange,
  onDeleteImage,
  onUploadImage,
  onInteraction,
  onValueChange,
  onQuantityChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts: DynamicFontFamily[];
  locale?: string;
  message: string;
  quantity: number;
  onMessageChange: (message: string) => void;
  onDeleteImage: (field: CustomizationFormField, assetId: string) => Promise<void>;
  onUploadImage: (
    field: CustomizationFormField,
    file: File,
  ) => Promise<ImageShapeFieldValue>;
  onInteraction: () => void;
  onValueChange: (
    fieldId: string,
    value: CustomizationFormValues[string],
  ) => void;
  onQuantityChange: (quantity: number) => void;
}) {
  return (
    <div>
      <ProductCustomizationForm
        template={template}
        values={values}
        dynamicFonts={dynamicFonts}
        locale={locale}
        message={message}
        onMessageChange={onMessageChange}
        onDeleteImage={onDeleteImage}
        onUploadImage={onUploadImage}
        onInteraction={onInteraction}
        onValueChange={onValueChange}
      />
      <div className="mt-4 border-t border-border-subtle pt-4">
        <QuantityInput value={quantity} onValueChange={onQuantityChange} />
      </div>
    </div>
  );
}
