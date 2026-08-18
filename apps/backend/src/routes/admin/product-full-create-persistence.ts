import { sql } from 'drizzle-orm'
import type { Database } from '../../db/client'
import {
  catalogTranslations,
  productAttributes,
  productOptions,
  productOptionValues,
  productVariantAttributes,
  productVariantOptionValues,
  productVariants,
} from '../../db/schema'
import { SUPPORTED_LOCALES, type Locale } from '../../lib/locale'

type LocalizedInput = string | Partial<Record<Locale, string | null>>

type TranslationWrite = {
  ownerType: 'product' | 'product_attribute' | 'product_option' | 'product_option_value' | 'product_variant' | 'product_variant_attribute'
  ownerKey: string
  fieldName: string
  values: LocalizedInput
}

const valueForLocale = (values: LocalizedInput, locale: Locale) =>
  typeof values === 'string' ? (locale === 'vi' ? values : undefined) : values[locale]

const canonicalValue = (value: LocalizedInput) =>
  typeof value === 'string' ? value : value.vi ?? ''

const optionSelectionKey = (title: string, value: string) =>
  `${title.trim().toLowerCase()}::${value.trim().toLowerCase()}`

export function queueFullCreateTranslations(
  writes: TranslationWrite[],
  ownerType: TranslationWrite['ownerType'],
  ownerKey: string,
  fieldName: string,
  values: LocalizedInput,
) {
  writes.push({ ownerType, ownerKey, fieldName, values })
}

export async function persistFullCreateTranslations(db: Database, writes: TranslationWrite[]) {
  const rows = writes.flatMap(({ ownerType, ownerKey, fieldName, values }) =>
    SUPPORTED_LOCALES.flatMap((locale) => {
      const value = valueForLocale(values, locale)
      return value === undefined || value === null ? [] : [{ ownerType, ownerKey, fieldName, locale, value }]
    }),
  )
  if (rows.length === 0) return

  await db.insert(catalogTranslations).values(rows).onConflictDoUpdate({
    target: [
      catalogTranslations.ownerType,
      catalogTranslations.ownerKey,
      catalogTranslations.fieldName,
      catalogTranslations.locale,
    ],
    set: { value: sql`excluded.value`, updatedAt: sql`CURRENT_TIMESTAMP` },
  })
}

export async function insertFullCreateAttributes(
  db: Database,
  productId: number,
  items: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>,
  translations: TranslationWrite[],
) {
  if (items.length === 0) return
  const inserted = await db.insert(productAttributes).values(items.map((item, position) => ({
    productId,
    name: canonicalValue(item.name),
    value: canonicalValue(item.value),
    unit: item.unit ?? null,
    position,
  }))).returning()
  inserted.forEach((attribute, index) => {
    queueFullCreateTranslations(translations, 'product_attribute', String(attribute.id), 'name', items[index].name)
    queueFullCreateTranslations(translations, 'product_attribute', String(attribute.id), 'value', items[index].value)
  })
}

export async function insertFullCreateOptions(
  db: Database,
  productId: number,
  items: Array<{ title: LocalizedInput; values: Array<{ value: LocalizedInput }> }>,
  translations: TranslationWrite[],
) {
  const insertedOptions = await db.insert(productOptions).values(items.map((item, position) => ({
    productId,
    title: canonicalValue(item.title),
    position,
  }))).returning()
  insertedOptions.forEach((option, index) => {
    queueFullCreateTranslations(translations, 'product_option', String(option.id), 'title', items[index].title)
  })

  const valuePayload = insertedOptions.flatMap((option, optionIndex) =>
    items[optionIndex].values.map((item, position) => ({
      optionId: option.id,
      value: canonicalValue(item.value),
      position,
      originalValue: item.value,
      optionTitle: canonicalValue(items[optionIndex].title),
    })),
  )
  const insertedValues = valuePayload.length === 0
    ? []
    : await db.insert(productOptionValues).values(valuePayload.map(({ originalValue: _originalValue, optionTitle: _optionTitle, ...row }) => row)).returning()
  insertedValues.forEach((value, index) => {
    queueFullCreateTranslations(translations, 'product_option_value', String(value.id), 'value', valuePayload[index].originalValue)
  })

  return new Map(valuePayload.map((value, index) => [
    optionSelectionKey(value.optionTitle, canonicalValue(value.originalValue)),
    insertedValues[index].id,
  ]))
}

export async function insertFullCreateVariants(
  db: Database,
  productId: number,
  items: Array<{
    title: LocalizedInput
    sku?: string | null
    priceAmount?: number | null
    inventoryQuantity?: number
    allowBackorder?: boolean
    isDefault?: boolean
    optionValueIds?: number[]
    attributes?: Array<{ name: LocalizedInput; value: LocalizedInput; unit?: string | null }>
  }>,
  translations: TranslationWrite[],
) {
  if (items.length === 0) throw new Error('A product must have at least one variant')
  const normalized = items.map((item, position) => ({
    ...item,
    sku: item.sku ?? null,
    priceAmount: item.priceAmount ?? null,
    inventoryQuantity: item.inventoryQuantity ?? 0,
    allowBackorder: item.allowBackorder ?? false,
    isDefault: item.isDefault ?? false,
    position,
    optionValueIds: item.optionValueIds ?? [],
    attributes: item.attributes ?? [],
  }))
  if (!normalized.some((variant) => variant.isDefault)) normalized[0].isDefault = true
  let hasDefault = false
  for (const variant of normalized) {
    variant.isDefault = variant.isDefault && !hasDefault
    hasDefault ||= variant.isDefault
  }

  const insertedVariants = await db.insert(productVariants).values(normalized.map((item) => ({
    productId,
    title: canonicalValue(item.title),
    sku: item.sku,
    priceAmount: item.priceAmount,
    inventoryQuantity: item.inventoryQuantity,
    allowBackorder: item.allowBackorder,
    isDefault: item.isDefault,
    position: item.position,
    updatedAt: new Date().toISOString(),
  }))).returning()
  insertedVariants.forEach((variant, index) => {
    queueFullCreateTranslations(translations, 'product_variant', String(variant.id), 'title', normalized[index].title)
  })

  const optionRows = insertedVariants.flatMap((variant, variantIndex) =>
    normalized[variantIndex].optionValueIds.map((optionValueId) => ({ variantId: variant.id, optionValueId })),
  )
  if (optionRows.length > 0) await db.insert(productVariantOptionValues).values(optionRows)

  const attributePayload = insertedVariants.flatMap((variant, variantIndex) =>
    normalized[variantIndex].attributes.map((attribute, position) => ({
      variantId: variant.id,
      name: canonicalValue(attribute.name),
      value: canonicalValue(attribute.value),
      unit: attribute.unit ?? null,
      position,
      originalName: attribute.name,
      originalValue: attribute.value,
    })),
  )
  if (attributePayload.length > 0) {
    const insertedAttributes = await db.insert(productVariantAttributes).values(attributePayload.map(({ originalName: _originalName, originalValue: _originalValue, ...row }) => row)).returning()
    insertedAttributes.forEach((attribute, index) => {
      queueFullCreateTranslations(translations, 'product_variant_attribute', String(attribute.id), 'name', attributePayload[index].originalName)
      queueFullCreateTranslations(translations, 'product_variant_attribute', String(attribute.id), 'value', attributePayload[index].originalValue)
    })
  }

  return insertedVariants
}
