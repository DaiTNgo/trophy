import * as v from "valibot";
import type {
  CatalogProduct,
  CreateProductFormValues,
  CreateProductSubmission,
  ProductAttribute,
  ProductOptionDefinition,
  ProductOptionValueDefinition,
  ProductStatus,
  ProductVariant,
  VariantOptionValue,
} from "../types";
import { createDraftId, slugify, splitCommaValues, buildSku } from "./utils";

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

export function buildVariantBlueprints(
  values: CreateProductFormValues,
  optionDefinitions?: ProductOptionDefinition[],
) {
  const hasVariants = optionDefinitions ? values.hasVariants : values.hasVariants || getLegacyOptionPairs(values).length > 0;
  if (!hasVariants) {
    return [
      {
        title: "Default variant",
        options: [] as VariantOptionValue[],
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
      allowBackorder: current?.allowBackorder ?? false,
      media: current?.media ?? [],
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
    allowBackorder: false,
    shouldCreate: true,
  }));
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
    }

    const invalidOption = effectiveOptionDefinitions.find(
      (option) => option.title === "" || option.values.filter((value) => value.value !== "").length === 0,
    );
    if (invalidOption) {
      nextErrors.optionDefinitions = "Each product option needs a title and at least one value.";
    }

    const duplicateValueOption = effectiveOptionDefinitions.find((option) => {
      const seenValues = new Set<string>();
      for (const value of option.values) {
        const normalizedValue = value.value.toLowerCase();
        if (normalizedValue === "") {
          continue;
        }
        if (seenValues.has(normalizedValue)) {
          return true;
        }
        seenValues.add(normalizedValue);
      }
      return false;
    });
    if (duplicateValueOption) {
      nextErrors.optionDefinitions = "Values within the same option must be unique.";
    }
  }

  const cleanedAttributes = attributes.filter((attribute) => attribute.key.vi.trim() !== "" || attribute.value.vi.trim() !== "");
  if (cleanedAttributes.some((attribute) => attribute.key.vi.trim() === "" || attribute.value.vi.trim() === "")) {
    nextErrors.attributes = "Each attribute row must have both a name and a value.";
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

export function buildVariantPreview(values: CreateProductFormValues) {
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
        allowBackorder: false,
        media: [],
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
    allowBackorder: false,
    media: [],
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
    (!hasVariantsEnabled || effectiveOptionDefinitions.every((option) => option.title !== "" && option.values.some((value) => value.value !== ""))) &&
    effectiveVariantRows.length > 0;
  const variantPricingValid = effectiveVariantRows.every((variant) => Number(variant.price || 0) > 0);

  return {
    ready: values.title.vi.trim() !== "" && variantStructureValid && variantPricingValid,
    variantStructureValid,
  };
}

export function createMockProduct(existingProducts: CatalogProduct[], input: CreateProductSubmission): CatalogProduct {
  const handle = ensureUniqueHandle(input.values.handle || input.values.title.vi, existingProducts);
  const today = "2026-06-21";
  const optionDefinitions = getEffectiveOptionDefinitions(input.values, input.optionDefinitions);
  const variantRows = getEffectiveVariantRows(input.values, input.variantRows, input.optionDefinitions);
  const media = input.values.media
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const attributes = input.attributes.filter((attribute) => attribute.key.vi.trim() !== "" && attribute.value.vi.trim() !== "");
  const highestInventory = variantRows.reduce((total, variant) => total + variant.inventory, 0);
  const leadPrice = variantRows[0]?.price ?? 0;
  const status = input.mode === "draft" ? "Draft" : "Published";

  const variants = variantRows.map((variant, index) => ({
    ...variant,
    id: `${handle}-variant-${index + 1}`,
    sku: variant.sku.trim() || buildSku(handle, index),
    title: variant.title.trim() || "Default variant",
  }));

  return {
    id: `prod_${handle}`,
    title: input.values.title,
    handle,
    subtitle: input.values.subtitle,
    description: input.values.description,
    status,
    inventory: highestInventory,
    price: leadPrice,
    category: input.values.categories[0] ?? "Unassigned",
    collection: input.values.collection,
    collectionId: null,
    categories: input.values.categories,
    categoryIds: [],
    media,
    attributes,
    optionDefinitions,
    variants,
    updatedAt: today,
  };
}

export function buildUpdatedProduct(current: CatalogProduct, input: CreateProductSubmission): CatalogProduct {
  const optionDefinitions = getEffectiveOptionDefinitions(input.values, input.optionDefinitions);
  const variantRows = getEffectiveVariantRows(input.values, input.variantRows, input.optionDefinitions);
  const totalInventory = variantRows.reduce((total, variant) => total + variant.inventory, 0);
  const leadPrice = variantRows[0]?.price ?? 0;
  const status = input.mode === "draft" ? "Draft" : "Published";

  return {
    ...current,
    title: input.values.title,
    handle: slugify(input.values.handle || input.values.title.vi || current.handle),
    subtitle: input.values.subtitle,
    description: input.values.description,
    status,
    inventory: totalInventory,
    price: leadPrice,
    category: input.values.categories[0] ?? "Unassigned",
    collection: input.values.collection,
    categories: input.values.categories,
    media: input.values.media
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    attributes: input.attributes.filter((attribute) => attribute.key.vi.trim() !== "" && attribute.value.vi.trim() !== ""),
    optionDefinitions,
    variants: variantRows.map((variant, index) => ({
      ...variant,
      id: `${current.id}-variant-${index + 1}`,
      sku: variant.sku.trim() || buildSku(input.values.handle || input.values.title.vi || current.handle, index),
      title: variant.title.trim() || "Default variant",
    })),
    updatedAt: "2026-06-21",
  };
}

export function productToFormValues(product: CatalogProduct): CreateProductFormValues {
  const groupedOptions = product.optionDefinitions.length > 0
    ? new Map(product.optionDefinitions.map((option) => [option.title, option.values.map((value) => value.value)]))
    : product.variants.reduce<Map<string, string[]>>((accumulator, variant) => {
    for (const option of variant.options) {
      const existingValues = accumulator.get(option.option) ?? [];
      if (!existingValues.includes(option.value)) {
        existingValues.push(option.value);
      }
      accumulator.set(option.option, existingValues);
    }
    return accumulator;
  }, new Map());

  const orderedOptions = Array.from(groupedOptions.entries());

  return {
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle,
    description: product.description,
    customizationEnabled: false,
    collection: product.collection,
    categories: product.categories,
    media: product.media.join("\n"),
    hasVariants: product.optionDefinitions.length > 0,
    basePrice: String(product.price),
    inventory: String(product.inventory),
    optionNameOne: orderedOptions[0]?.[0] ?? "",
    optionValuesOne: orderedOptions[0]?.[1].join(", ") ?? "",
    optionNameTwo: orderedOptions[1]?.[0] ?? "",
    optionValuesTwo: orderedOptions[1]?.[1].join(", ") ?? "",
  };
}

export function derivePublishedStatus(): ProductStatus {
  return "Published";
}

function ensureUniqueHandle(seed: string, existingProducts: CatalogProduct[]) {
  const base = slugify(seed || "new-product");
  const handles = new Set(existingProducts.map((product) => product.handle));

  if (!handles.has(base)) {
    return base;
  }

  let suffix = 2;
  while (handles.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}
