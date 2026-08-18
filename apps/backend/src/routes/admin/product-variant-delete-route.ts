import { and, asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  orderItems,
  productAssets,
  productMedia,
  productVariantAttributes,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants,
  misaDeletionJobs,
  r2CleanupJobs,
  products
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { misaDeletionJobValues } from '../../lib/misa-deletion-outbox'
import { r2CleanupJobValues } from '../../lib/r2-cleanup-outbox'
import { claimProductRevision, hasActiveCustomizationOperation, requireProductRevision } from './product-revision'
import { readProduct } from './product-reader'
import { variantParamsSchema } from './product-schemas'

export const productVariantDeleteRoute = new Hono<AppEnv>()
  .delete('/:id/variants/:variantId', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    if (hasActiveCustomizationOperation(product)) {
      return jsonError(c, 409, 'Customization setup is in progress. Reload and try again shortly.')
    }
    const revisionError = requireProductRevision(c, product.updatedAt)
    if (revisionError) return revisionError
    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')
    if (product.variants.length === 1) return jsonError(c, 409, 'A product must have at least one variant')

    const ordered = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.variantId, variant.id)).get()
    if (ordered) return jsonError(c, 409, 'Variant cannot be deleted because it is used by an order')

    if (!await claimProductRevision(db, product.id, product.updatedAt)) {
      return jsonError(c, 409, 'Product changed while this form was open. Reload and review the latest state.')
    }

    const customizationAsset = variant.customizationMedia
      ? await db.select().from(productAssets).where(eq(productAssets.id, variant.customizationMedia.id)).get()
      : null
    const nextDefault = variant.isDefault
      ? (await db.select({ id: productVariants.id }).from(productVariants)
          .where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.position), asc(productVariants.id)))
          .find((candidate) => candidate.id !== variant.id) ?? null
      : null
    await db.batch([
      db.delete(productVariantOptionValues).where(eq(productVariantOptionValues.variantId, variant.id)),
      db.delete(productVariantAttributes).where(eq(productVariantAttributes.variantId, variant.id)),
      db.delete(productVariantMedia).where(eq(productVariantMedia.variantId, variant.id)),
      db.delete(productVariantCustomizationMedia).where(eq(productVariantCustomizationMedia.variantId, variant.id)),
      ...(customizationAsset ? [
        db.delete(productMedia).where(eq(productMedia.assetId, customizationAsset.id)),
        db.delete(productAssets).where(eq(productAssets.id, customizationAsset.id)),
        db.update(products).set({ thumbnailAssetId: null }).where(
          and(eq(products.id, product.id), eq(products.thumbnailAssetId, customizationAsset.id))
        ),
        db.update(products).set({ hoverAssetId: null }).where(
          and(eq(products.id, product.id), eq(products.hoverAssetId, customizationAsset.id))
        ),
        db.insert(r2CleanupJobs).values(r2CleanupJobValues([customizationAsset.objectKey])),
      ] : []),
      ...(variant.misaSyncStatus === 'synced' && variant.misaProductId
        ? [db.insert(misaDeletionJobs).values(misaDeletionJobValues([variant.misaProductId]))]
        : []),
      ...(nextDefault ? [
        db.update(productVariants).set({ isDefault: false, updatedAt: new Date().toISOString() }).where(eq(productVariants.productId, product.id)),
        db.update(productVariants).set({ isDefault: true, position: 0, updatedAt: new Date().toISOString() }).where(eq(productVariants.id, nextDefault.id)),
      ] : []),
      db.delete(productVariants).where(eq(productVariants.id, variant.id)),
      db.update(products).set({ updatedAt: new Date().toISOString() }).where(eq(products.id, product.id)),
    ] as any)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
