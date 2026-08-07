import * as v from 'valibot'
import { fullCreateProductSchema } from './product-schemas'

const optionTitle = 'Default option'
const optionValue = 'Default option value'
const variantTitle = 'Default variant'
const localized = (value: string) => ({ vi: value, en: value })
const valueOf = (value: string | { vi: string }) => typeof value === 'string' ? value : value.vi

export const normalizeFullCreateDefaultOptionGraph = (
  input: v.InferOutput<typeof fullCreateProductSchema>
) => {
  const hasCustomOptions = input.options.length > 0 && !(
    input.options.length === 1 && valueOf(input.options[0].title) === optionTitle &&
    input.options[0].values.length === 1 && valueOf(input.options[0].values[0].value) === optionValue
  )
  const options = hasCustomOptions ? input.options : [{ title: localized(optionTitle), values: [{ value: localized(optionValue) }] }]
  const variants = (input.variants.length > 0 ? input.variants : [{ title: variantTitle, sku: null, priceAmount: null, inventoryQuantity: 0, allowBackorder: false, isDefault: true, attributes: [], optionValues: [{ optionTitle, value: optionValue }], media: [], customizationMedia: null }]).map((variant, index) => ({
    ...variant,
    title: variant.title || variantTitle,
    isDefault: index === 0 ? true : (variant.isDefault ?? false),
    optionValues: !hasCustomOptions && (!variant.optionValues || variant.optionValues.length === 0) ? [{ optionTitle, value: optionValue }] : (variant.optionValues ?? [])
  }))
  return { hasCustomOptions, options, variants }
}
