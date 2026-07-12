import type {
  ClipartFieldValue,
  CustomizationFormValues,
  ImageShapeEditorLayer,
  ProductCustomization,
  CustomizationTemplate,
  ValidationIssue,
} from "./types";
import {
  getImageShapeClipartCategoryMode,
  getImageShapeSourcePolicy,
  getLayerById,
  getOrderedFormFields,
  layerRequiresShopperInput,
} from "./template";
import { isPathText, getTextValue } from "./text";

const getActiveScopedClipartCategories = (layer: ImageShapeEditorLayer) => {
  const clipartCategoryMode = getImageShapeClipartCategoryMode(layer);
  if (clipartCategoryMode === "fixed") {
    return layer.clipartCategory ? [layer.clipartCategory] : [];
  }
  return layer.allowedClipartCategories ?? [];
};

const isClipartCategoryAllowed = (layer: ImageShapeEditorLayer, categoryId: string) => {
  const clipartCategoryMode = getImageShapeClipartCategoryMode(layer);
  if (clipartCategoryMode === "fixed") {
    return layer.clipartCategory?.id === categoryId;
  }
  return (layer.allowedClipartCategories ?? []).some((category) => category.id === categoryId);
};

const collectImageLayerPolicyIssues = (layer: ImageShapeEditorLayer): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const sourcePolicy = getImageShapeSourcePolicy(layer);
  const clipartCategoryMode = getImageShapeClipartCategoryMode(layer);
  const validSourcePolicies = new Set([
    "upload_only",
    "clipart_category_only",
    "upload_or_clipart_category",
  ]);

  if (!validSourcePolicies.has(sourcePolicy)) {
    issues.push({
      code: "CLIPART_POLICY_INVALID",
      layerId: layer.id,
      message: `${layer.name} uses an unsupported source policy.`,
    });
    return issues;
  }

  if (
    sourcePolicy === "clipart_category_only" ||
    sourcePolicy === "upload_or_clipart_category"
  ) {
    if (clipartCategoryMode === "fixed" && !layer.clipartCategory) {
      issues.push({
        code: "CLIPART_POLICY_INVALID",
        layerId: layer.id,
        message: `${layer.name} needs a fixed clipart category.`,
      });
    }

    if (clipartCategoryMode === "allow_list" && (layer.allowedClipartCategories ?? []).length === 0) {
      issues.push({
        code: "CLIPART_POLICY_INVALID",
        layerId: layer.id,
        message: `${layer.name} needs at least one allowed clipart category.`,
      });
    }

    const activeScopedCategories = getActiveScopedClipartCategories(layer);
    if (activeScopedCategories.length === 0) {
      issues.push({
        code: "CLIPART_POLICY_INVALID",
        layerId: layer.id,
        message:
          clipartCategoryMode === "allow_list"
            ? `${layer.name} needs at least one allowed clipart category.`
            : `${layer.name} needs a fixed clipart category.`,
      });
    }
  }

  if (
    sourcePolicy === "upload_or_clipart_category" &&
    layer.presentation !== "source_select" &&
    layer.presentation !== "side_by_side"
  ) {
    issues.push({
      code: "CLIPART_POLICY_INVALID",
      layerId: layer.id,
      message: `${layer.name} needs a clipart presentation mode.`,
    });
  }

  return issues;
};

const collectEditorModelIssues = ({
  layers,
  formFields,
}: Pick<CustomizationTemplate, "layers" | "formFields">) => {
  const issues: ValidationIssue[] = [];

  const layerIds = new Set(layers.map((layer) => layer.id));
  const fieldLayerIds = new Set(formFields.map((field) => field.layerId));

  for (const field of formFields) {
    if (!layerIds.has(field.layerId)) {
      issues.push({
        code: "FIELD_LAYER_MISSING",
        fieldId: field.id,
        layerId: field.layerId,
        message: `${field.label} references a missing layer.`,
      });
    }
  }

  for (const layer of layers) {
    if (!layer.hidden && layerRequiresShopperInput(layer) && !fieldLayerIds.has(layer.id)) {
      issues.push({
        code: "LAYER_FIELD_MISSING",
        layerId: layer.id,
        message: `${layer.name} needs a linked form field.`,
      });
    }
    if (layer.type === "image_shape") {
      issues.push(...collectImageLayerPolicyIssues(layer));
      continue;
    }
    if (layer.type !== "text") continue;
    if (layer.text.minFontSizePt > layer.text.maxFontSizePt) {
      issues.push({
        code: "FONT_SIZE_RANGE_INVALID",
        layerId: layer.id,
        message: `${layer.name} minimum font size must be less than maximum font size.`,
      });
    }
    if (isPathText(layer) && layer.text.maxLines !== 1) {
      issues.push({
        code: "TEXT_PATH_REQUIRES_SINGLE_LINE",
        layerId: layer.id,
        message: `${layer.name} uses a text path and must be one line.`,
      });
    }
    const colorPolicy = layer.text.colorPolicy;
    if (
      colorPolicy.mode === "shopper_selectable" &&
      (colorPolicy.options.length === 0 ||
        !colorPolicy.options.some((option) => option.value === colorPolicy.defaultColor))
    ) {
      issues.push({ code: "STYLE_POLICY_INVALID", layerId: layer.id, message: `${layer.name} has invalid color options.` });
    }
    const fontPolicy = layer.text.fontPolicy;
    if (
      fontPolicy.mode === "shopper_selectable" &&
      (fontPolicy.options.length === 0 ||
        !fontPolicy.options.some((option) => option.value === fontPolicy.defaultFontId))
    ) {
      issues.push({ code: "STYLE_POLICY_INVALID", layerId: layer.id, message: `${layer.name} has invalid font options.` });
    }
  }

  return issues;
};

