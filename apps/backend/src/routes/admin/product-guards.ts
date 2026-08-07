import { and, eq } from 'drizzle-orm'
import { getDb } from '../../db/client'
import {
  productOptionValues,
  productOptions,
  productVariants,
  products
} from '../../db/schema'
import { loadProductAssetsById } from './product-media'

export async function ensureProductExists(
  db: ReturnType<typeof getDb>,
  productId: number
) {
  return db.select().from(products).where(eq(products.id, productId)).get()
}

export async function ensureOptionBelongsToProduct(
  db: ReturnType<typeof getDb>,
  productId: number,
  optionId: number
) {
  return db
    .select()
    .from(productOptions)
    .where(and(eq(productOptions.id, optionId), eq(productOptions.productId, productId)))
    .get()
}

export async function ensureVariantBelongsToProduct(
  db: ReturnType<typeof getDb>,
  productId: number,
  variantId: number
) {
  return db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .get()
}

export async function ensureOptionValueBelongsToProduct(
  db: ReturnType<typeof getDb>,
  productId: number,
  valueId: number
) {
  return db
    .select({
      id: productOptionValues.id,
      optionId: productOptionValues.optionId,
      value: productOptionValues.value,
      position: productOptionValues.position,
      productId: productOptions.productId,
      optionTitle: productOptions.title
    })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptionValues.optionId, productOptions.id))
    .where(and(eq(productOptionValues.id, valueId), eq(productOptions.productId, productId)))
    .get()
}

export async function updateProductTimestamp(
  db: ReturnType<typeof getDb>,
  productId: number
) {
  await db
    .update(products)
    .set({ updatedAt: new Date().toISOString() })
    .where(eq(products.id, productId))
}

export async function ensureVariantAssetIdsExist(
  db: ReturnType<typeof getDb>,
  assetIds: string[]
) {
  if (assetIds.length === 0) {
    return null
  }

  const assetsById = await loadProductAssetsById(db, assetIds)
  if (assetsById.size !== assetIds.length) {
    return { error: 'One or more variant media assets were not found', status: 404 as const }
  }

  return null
}

export async function validateOptionTitleUniquenessForProduct(
  db: ReturnType<typeof getDb>,
  productId: number,
  title: string,
  excludedOptionId?: number
) {
  const optionRows = await db
    .select({ id: productOptions.id, title: productOptions.title })
    .from(productOptions)
    .where(eq(productOptions.productId, productId))

  const normalizedTitle = title.trim().toLowerCase()
  if (
    optionRows.some(
      (row) => row.id !== excludedOptionId && row.title.trim().toLowerCase() === normalizedTitle
    )
  ) {
    return { error: 'Option titles must be unique', status: 409 as const }
  }

  return null
}

export async function validateOptionValueUniquenessForOption(
  db: ReturnType<typeof getDb>,
  optionId: number,
  value: string,
  excludedValueId?: number
) {
  const optionValueRows = await db
    .select({ id: productOptionValues.id, value: productOptionValues.value })
    .from(productOptionValues)
    .where(eq(productOptionValues.optionId, optionId))

  const normalizedValue = value.trim().toLowerCase()
  if (
    optionValueRows.some(
      (row) => row.id !== excludedValueId && row.value.trim().toLowerCase() === normalizedValue
    )
  ) {
    return {
      error: 'Option values must be unique within the same option',
      status: 409 as const
    }
  }

  return null
}
