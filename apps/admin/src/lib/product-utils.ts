import * as v from "valibot";
import type {
  CatalogProduct,
  CreateProductFormValues,
  LocalizedTextValue,
  ProductAttribute,
  ProductOptionDefinition,
  ProductOptionValueDefinition,
  ProductVariant,
  VariantOptionValue,
} from "../types";
import { createDraftId, slugify, splitCommaValues } from "./utils";

export const DEFAULT_PRODUCT_OPTION_TITLE = "Default option";
export const DEFAULT_PRODUCT_OPTION_VALUE = "Default option value";

function createLocalizedText(value = "") {
  return {
    vi: value,
    en: "",
  };
}

function normalizeLocalizedText(value: { vi?: string; en?: string } | undefined, fallback: string) {
  return {
    vi: (value?.vi ?? fallback).trim(),
    en: (value?.en ?? "").trim(),
  };
}

const createProductSchema = v.object({
  title: v.object({
    vi: v.pipe(v.string(), v.trim(), v.nonEmpty("Vietnamese title is required.")),
    en: v.optional(v.string())
  }),
  handle: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.regex(/^[a-z0-9-]*$/, "Handle can only contain lowercase letters, numbers, and hyphens."),
    ),
  ),
  basePrice: v.optional(v.string()),
});

export function createEmptyOptionDefinition() {
  return {
    id: createDraftId("option"),
    title: "",
    titleTranslations: createLocalizedText(),
    values: [],
  } satisfies ProductOptionDefinition;
}

export function createOptionValueDefinition(value: string) {
  return {
    id: createDraftId("value"),
    value: value.trim(),
    valueTranslations: createLocalizedText(value.trim()),
  } satisfies ProductOptionValueDefinition;
}

function getLegacyOptionPairs(values: CreateProductFormValues) {
  return [
    { name: values.optionNameOne.trim(), values: splitCommaValues(values.optionValuesOne) },
    { name: values.optionNameTwo.trim(), values: splitCommaValues(values.optionValuesTwo) },
  ].filter((option) => option.name !== "" || option.values.length > 0);
}

function buildOptionDefinitionsFromLegacyValues(values: CreateProductFormValues) {
  return getLegacyOptionPairs(values).map((option) => ({
    id: createDraftId("legacy_option"),
    title: option.name,
    values: option.values.map((value) => createOptionValueDefinition(value)),
  }));
}

function sanitizeOptionDefinitions(optionDefinitions: ProductOptionDefinition[]) {
  return optionDefinitions.map((option) => ({
    ...option,
    title: normalizeLocalizedText(option.titleTranslations, option.title).vi,
    titleTranslations: normalizeLocalizedText(option.titleTranslations, option.title),
    values: option.values.map((value) => ({
      ...value,
      value: normalizeLocalizedText(value.valueTranslations, value.value).vi,
      valueTranslations: normalizeLocalizedText(value.valueTranslations, value.value),
    })),
  }));
}

export function getEffectiveOptionDefinitions(
  values: CreateProductFormValues,
  optionDefinitions?: ProductOptionDefinition[],
) {
  if (optionDefinitions && optionDefinitions.length > 0) {
    return sanitizeOptionDefinitions(optionDefinitions);
  }

  return sanitizeOptionDefinitions(buildOptionDefinitionsFromLegacyValues(values));
}

function getEnabledOptionDefinitions(
  values: CreateProductFormValues,
  optionDefinitions?: ProductOptionDefinition[],
) {
  return getEffectiveOptionDefinitions(values, optionDefinitions)
    .map((option) => ({
      ...option,
      values: option.values.filter((value) => value.value !== ""),
    }))
    .filter((option) => option.title !== "" && option.values.length > 0);
}

function buildOptionCombinations(optionPairs: Array<{ name: string; values: string[] }>) {
  return optionPairs.reduce<VariantOptionValue[][]>(
    (accumulator, optionPair) =>
      accumulator.flatMap((combination) =>
        optionPair.values.map((value) => [...combination, { option: optionPair.name, value }]),
      ),
    [[]],
  );
}

