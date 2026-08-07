import { localizedNullableText, localizedString } from '../../lib/locale'
import * as v from 'valibot'

const trimmedString = (min = 1, max = 255) =>
  v.pipe(v.string(), v.trim(), v.minLength(min), v.maxLength(max))

const nullableText = (max = 65535) =>
  v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(max), v.transform((value) => value.length === 0 ? null : value))))

const optionalHandle = v.optional(v.nullable(v.pipe(v.string(), v.trim(), v.maxLength(255), v.transform((value) => value.length === 0 ? null : value))))
const optionalId = v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1))))
const positiveIntParam = v.pipe(v.string(), v.transform(Number), v.number(), v.integer(), v.minValue(1))

export const idParamsSchema = v.object({ id: positiveIntParam })
export const optionParamsSchema = v.object({ id: positiveIntParam, optionId: positiveIntParam })
export const optionValueParamsSchema = v.object({ id: positiveIntParam, valueId: positiveIntParam })
export const variantParamsSchema = v.object({ id: positiveIntParam, variantId: positiveIntParam })

const optionalQueryText = v.optional(v.pipe(v.string(), v.trim(), v.maxLength(255), v.transform((value) => value.length === 0 ? undefined : value)))
const optionalQueryId = v.optional(v.pipe(v.string(), v.trim(), v.transform((value) => value.length === 0 ? undefined : Number(value)), v.union([v.undefined(), v.pipe(v.number(), v.integer(), v.minValue(1))])))

export const searchProductsQuerySchema = v.object({
  q: optionalQueryText,
  status: v.optional(v.union([
    v.literal('draft'),
    v.literal('published'),
    v.literal('archived'),
    v.pipe(v.string(), v.trim(), v.transform((value) => value.length === 0 ? undefined : value), v.undefined())
  ])),
  collectionId: optionalQueryId,
  categoryId: optionalQueryId,
  page: v.optional(v.pipe(v.string(), v.trim(), v.transform((value) => value.length === 0 ? 1 : Number(value)), v.number(), v.integer(), v.minValue(1))),
  limit: v.optional(v.pipe(v.string(), v.trim(), v.transform((value) => value.length === 0 ? 20 : Number(value)), v.number(), v.integer(), v.minValue(1), v.maxValue(100)))
})

const optionalLocalizedNullableText = (maxLength = 2000) => v.optional(v.nullable(localizedNullableText(maxLength)))
export const nullableLocalizedPatch = (value: v.InferOutput<ReturnType<typeof optionalLocalizedNullableText>>) => value ?? { vi: null, en: null }

export const createProductSchema = v.object({
  title: localizedString(1, 200), subtitle: optionalLocalizedNullableText(255), handle: optionalHandle,
  description: optionalLocalizedNullableText(), defaultVariantTitle: nullableText(255),
  priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))))
})
export const updateProductSchema = v.object({ title: v.optional(localizedString(1, 200)), subtitle: optionalLocalizedNullableText(255), handle: optionalHandle, description: optionalLocalizedNullableText() })
export const organizeSchema = v.object({ collectionId: optionalId, categoryIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))) })
export const attributesSchema = v.object({ items: v.array(v.object({ name: localizedString(1, 120), value: localizedString(1, 255), unit: nullableText(50) })) })
const variantAttributesSchema = v.array(v.object({ name: localizedString(1, 120), value: localizedString(1, 255), unit: nullableText(50) }))
export const mediaSchema = v.object({ items: v.array(v.object({ url: trimmedString(1, 2000), alt: nullableText(255) })) })

const uniqueLocalizedValues = <T extends { value: { vi: string } }>(values: T[]) => new Set(values.map((value) => value.value.vi.toLowerCase())).size === values.length
export const optionsSchema = v.object({
  items: v.array(v.object({
    id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))), title: localizedString(1, 120),
    values: v.pipe(v.array(v.object({ id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))), value: localizedString(1, 120) })), v.check(uniqueLocalizedValues, 'Option values must be unique within the same option'))
  }))
})
export const optionCreateSchema = v.object({
  title: localizedString(1, 120),
  values: v.optional(v.pipe(v.array(v.object({ value: localizedString(1, 120) })), v.check(uniqueLocalizedValues, 'Option values must be unique within the same option')))
})
export const optionUpdateSchema = v.object({ title: localizedString(1, 120) })
export const optionValueCreateSchema = v.object({ value: localizedString(1, 120) })
export const optionValueUpdateSchema = v.object({ value: localizedString(1, 120) })

