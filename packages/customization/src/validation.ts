import type {
  CustomizationFormValues,
  CustomizationTemplate,
  ValidationIssue,
} from "./types";
import { getOrderedFormFields, getLayerById } from "./template";
import { isPathText, getTextValue } from "./text";

export const validateTemplateForPublish = (template: CustomizationTemplate) => {
  const issues: ValidationIssue[] = [];
  if (!template.background) {
    issues.push({ code: "BACKGROUND_REQUIRED", message: "A background image is required before publishing." });
  }

  const layerIds = new Set(template.layers.map((layer) => layer.id));
  const fieldLayerIds = new Set(template.formFields.map((field) => field.layerId));

  for (const field of template.formFields) {
    if (!layerIds.has(field.layerId)) {
      issues.push({
        code: "FIELD_LAYER_MISSING",
        fieldId: field.id,
        layerId: field.layerId,
        message: `${field.label} references a missing layer.`,
      });
    }
  }

  for (const layer of template.layers) {
    if (!layer.hidden && !fieldLayerIds.has(layer.id)) {
      issues.push({
        code: "LAYER_FIELD_MISSING",
        layerId: layer.id,
        message: `${layer.name} needs a linked form field.`,
      });
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
    } else if (field.required && (!value || !("assetId" in value) || !value.assetId)) {
      issues.push({ code: "REQUIRED_VALUE_MISSING", fieldId: field.id, layerId: layer.id, message: `${field.label} is required.` });
    } else if (value && (!("assetId" in value) || !value.assetId)) {
      issues.push({ code: "UPLOAD_INVALID", fieldId: field.id, layerId: layer.id, message: `${field.label} upload is invalid.` });
    }
  }
  return { valid: issues.length === 0, issues };
};

const ALLOWED_SVG_COMMANDS = new Set(["M", "L", "C", "Q", "A", "Z", "z", "H", "V", "S", "T"]);

export const validateSvgPathData = (d: string): { valid: boolean; error?: string } => {
  if (!d || d.length > 5000) {
    return { valid: false, error: d?.length > 5000 ? "Path data exceeds 5000 character limit." : "Path data is empty." };
  }
  const commands = d.match(/[A-Za-z]/g) ?? [];
  for (const cmd of commands) {
    if (!ALLOWED_SVG_COMMANDS.has(cmd)) {
      return { valid: false, error: `Unsupported SVG command: ${cmd}` };
    }
  }
  return { valid: true };
};
