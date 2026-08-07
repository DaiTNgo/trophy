import { asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../db/client'
import {
  productOptionValues,
  productOptions,
  productVariantAttributes,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  products
} from '../../db/schema'
import { upsertTranslations } from '../../lib/catalog-translation'
import { insertVariantCustomizationMedia, insertVariantMedia } from './product-media'
import { replaceVariantAttributes } from './product-mutations'

const DEFAULT_PRODUCT_OPTION_TITLE = 'Default option'
const DEFAULT_PRODUCT_OPTION_VALUE = 'Default option value'

type VariantInput = {
  id?: number
  title: string | { vi: string; en?: string | null }
  sku?: string | null
  priceAmount?: number | null
  inventoryQuantity?: number
  allowBackorder?: boolean
  isDefault?: boolean
  optionValueIds?: number[]
  attributes?: Array<{
    name: { vi: string; en?: string | null }
    value: { vi: string; en?: string | null }
    unit?: string | null
  }>
  media?: Array<{ assetId: string }>
  customizationMedia?: { assetId: string } | null
}

export async function replaceVariants(
  db: ReturnType<typeof getDb>,
  productId: number,
  items: VariantInput[]
) {
  const product = await db.select().from(products).where(eq(products.id, productId)).get()
  if (!product) return { error: 'Product not found', status: 404 as const }
  if (items.length === 0) {
    return { error: 'A product must have at least one variant', status: 409 as const }
  }

  const optionRows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id))
  const optionIds = optionRows.map((row) => row.id)
  const optionValueRows =
    optionIds.length > 0
      ? await db
          .select()
          .from(productOptionValues)
          .where(inArray(productOptionValues.optionId, optionIds))
      : []
  const optionValueToOptionId = new Map(
    optionValueRows.map((row) => [row.id, row.optionId] as const)
  )
  const hasVariantMode =
    optionRows.length > 1 ||
    (optionRows.length === 1 && optionRows[0].title !== DEFAULT_PRODUCT_OPTION_TITLE) ||
    (optionRows.length === 1 &&
      optionValueRows.some((optionValue) => optionValue.value !== DEFAULT_PRODUCT_OPTION_VALUE))

  if (!hasVariantMode && items.length !== 1) {
    return {
      error: 'Products without variant mode can only have one default variant',
      status: 409 as const
    }
  }

  const normalized = items.map((item, index) => ({
    ...item,
    sku: item.sku ?? null,
    priceAmount: item.priceAmount ?? null,
    inventoryQuantity: item.inventoryQuantity ?? 0,
    allowBackorder: item.allowBackorder ?? false,
    optionValueIds: [...new Set(item.optionValueIds ?? [])].sort((left, right) => left - right),
    attributes: item.attributes ?? [],
    isDefault: item.isDefault ?? false,
    position: index
  }))

  const seenCombinations = new Set<string>()
  for (const variant of normalized) {
    if (optionRows.length === 0) {
      if (variant.optionValueIds.length > 0) {
        return {
          error: 'Variant cannot reference option values when the product has no options',
          status: 409 as const
        }
      }
      continue
    }
    if (variant.optionValueIds.length !== optionRows.length) {
      return {
        error: 'Each variant must include exactly one value for every option',
        status: 409 as const
      }
    }
    if (new Set(variant.optionValueIds).size !== variant.optionValueIds.length) {
      return { error: 'Variant option values must be unique', status: 409 as const }
    }
    const optionIdsForVariant = variant.optionValueIds.map((id) => optionValueToOptionId.get(id))
    if (optionIdsForVariant.some((id) => id === undefined)) {
      return { error: 'Variant references an unknown option value', status: 409 as const }
    }
    if (new Set(optionIdsForVariant).size !== optionRows.length) {
      return {
        error: 'Variant must contain at most one value from each option',
        status: 409 as const
      }
    }
    const combinationKey = variant.optionValueIds.join(':')
    if (seenCombinations.has(combinationKey)) {
      return { error: 'Duplicate variant option combination', status: 409 as const }
    }
    seenCombinations.add(combinationKey)
  }

  if (!hasVariantMode) {
    normalized[0].isDefault = true
  } else {
    if (!normalized.some((variant) => variant.isDefault)) normalized[0].isDefault = true
    let foundDefault = false
    for (const variant of normalized) {
      if (variant.isDefault && !foundDefault) {
        foundDefault = true
      } else {
        variant.isDefault = false
      }
    }
  }

  const existingVariantIds = (
    await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
  ).map((row) => row.id)
  if (existingVariantIds.length > 0) {
    await db
      .delete(productVariantOptionValues)
      .where(inArray(productVariantOptionValues.variantId, existingVariantIds))
    await db
      .delete(productVariantAttributes)
      .where(inArray(productVariantAttributes.variantId, existingVariantIds))
    await db
      .delete(productVariantMedia)
      .where(inArray(productVariantMedia.variantId, existingVariantIds))
    await db
      .delete(productVariantCustomizationMedia)
      .where(inArray(productVariantCustomizationMedia.variantId, existingVariantIds))
  }
  await db.delete(productVariants).where(eq(productVariants.productId, productId))

  const insertedVariants = await db
    .insert(productVariants)
    .values(
      normalized.map((item, index) => ({
        productId,
        title: typeof item.title === 'string' ? item.title : item.title.vi,
        sku: item.sku,
        priceAmount: item.priceAmount,
        inventoryQuantity: item.inventoryQuantity,
        allowBackorder: item.allowBackorder,
        isDefault: item.isDefault,
        position: index,
        updatedAt: new Date().toISOString()
      }))
    )
    .returning()

  for (let index = 0; index < insertedVariants.length; index += 1) {
    const title = normalized[index].title
    await upsertTranslations(
      db,
      'product_variant',
      String(insertedVariants[index].id),
      'title',
      typeof title === 'string' ? { vi: title, en: title } : title
    )
    await replaceVariantAttributes(db, insertedVariants[index].id, normalized[index].attributes)
  }

  const variantOptionPayload = insertedVariants.flatMap((variant, index) =>
    normalized[index].optionValueIds.map((optionValueId) => ({
      variantId: variant.id,
      optionValueId
    }))
  )
  if (variantOptionPayload.length > 0) {
    await db.insert(productVariantOptionValues).values(variantOptionPayload)
  }

  await insertVariantMedia(
    db,
    insertedVariants,
    normalized.map((item) => ({ media: item.media ?? [] }))
  )
  await insertVariantCustomizationMedia(
    db,
    insertedVariants,
    normalized.map((item) => ({ customizationMedia: item.customizationMedia }))
  )

  return null
}