function buildVariantBlueprints(
  values: CreateProductFormValues,
  optionDefinitions?: ProductOptionDefinition[],
) {
  const hasVariants = optionDefinitions ? values.hasVariants : values.hasVariants || getLegacyOptionPairs(values).length > 0;
  if (!hasVariants) {
    return [
      {
        title: "Default variant",
        options: [
          {
            option: DEFAULT_PRODUCT_OPTION_TITLE,
            value: DEFAULT_PRODUCT_OPTION_VALUE,
          },
        ] as VariantOptionValue[],
      },
    ];
  }

  const optionPairs = getEnabledOptionDefinitions(values, optionDefinitions).map((option) => ({
    name: option.title,
    values: option.values.map((value) => value.value),
  }));

  if (optionPairs.length === 0) {
    return [];
  }

  return buildOptionCombinations(optionPairs).map((combination) => ({
    title: combination.map((item) => item.value).join(" / "),
    options: combination,
  }));
}

function buildVariantSignature(options: VariantOptionValue[]) {
  if (options.length === 0) {
    return "__default__";
  }

  return options.map((option) => `${option.option}:${option.value}`).join("|");
}

export function reconcileVariantRows(
  currentRows: ProductVariant[],
  values: CreateProductFormValues,
  optionDefinitions?: ProductOptionDefinition[],
) {
  const blueprints = buildVariantBlueprints(values, optionDefinitions);
  const currentBySignature = new Map(currentRows.map((row) => [buildVariantSignature(row.options), row]));
  const fallbackInventory = Number(values.inventory || 0);
  const normalizedInventory = Number.isFinite(fallbackInventory) ? fallbackInventory : 0;

  return blueprints.map((blueprint, index) => {
    const signature = buildVariantSignature(blueprint.options);
    const current = currentBySignature.get(signature);

    return {
      id: current?.id ?? `preview_${index}`,
      title: current?.title || blueprint.title || "Default variant",
      sku: current?.sku ?? "",
      price: current?.price ?? 0,
      inventory: current?.inventory ?? normalizedInventory,
      options: blueprint.options,
      attributes: current?.attributes ?? [],
      allowBackorder: current?.allowBackorder ?? false,
      media: current?.media ?? [],
      customizationMedia: current?.customizationMedia ?? null,
      shouldCreate: current?.shouldCreate ?? true,
    } satisfies ProductVariant;
  });
}

function getEffectiveVariantRows(
  values: CreateProductFormValues,
  variantRows: ProductVariant[] | undefined,
  optionDefinitions?: ProductOptionDefinition[],
) {
  if (variantRows && variantRows.length > 0) {
    return reconcileVariantRows(variantRows, values, optionDefinitions);
  }

  const fallbackInventory = Number(values.inventory || 0);
  const normalizedInventory = Number.isFinite(fallbackInventory) ? fallbackInventory : 0;

  return buildVariantPreview(values).map((variant) => ({
    ...variant,
    inventory: normalizedInventory,
    attributes: variant.attributes ?? [],
    allowBackorder: false,
    customizationMedia: variant.customizationMedia ?? null,
    shouldCreate: true,
  }));
}

export function validateProductTitle(title: LocalizedTextValue | undefined | null): string | null {
  if (!title?.vi?.trim()) {
    return "Vietnamese product title is required.";
  }
  return null;
}

export function isAttributeRowActive(attribute: ProductAttribute): boolean {
  return Boolean(
    attribute.key.vi.trim() !== "" ||
    attribute.key.en.trim() !== "" ||
    attribute.value.vi.trim() !== "" ||
    attribute.value.en.trim() !== "",
  );
}

export function validateProductAttributes(attributes: ProductAttribute[]): string | null {
  const activeAttributes = attributes.filter(isAttributeRowActive);
  if (
    activeAttributes.some(
      (attribute) =>
        attribute.key.vi.trim() === "" || attribute.value.vi.trim() === "",
    )
  ) {
    return "Each attribute row must have both a Vietnamese name and value.";
  }
  return null;
}

