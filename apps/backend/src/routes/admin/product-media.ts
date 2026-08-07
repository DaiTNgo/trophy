import { inArray } from 'drizzle-orm'
import { getDb } from '../../db/client'
import { productAssets, productVariantCustomizationMedia, productVariantMedia } from '../../db/schema'

export async function loadProductAssetsById(
  db: ReturnType<typeof getDb>,
  assetIds: string[]
) {
  if (assetIds.length === 0) {
    return new Map<string, typeof productAssets.$inferSelect>()
  }

  const assetRows = await db
    .select()
    .from(productAssets)
    .where(inArray(productAssets.id, assetIds))

  return new Map(assetRows.map((asset) => [asset.id, asset]))
}

export function buildVariantMediaInsertRows(
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ media: Array<{ assetId: string }> }>
) {
  return persistedVariants.flatMap((variant, variantIndex) =>
    submittedVariants[variantIndex].media.map((media, mediaIndex) => ({
      variantId: variant.id,
      assetId: media.assetId,
      position: mediaIndex
    }))
  )
}

export function buildVariantCustomizationMediaInsertRows(
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ customizationMedia?: { assetId: string } | null }>
) {
  return persistedVariants.flatMap((variant, variantIndex) => {
    const assetId = submittedVariants[variantIndex]?.customizationMedia?.assetId
    return assetId ? [{ variantId: variant.id, assetId }] : []
  })
}

export async function insertVariantMedia(
  db: ReturnType<typeof getDb>,
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ media: Array<{ assetId: string }> }>
) {
  const rows = buildVariantMediaInsertRows(persistedVariants, submittedVariants)
  if (rows.length > 0) {
    await db.insert(productVariantMedia).values(rows)
  }
}

export async function insertVariantCustomizationMedia(
  db: ReturnType<typeof getDb>,
  persistedVariants: Array<{ id: number }>,
  submittedVariants: Array<{ customizationMedia?: { assetId: string } | null }>
) {
  const rows = buildVariantCustomizationMediaInsertRows(persistedVariants, submittedVariants)
  if (rows.length > 0) {
    await db.insert(productVariantCustomizationMedia).values(rows)
  }
}