const assetIdSchema = v.pipe(v.string(), v.uuid())
const localizedVariantTitleSchema = v.union([trimmedString(1, 200), localizedString(1, 200)])
export const variantsSchema = v.object({
  items: v.array(v.object({
    id: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))), title: localizedVariantTitleSchema, sku: nullableText(120),
    priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))), inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))), allowBackorder: v.optional(v.boolean()), isDefault: v.optional(v.boolean()), optionValueIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))), attributes: v.optional(variantAttributesSchema), media: v.optional(v.array(v.object({ assetId: assetIdSchema }))), customizationMedia: v.optional(v.nullable(v.object({ assetId: assetIdSchema })))
  }))
})
export const variantDetailSchema = v.object({ title: localizedVariantTitleSchema, sku: nullableText(120), allowBackorder: v.optional(v.boolean()), optionValueIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))), attributes: v.optional(variantAttributesSchema) })
export const variantCreateSchema = v.object({ title: localizedVariantTitleSchema, sku: nullableText(120), priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))), inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))), allowBackorder: v.optional(v.boolean()), optionValueIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))), attributes: v.optional(variantAttributesSchema), customizationMedia: v.optional(v.nullable(v.object({ assetId: assetIdSchema }))), media: v.optional(v.array(v.object({ assetId: assetIdSchema }))) })
export const priceUpdateSchema = v.object({ items: v.pipe(v.array(v.object({ id: v.pipe(v.number(), v.integer(), v.minValue(1)), priceAmount: v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0))) })), v.minLength(1)) })
export const stockUpdateSchema = v.object({ items: v.pipe(v.array(v.object({ id: v.pipe(v.number(), v.integer(), v.minValue(1)), inventoryQuantity: v.pipe(v.number(), v.integer(), v.minValue(0)) })), v.minLength(1)) })
export const variantMediaSchema = v.object({ items: v.array(v.object({ assetId: assetIdSchema })) })
export const variantCustomizationMediaSchema = v.object({ assetId: assetIdSchema })

export const fullCreateCustomizationSchema = v.object({ enabled: v.boolean(), canvasWidthPx: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))), canvasHeightPx: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(1)))), layers: v.pipe(v.array(v.unknown()), v.maxLength(200)), formFields: v.pipe(v.array(v.unknown()), v.maxLength(200)) })
const fullCreateOrganizationSchema = v.object({ collectionId: optionalId, categoryIds: v.optional(v.array(v.pipe(v.number(), v.integer(), v.minValue(1)))) })
export const fullCreateProductSchema = v.object({
  mode: v.union([v.literal('draft'), v.literal('publish')]),
  details: v.object({ title: localizedString(1, 200), subtitle: optionalLocalizedNullableText(255), handle: optionalHandle, description: optionalLocalizedNullableText() }),
  organization: fullCreateOrganizationSchema,
  attributes: v.array(v.object({ name: localizedString(1, 120), value: localizedString(1, 255), unit: nullableText(50) })),
  options: v.array(v.object({ title: localizedString(1, 120), values: v.pipe(v.array(v.object({ value: localizedString(1, 120) })), v.check((values) => new Set(values.map((value) => (typeof value.value === 'string' ? value.value : value.value.vi).toLowerCase())).size === values.length, 'Option values must be unique within the same option')) })),
  variants: v.array(v.object({ title: localizedVariantTitleSchema, sku: nullableText(120), priceAmount: v.optional(v.nullable(v.pipe(v.number(), v.integer(), v.minValue(0)))), inventoryQuantity: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))), allowBackorder: v.optional(v.boolean()), isDefault: v.optional(v.boolean()), attributes: v.optional(variantAttributesSchema), optionValues: v.optional(v.array(v.object({ optionTitle: trimmedString(1, 120), value: trimmedString(1, 120) }))), media: v.array(v.object({ assetId: assetIdSchema })), customizationMedia: v.optional(v.nullable(v.object({ assetId: assetIdSchema }))) })),
  customization: v.optional(v.nullable(fullCreateCustomizationSchema))
})