const collectCanvasDimensionIssues = (
  customization: Pick<ProductCustomization, "canvasWidthPx" | "canvasHeightPx">,
) => {
  const issues: ValidationIssue[] = [];
  const width = customization.canvasWidthPx;
  const height = customization.canvasHeightPx;

  if (width == null || height == null) {
    issues.push({
      code: "CANVAS_DIMENSIONS_REQUIRED",
      message: "Customization canvas dimensions are required.",
    });
    return issues;
  }

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    issues.push({
      code: "CANVAS_DIMENSIONS_INVALID",
      message: "Customization canvas dimensions must be positive integers.",
    });
  }

  return issues;
};

export const validateTemplateForPublish = (template: CustomizationTemplate) => {
  const issues: ValidationIssue[] = [];
  if (!template.background) {
    issues.push({ code: "BACKGROUND_REQUIRED", message: "A background image is required before publishing." });
  }

  issues.push(...collectEditorModelIssues(template));

  return { valid: issues.length === 0, issues };
};

export const validateProductCustomizationDraft = (
  customization: Pick<ProductCustomization, "layers" | "formFields">,
) => {
  const issues = collectEditorModelIssues(customization);
  return { valid: issues.length === 0, issues };
};

const isLocComplete = (val: any) => {
  if (typeof val === 'string') return val.trim().length > 0;
  if (!val) return false;
  return (val.vi || '').trim().length > 0 && (val.en || '').trim().length > 0;
}

export const validateProductCustomizationForPublish = (customization: ProductCustomization) => {
  const issues = [
    ...collectCanvasDimensionIssues(customization),
    ...collectEditorModelIssues(customization),
  ];

  for (const field of customization.formFields) {
    if (!isLocComplete(field.label)) {
      issues.push({ code: "LOCALIZATION_INCOMPLETE", fieldId: field.id, message: `${(field.label as any)?.vi || (field.label as any)?.en || "Field"} is missing required translations for publish (requires both Vietnamese and English).` });
    }
    if (field.placeholder && !isLocComplete(field.placeholder)) {
      issues.push({ code: "LOCALIZATION_INCOMPLETE", fieldId: field.id, message: `${(field.label as any)?.vi || "Field"} placeholder is missing required translations for publish.` });
    }
    if (field.helpText && !isLocComplete(field.helpText)) {
      issues.push({ code: "LOCALIZATION_INCOMPLETE", fieldId: field.id, message: `${(field.label as any)?.vi || "Field"} help text is missing required translations for publish.` });
    }
    if ((field as any).type === 'select') {
      for (const choice of (field as any).choices) {
        if (!isLocComplete(choice.label)) {
          issues.push({ code: "LOCALIZATION_INCOMPLETE", fieldId: field.id, message: `${(field.label as any)?.vi || "Field"} choice "${(choice.label as any)?.vi || (choice.label as any)?.en}" is missing required translations for publish.` });
        }
      }
    }
  }

    return { valid: issues.length === 0, issues };
};

export const validateCustomizationValues = ({
  template,
  values,
}: {
  template: CustomizationTemplate;
  values: CustomizationFormValues;
}) => {
  const issues: ValidationIssue[] = [];
  for (const field of getOrderedFormFields(template)) {
    const layer = getLayerById(template, field.layerId);
    if (!layer) continue;
      const value = values[field.id];
    if (layer.type === "text") {
      const textValue = getTextValue(layer, value);
      if (field.required && !textValue.text.trim()) {
        issues.push({ code: "REQUIRED_VALUE_MISSING", fieldId: field.id, layerId: layer.id, message: `${field.label} is required.` });
      }
      if (layer.text.colorPolicy.mode === "shopper_selectable" && !layer.text.colorPolicy.options.some((option) => option.value === textValue.color)) {
        issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains an unavailable color.` });
      }
      if (layer.text.fontPolicy.mode === "shopper_selectable" && !layer.text.fontPolicy.options.some((option) => option.value === textValue.fontId)) {
        issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains an unavailable font.` });
      }
    } else {
      const sourcePolicy = getImageShapeSourcePolicy(layer);
      const hasUploadValue = !!value && "assetId" in value && typeof value.assetId === "string" && value.assetId.length > 0;
      const clipartValue = value && typeof value === "object" && "source" in value && value.source === "clipart"
        ? (value as ClipartFieldValue)
        : null;

      if (field.required && !hasUploadValue && !clipartValue) {
        issues.push({ code: "REQUIRED_VALUE_MISSING", fieldId: field.id, layerId: layer.id, message: `${field.label} is required.` });
        continue;
      }

      if (!value) {
        continue;
      }

      if (clipartValue) {
        const clipartAllowed =
          sourcePolicy === "clipart_category_only" || sourcePolicy === "upload_or_clipart_category";

        if (sourcePolicy === "upload_only" || !clipartAllowed) {
          issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains unavailable clipart.` });
          continue;
        }

        if (!isClipartCategoryAllowed(layer, clipartValue.categoryId)) {
          issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} contains clipart from the wrong category.` });
        }

        continue;
      }

      if (!hasUploadValue) {
        issues.push({ code: "UPLOAD_INVALID", fieldId: field.id, layerId: layer.id, message: `${field.label} upload is invalid.` });
        continue;
      }

      if (sourcePolicy === "clipart_category_only") {
        issues.push({ code: "OPTION_NOT_ALLOWED", fieldId: field.id, layerId: layer.id, message: `${field.label} does not allow image uploads.` });
      }
    }
  }
  return { valid: issues.length === 0, issues };
};