export function validateProductOptionDraft(option: {
  titleTranslations: LocalizedTextValue;
  values: Array<{ valueTranslations: LocalizedTextValue }>;
}): string | null {
  if (!option.titleTranslations?.vi?.trim()) {
    return "Vietnamese option title is required.";
  }
  if (!option.values || option.values.length === 0) {
    return "At least one variation value is required.";
  }
  if (option.values.some((v) => !v.valueTranslations?.vi?.trim())) {
    return "Each option value requires a Vietnamese name.";
  }
  const seenValues = new Set<string>();
  for (const v of option.values) {
    const normalizedValue = v.valueTranslations.vi.trim().toLowerCase();
    if (seenValues.has(normalizedValue)) {
      return "Values within the same option must be unique.";
    }
    seenValues.add(normalizedValue);
  }
  return null;
}

export function validateCreateProduct({
  mode,
  values,
  attributes,
  products,
  optionDefinitions,
  variantRows,
}: {
  mode: "draft" | "publish";
  values: CreateProductFormValues;
  attributes: ProductAttribute[];
  products: CatalogProduct[];
  optionDefinitions?: ProductOptionDefinition[];
  variantRows?: ProductVariant[];
}) {
  type CreateProductErrors = Partial<
    Record<
      | keyof CreateProductFormValues
      | "attributes"
      | "optionDefinitions"
      | "publish"
      | "variants"
      | "form",
      string
    >
  >;
  const nextErrors: CreateProductErrors = {};
  const schemaResult = v.safeParse(createProductSchema, values);
  const effectiveOptionDefinitions = getEffectiveOptionDefinitions(values, optionDefinitions);
  const effectiveVariantRows = getEffectiveVariantRows(values, variantRows, optionDefinitions);
  const hasVariantsEnabled = optionDefinitions ? values.hasVariants : values.hasVariants || effectiveOptionDefinitions.length > 0;

  if (!schemaResult.success) {
    for (const issue of schemaResult.issues) {
      const key = issue.path?.[0]?.key;
      if (typeof key === "string" && !(key in nextErrors)) {
        nextErrors[key as keyof CreateProductFormValues] = issue.message;
      }
    }
  }

  const normalizedHandle = values.handle.trim() ? slugify(values.handle) : slugify(values.title.vi || "product");
  if (normalizedHandle && products.some((product) => product.handle === normalizedHandle)) {
    nextErrors.handle = "Handle already exists in the mock catalog.";
  }

  if (hasVariantsEnabled) {
    if (effectiveOptionDefinitions.length === 0) {
      nextErrors.optionDefinitions = "Add at least one product option before continuing with variants.";
    } else {
      for (const option of effectiveOptionDefinitions) {
        const optionError = validateProductOptionDraft({
          titleTranslations: option.titleTranslations ?? { vi: option.title, en: "" },
          values: option.values.map((v) => ({
            valueTranslations: v.valueTranslations ?? { vi: v.value, en: "" },
          })),
        });
        if (optionError) {
          nextErrors.optionDefinitions = optionError;
          break;
        }
      }
    }
  }

  const attributeError = validateProductAttributes(attributes);
  if (attributeError) {
    nextErrors.attributes = attributeError;
  }

  if (mode === "publish") {
    if (effectiveVariantRows.length === 0) {
      nextErrors.variants = "At least one valid variant is required to publish.";
    }

    if (effectiveVariantRows.some((variant) => Number(variant.price || 0) <= 0)) {
      nextErrors.variants = "Every variant must have a positive price before publishing.";
    }

    if (!isPublishReady(values, effectiveVariantRows, optionDefinitions).ready) {
      nextErrors.publish = "Publish requires a title, valid product options, and publishable variant pricing.";
    }
  }

  return nextErrors;
}

