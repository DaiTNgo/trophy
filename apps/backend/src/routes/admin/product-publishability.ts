import {
  validateProductCustomizationForPublish,
  type ProductCustomization
} from '@trophy/customization'

const DEFAULT_PRODUCT_OPTION_TITLE = 'Default option'
const DEFAULT_PRODUCT_OPTION_VALUE = 'Default option value'

type ProductForPublish = {
  id: number
  title: unknown
  attributes: Array<{ name: unknown; value: unknown; [key: string]: unknown }>
  options: Array<{
    title: unknown
    values: Array<{ value: unknown; [key: string]: unknown }>
    [key: string]: unknown
  }>
  variants: Array<{
    priceAmount: number | null
    isDefault: boolean
    optionValueIds: number[]
    attributes?: Array<{ name: unknown; value: unknown; [key: string]: unknown }>
    customizationMedia: {
      widthPx: number | null
      heightPx: number | null
      [key: string]: unknown
    } | null
    [key: string]: unknown
  }>
  customization: {
    enabled: boolean
    layers: ProductCustomization['layers']
    formFields: ProductCustomization['formFields']
    [key: string]: unknown
  } | null
  [key: string]: unknown
}

function localizedStoredValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'vi' in value && typeof value.vi === 'string') return value.vi
  return ''
}

export function productUsesVariantMode(product: {
  options: Array<{
    title: unknown
    values: Array<{ value: unknown; [key: string]: unknown }>
    [key: string]: unknown
  }>
  variants: Array<unknown>
}) {
  return product.options.length > 1 ||
    (product.options.length === 1 && localizedStoredValue(product.options[0]?.title) !== DEFAULT_PRODUCT_OPTION_TITLE) ||
    (product.options.length === 1 && product.options[0].values.some((value) => localizedStoredValue(value.value) !== DEFAULT_PRODUCT_OPTION_VALUE)) ||
    product.variants.length > 1
}

function hasVietnameseCatalogText(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0
  return Boolean(value && typeof value === 'object' && 'vi' in value && String(value.vi ?? '').trim())
}

function isLocalizedComplete(value: unknown) {
  if (typeof value === 'string') return value.trim().length > 0
  return Boolean(value && typeof value === 'object' && 'vi' in value && 'en' in value && String(value.vi ?? '').trim() && String(value.en ?? '').trim())
}

export function validatePublishable(product: ProductForPublish) {
  if (!hasVietnameseCatalogText(product.title)) return 'Product title requires Vietnamese text before publish'
  for (const attribute of product.attributes) {
    if (!isLocalizedComplete(attribute.name) || !isLocalizedComplete(attribute.value)) return 'All product attributes must have translated names and values before publish'
  }
  for (const option of product.options) {
    if (!isLocalizedComplete(option.title)) return 'All product options must have translated titles before publish'
    for (const value of option.values) {
      if (!isLocalizedComplete(value.value)) return 'All product option values must have translated labels before publish'
    }
  }
  if (product.variants.length === 0) return 'A product must have at least one variant'
  for (const variant of product.variants) {
    if (variant.priceAmount === null) return 'Every variant must have a price before publish'
    for (const attribute of variant.attributes ?? []) {
      if (!isLocalizedComplete(attribute.name) || !isLocalizedComplete(attribute.value)) return 'All variant attributes must have translated names and values before publish'
    }
  }
  if (!productUsesVariantMode(product)) {
    if (product.variants.length !== 1 || !product.variants[0].isDefault) return 'Products without variants must have exactly one default variant'
    if (product.options.length > 1 || (product.options.length === 1 && product.options[0].values.length !== 1)) return 'Products without variants must have exactly one default option and value, or zero options'
  }
  const combinations = new Set<string>()
  for (const variant of product.variants) {
    if (variant.optionValueIds.length !== product.options.length) return 'Every variant must include exactly one value for each option'
    const key = [...variant.optionValueIds].sort((left, right) => left - right).join(':')
    if (combinations.has(key)) return 'Variant combinations must be unique'
    combinations.add(key)
  }
  if (product.customization?.enabled) {
    const firstMedia = product.variants.find((variant) => variant.customizationMedia)?.customizationMedia
    if (!firstMedia?.widthPx || !firstMedia.heightPx) return 'Customization requires Customization Media for every variant before publish'
    for (const variant of product.variants) {
      if (!variant.customizationMedia) return 'Each variant needs Customization Media before publish'
      if (variant.customizationMedia.widthPx !== firstMedia.widthPx || variant.customizationMedia.heightPx !== firstMedia.heightPx) return 'All Customization Media assets must share the same size before publish'
    }
    const validation = validateProductCustomizationForPublish({
      productId: String(product.id),
      enabled: true,
      canvasWidthPx: firstMedia.widthPx,
      canvasHeightPx: firstMedia.heightPx,
      layers: product.customization.layers,
      formFields: product.customization.formFields
    })
    if (!validation.valid) return validation.issues[0]?.message ?? 'Customization is invalid'
  }
  return null
}
