import { useMemo, useState } from "react";
import {
  getOrderedFormFields,
  validateCustomizationValues,
  type CustomizationFieldValue,
  type CustomizationFormField,
  type CustomizationFormValues,
  type CustomizationTemplate,
  type DynamicFontFamily,
} from "@trophy/customization";
import { FormField, ProductCustomizationPreview, createCustomizationInteractionHandlers } from "./index";
import type { CustomizationUploadImage, ResolveCustomizationAssetUrl, ResolveCustomizationFontUrl, ResolveCustomizationStaticFontUrl } from "./index";

export function ProductCustomizationForm({
  template,
  values,
  dynamicFonts = [],
  message,
  resolveAssetUrl,
  onMessageChange,
  onUploadImage,
  onInteraction,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  message?: string;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  onMessageChange?: (message: string) => void;
  onUploadImage?: CustomizationUploadImage;
  onInteraction?: () => void;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  const [uploadingFieldId, setUploadingFieldId] = useState("");
  const [internalMessage, setInternalMessage] = useState("");
  const activeMessage = message ?? internalMessage;
  const validation = useMemo(
    () => validateCustomizationValues({ template, values }),
    [template, values],
  );

  function setMessage(nextMessage: string) {
    setInternalMessage(nextMessage);
    onMessageChange?.(nextMessage);
  }

  async function uploadImage(field: CustomizationFormField, file: File) {
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setMessage("Use a PNG or JPEG image.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setMessage("Image exceeds the 20 MB limit.");
      return;
    }
    if (!onUploadImage) {
      setMessage("Image upload is not configured.");
      return;
    }

    setUploadingFieldId(field.id);
    try {
      const value = await onUploadImage(field, file);
      onValueChange(field.id, value);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploadingFieldId("");
    }
  }

  const orderedFields = getOrderedFormFields(template);
  const interactionHandlers = createCustomizationInteractionHandlers(onInteraction);

  return (
    <div
      className="divide-y divide-outline-variant"
      {...interactionHandlers}
    >
      {activeMessage ? (
        <p className="px-0 py-3 text-sm text-destructive">{activeMessage}</p>
      ) : null}
      {orderedFields.map((field, index) => {
        const layer = template.layers.find(
          (entry) => entry.id === field.layerId,
        );
        if (!layer) return null;
        return (
          <FormField
            key={field.id}
            field={field}
            layer={layer}
            stepNumber={index + 1}
            value={values[field.id]}
            issue={
              validation.issues.find((issue) => issue.fieldId === field.id)
                ?.message
            }
            uploading={uploadingFieldId === field.id}
            dynamicFonts={dynamicFonts}
            resolveAssetUrl={resolveAssetUrl}
            onChange={(value) => {
              onValueChange(field.id, value);
              setMessage("");
            }}
            onUpload={(file) => uploadImage(field, file)}
          />
        );
      })}
    </div>
  );
}

export function CustomizationStudio({
  template,
  values,
  dynamicFonts = [],
  selectedVariantId,
  message,
  resolveAssetUrl,
  resolveFontUrl,
  resolveStaticFontUrl,
  onMessageChange,
  onUploadImage,
  onValueChange,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
  dynamicFonts?: DynamicFontFamily[];
  selectedVariantId?: number | null;
  message?: string;
  resolveAssetUrl?: ResolveCustomizationAssetUrl;
  resolveFontUrl?: ResolveCustomizationFontUrl;
  resolveStaticFontUrl?: ResolveCustomizationStaticFontUrl;
  onMessageChange?: (message: string) => void;
  onUploadImage?: CustomizationUploadImage;
  onValueChange: (fieldId: string, value: CustomizationFieldValue) => void;
}) {
  return (
    <div className="grid min-h-0 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)]">
      <ProductCustomizationPreview
        template={template}
        values={values}
        dynamicFonts={dynamicFonts}
        selectedVariantId={selectedVariantId}
        resolveAssetUrl={resolveAssetUrl}
        resolveFontUrl={resolveFontUrl}
        resolveStaticFontUrl={resolveStaticFontUrl}
        onImageValueChange={(fieldId, value) => onValueChange(fieldId, value)}
      />
      <aside className="min-h-0 overflow-y-auto bg-white">
        <ProductCustomizationForm
          template={template}
          values={values}
          dynamicFonts={dynamicFonts}
          message={message}
          resolveAssetUrl={resolveAssetUrl}
          onMessageChange={onMessageChange}
          onUploadImage={onUploadImage}
          onValueChange={onValueChange}
        />
      </aside>
    </div>
  );
}
