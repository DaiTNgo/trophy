import { asc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { getDb } from '../../db/client'
import {
  orderItems,
  productAssets,
  productVariantAttributes,
  productVariantCustomizationMedia,
  productVariantMedia,
  productVariantOptionValues,
  productVariants
} from '../../db/schema'
import type { AppEnv } from '../../lib/env'
import { jsonError, parseParams } from '../../lib/validation'
import { deleteMisaProducts, isMisaConfigured } from '../../lib/misa'
import { updateProductTimestamp } from './product-guards'
import { readProduct } from './product-reader'
import { variantParamsSchema } from './product-schemas'

export const productVariantDeleteRoute = new Hono<AppEnv>()
  .delete('/:id/variants/:variantId', async (c) => {
    const params = parseParams(c, variantParamsSchema)
    if (!params.success) return params.response
    const db = getDb(c.env)
    const product = await readProduct(c, db, params.output.id)
    if (!product) return jsonError(c, 404, 'Product not found')
    const variant = product.variants.find((item) => item.id === params.output.variantId)
    if (!variant) return jsonError(c, 404, 'Variant not found')
    if (product.variants.length === 1) return jsonError(c, 409, 'A product must have at least one variant')

    const ordered = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.variantId, variant.id)).get()
    if (ordered) return jsonError(c, 409, 'Variant cannot be deleted because it is used by an order')
    if (variant.misaSyncStatus === 'synced' && variant.misaProductId) {
      if (!isMisaConfigured(c.env)) return jsonError(c, 503, 'MISA integration is not configured')
      try { await deleteMisaProducts(c.env, [variant.misaProductId]) }
      catch (error) { return jsonError(c, 502, error instanceof Error ? error.message : 'Unable to delete MISA product') }
    }

    await db.delete(productVariantOptionValues).where(eq(productVariantOptionValues.variantId, variant.id))
    await db.delete(productVariantAttributes).where(eq(productVariantAttributes.variantId, variant.id))
    await db.delete(productVariantMedia).where(eq(productVariantMedia.variantId, variant.id))
    const customizationAsset = variant.customizationMedia
      ? await db.select().from(productAssets).where(eq(productAssets.id, variant.customizationMedia.id)).get()
      : null
    await db.delete(productVariantCustomizationMedia).where(eq(productVariantCustomizationMedia.variantId, variant.id))
    await db.delete(productVariants).where(eq(productVariants.id, variant.id))
    if (customizationAsset) {
      await c.env.CUSTOMIZATION_ASSETS.delete(customizationAsset.objectKey)
      await db.delete(productAssets).where(eq(productAssets.id, customizationAsset.id))
    }
    if (variant.isDefault) {
      const remaining = await db.select({ id: productVariants.id }).from(productVariants)
        .where(eq(productVariants.productId, product.id)).orderBy(asc(productVariants.position), asc(productVariants.id))
      if (remaining.length > 0) {
        await db.update(productVariants).set({ isDefault: false, updatedAt: new Date().toISOString() }).where(eq(productVariants.productId, product.id))
        await db.update(productVariants).set({ isDefault: true, position: 0, updatedAt: new Date().toISOString() }).where(eq(productVariants.id, remaining[0].id))
      }
    }
    await updateProductTimestamp(db, product.id)
    return c.json({ item: await readProduct(c, db, product.id) }, 200)
  })
