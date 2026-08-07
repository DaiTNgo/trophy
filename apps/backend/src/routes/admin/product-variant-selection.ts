import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '../../db/client'
import {
  productOptionValues,
  productOptions,
  productVariantOptionValues,
  productVariants
} from '../../db/schema'

export async function validateVariantSelectionForProduct({
  db,
  productId,
  optionValueIds,
  excludedVariantId
}: {
  db: ReturnType<typeof getDb>
  productId: number
  optionValueIds: number[]
  excludedVariantId?: number
}) {
  const optionRows = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(asc(productOptions.position), asc(productOptions.id))
  const expectedOptionCount = optionRows.length

  if (expectedOptionCount === 0) {
    if (optionValueIds.length > 0) {
      return {
        error: 'Variant cannot reference option values when the product has no options',
        status: 409 as const
      }
    }
    return null
  }

  if (optionValueIds.length !== expectedOptionCount) {
    return {
      error: 'Each variant must include exactly one value for every option',
      status: 409 as const
    }
  }

  if (new Set(optionValueIds).size !== optionValueIds.length) {
    return { error: 'Variant option values must be unique', status: 409 as const }
  }

  const optionValueRows = await db
    .select({ id: productOptionValues.id, optionId: productOptionValues.optionId })
    .from(productOptionValues)
    .innerJoin(productOptions, eq(productOptionValues.optionId, productOptions.id))
    .where(
      and(
        eq(productOptions.productId, productId),
        inArray(productOptionValues.id, optionValueIds)
      )
    )

  if (optionValueRows.length !== optionValueIds.length) {
    return { error: 'Variant references an unknown option value', status: 409 as const }
  }

  if (new Set(optionValueRows.map((row) => row.optionId)).size !== expectedOptionCount) {
    return {
      error: 'Variant must contain at most one value from each option',
      status: 409 as const
    }
  }

  const existingVariantIds = (
    await db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
  )
    .map((row) => row.id)
    .filter((variantId) => variantId !== excludedVariantId)

  if (existingVariantIds.length === 0) {
    return null
  }

  const existingSelections = await db
    .select({
      variantId: productVariantOptionValues.variantId,
      optionValueId: productVariantOptionValues.optionValueId
    })
    .from(productVariantOptionValues)
    .where(inArray(productVariantOptionValues.variantId, existingVariantIds))

  const selectionsByVariantId = new Map<number, number[]>()
  for (const selection of existingSelections) {
    const current = selectionsByVariantId.get(selection.variantId) ?? []
    current.push(selection.optionValueId)
    selectionsByVariantId.set(selection.variantId, current)
  }

  const nextKey = [...optionValueIds].sort((a, b) => a - b).join(':')
  for (const variantId of existingVariantIds) {
    const currentKey = (selectionsByVariantId.get(variantId) ?? [])
      .sort((a, b) => a - b)
      .join(':')
    if (currentKey === nextKey) {
      return { error: 'Duplicate variant option combination', status: 409 as const }
    }
  }

  return null
}