function buildVariantPreview(values: CreateProductFormValues) {
  const basePrice = Number(values.basePrice || 0);
  const inventory = Number(values.inventory || 0);
  const normalizedInventory = Number.isFinite(inventory) ? inventory : 0;
  const optionPairs = [
    { name: values.optionNameOne.trim(), values: splitCommaValues(values.optionValuesOne) },
    { name: values.optionNameTwo.trim(), values: splitCommaValues(values.optionValuesTwo) },
  ].filter((option) => option.name !== "" && option.values.length > 0);

  if (optionPairs.length === 0) {
    return [
      {
        id: "preview_default",
        title: "Default variant",
        sku: "",
        price: Number.isFinite(basePrice) ? basePrice : 0,
        inventory: normalizedInventory,
        options: [],
        attributes: [],
        allowBackorder: false,
        media: [],
        customizationMedia: null,
        shouldCreate: true,
      },
    ];
  }

  const combinations = buildOptionCombinations(optionPairs);
  return combinations.map((combination, index) => ({
    id: `preview_${index}`,
    title: combination.map((item) => item.value).join(" / "),
    sku: "",
    price: Number.isFinite(basePrice) ? basePrice : 0,
    inventory: normalizedInventory,
    options: combination,
    attributes: [],
    allowBackorder: false,
    media: [],
    customizationMedia: null,
    shouldCreate: true,
  }));
}

export function isPublishReady(
  values: CreateProductFormValues,
  variantRows: ProductVariant[],
  optionDefinitions?: ProductOptionDefinition[],
) {
  const effectiveOptionDefinitions = getEffectiveOptionDefinitions(values, optionDefinitions);
  const effectiveVariantRows = getEffectiveVariantRows(values, variantRows, optionDefinitions);
  const hasVariantsEnabled = optionDefinitions ? values.hasVariants : values.hasVariants || effectiveOptionDefinitions.length > 0;
  const variantStructureValid =
    (!hasVariantsEnabled ||
      effectiveOptionDefinitions.every(
        (option) =>
          option.title.trim() !== "" &&
          option.values.length > 0 &&
          option.values.every((value) => (value.valueTranslations?.vi ?? value.value).trim() !== "")
      )) &&
    effectiveVariantRows.length > 0;
  const variantPricingValid = effectiveVariantRows.every((variant) => Number(variant.price || 0) > 0);

  return {
    ready: values.title.vi.trim() !== "" && variantStructureValid && variantPricingValid,
    variantStructureValid,
  };
}

export type RichTextSectionKey = "whyThisProductHtml" | "specificationsHtml" | "shippingHtml";

export const RICH_TEXT_SECTIONS: Array<{
  key: RichTextSectionKey;
  label: string;
  description: string;
  placeholderByLocale: { vi: string; en: string };
}> = [
  {
    key: "whyThisProductHtml",
    label: "Why This Product?",
    description: "Persuasive copy shown in the first product detail accordion.",
    placeholderByLocale: { vi: "Vì sao chọn sản phẩm này...", en: "Why this product..." },
  },
  {
    key: "specificationsHtml",
    label: "Specifications",
    description: "Technical details. When empty, the storefront falls back to the product attributes grid.",
    placeholderByLocale: { vi: "Thông số kỹ thuật...", en: "Specifications..." },
  },
  {
    key: "shippingHtml",
    label: "Shipping & fulfillment",
    description: "Shipping policy copy. When empty, the storefront shows the default policy.",
    placeholderByLocale: { vi: "Vận chuyển và giao hàng...", en: "Shipping & fulfillment..." },
  },
];

export function sanitizeRichTextValue(html: string | null | undefined): string | null {
  if (!html) return null;
  // If we are in an environment without DOMParser (e.g. testing), just fallback to basic regex check
  if (typeof DOMParser === "undefined") {
    const stripped = html.replace(/<[^>]*>?/gm, "").trim();
    if (stripped === "" && !/<(img|iframe)/i.test(html)) return null;
    return html;
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (doc.body.textContent?.trim() === "" && doc.body.querySelectorAll("img, iframe, video").length === 0) {
    return null;
  }
  return html;
}

export function sanitizeLocalizedRichText(val: import("../types").LocalizedTextValue | null | undefined): import("../types").LocalizedTextValue | null {
  if (!val) return null;
  const sanitizedVi = sanitizeRichTextValue(val.vi);
  const sanitizedEn = sanitizeRichTextValue(val.en);
  if (!sanitizedVi && !sanitizedEn) return null;
  return { vi: sanitizedVi ?? "", en: sanitizedEn ?? "" };
}
